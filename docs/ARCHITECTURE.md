# ApplyPilot — Architecture

## Layering

```
app/ routes (server components)     reads
        │
        ├── app/(app)/*/actions.ts  writes ("use server")
        │        │
        │        └── lib/validation/schemas.ts   ← the validation boundary
        │
        ▼
lib/data/factory.ts        → picks the adapter for this session
        │
        ▼
lib/data/repository.ts     → ApplyPilotRepository (the storage contract)
        │
        ├── lib/data/demo/demo-repository.ts       (in-memory)
        └── lib/data/supabase/supabase-repository.ts (Postgres + RLS)
```

Pure domain calculations sit beside this rather than inside it: `lib/domain/*` takes entities in
and returns derived values out. It has no knowledge of storage, sessions or React, which is why it
is the part with the most direct unit-test coverage.

The AI layer is a parallel seam with the same shape: one interface (`lib/ai/provider.ts`), one
factory (`lib/ai/factory.ts`), two implementations.

## The storage seam

`ApplyPilotRepository` in `lib/data/repository.ts` is the only storage contract in the product. UI
and domain code depend on it and never on Supabase.

Two properties are load-bearing:

1. **Every method takes `userId` as its first argument**, and both implementations scope reads _and_
   writes to it. Asking for another user's record id returns `null` or throws `not-found` rather
   than leaking the row.
2. **Failures are typed, not raw.** `RepositoryError` carries one of `not-found`, `conflict`,
   `unavailable` or `invalid`, so no Postgres error text, table name or constraint name reaches a
   user-facing message.

Why the seam exists at all:

- The zero-credential demo is a first-class mode, not a stub. The demo adapter has to be a real
  implementation of the same contract, or demo behaviour and production behaviour drift.
- A bug where a caller passes the wrong user id fails identically in both adapters, so it shows up
  in local development instead of only in production.
- Switching a deployment from demo storage to Supabase is a configuration change, not a code
  change.

Input types are derived from the entities rather than restated: `Omit<College, Owned>` where
`Owned = 'id' | 'userId' | 'createdAt' | 'updatedAt'`. The repository owns those four fields and
callers never supply them. `NewRequirement` and `NewActivity` additionally make `sortOrder`
optional, because the repository appends to the end.

## Adapter selection

The rule lives in two files and is worth stating exactly.

`lib/config/env.ts`:

```ts
demoMode: forcedDemo || !(supabaseUrl && supabaseAnonKey);
```

where `forcedDemo` is `DEMO_MODE === 'true'` and both Supabase values are trimmed, with empty
strings treated as unset. So:

| `DEMO_MODE` | `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Adapter  |
| ----------- | -------------------------- | ------------------------------- | -------- |
| `true`      | anything                   | anything                        | demo     |
| unset       | set                        | set                             | supabase |
| unset       | set                        | missing                         | demo     |
| unset       | missing                    | set                             | demo     |
| unset       | missing                    | missing                         | demo     |

Note that `env.demoMode` decides how the **session** is resolved (`lib/auth/session.ts` branches on
it), and the session's `mode` is what `getRepositoryForSession` then branches on
(`lib/data/factory.ts`):

```ts
if (session.mode === 'demo') return new DemoRepository(session.workspaceId);
// otherwise: dynamic import of the Supabase adapter + a request-scoped client
```

The Supabase modules are dynamically imported so they are never pulled into a demo-mode build, and
`createServerSupabaseClient()` returns `null` when Supabase is not configured — the factory turns
that into a thrown error rather than silently falling back mid-request.

Three helpers wrap the factory so no page has to remember the checks:

| Helper                | Behaviour                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| `requireWorkspace()`  | Session or redirect to `/login`. Returns `{ session, repository }`.           |
| `requireProfile()`    | As above, plus redirect to `/onboarding` until `profile.onboardingCompleted`. |
| `optionalWorkspace()` | Returns `null` instead of redirecting.                                        |

### Sessions

- **Demo:** an httpOnly, `sameSite=lax` cookie holds `<workspaceId>.<hmac>`. The workspace id is a
  random UUID containing nothing about the person; the HMAC (a per-process random secret) stops one
  visitor typing another's id. Verification is `timingSafeEqual`. All demo sessions share a fixed
  `DEMO_USER_ID`; isolation comes from the workspace id, not the user id.
- **Supabase:** the user id comes from `supabase.auth.getUser()`, which revalidates the token with
  Supabase rather than trusting the cookie contents.

`middleware.ts` exists only to refresh the Supabase session cookie on navigation, because server
components cannot write cookies. It performs no authorisation — every page and action re-checks the
session itself, and treating middleware as the only gate would be a mistake. In demo mode, or when
Supabase is unconfigured, the middleware is a pass-through.

`app/auth/callback/route.ts` handles the magic-link return: it validates the `code` parameter with
Zod, restricts `next` to same-origin relative paths (so it cannot become an open redirect),
exchanges the code for a session, and logs only `[auth] code exchange failed` on failure — never
the code or the address.

## The AI provider seam

`lib/ai/provider.ts` defines `AIProvider` with two methods, `generateStructuredResponse` and
`generateText`, plus `isConfigured()`. Structured requests carry the Zod schema they must satisfy
and an opaque `requestId`. Failures are `AIError` with a machine reason (`not-configured`,
`rate-limited`, `timeout`, `invalid-output`, `refused`, `unavailable`) and a `userMessage` that is
safe to show a student.

Two implementations:

- `lib/ai/providers/anthropic.ts` — forces a tool call named after the schema, converts the Zod
  schema to JSON Schema for the tool definition, then re-validates the tool input against the same
  Zod schema on our side.
- `lib/ai/providers/mock.ts` — the deterministic offline coach. It derives everything from the
  student's own text by rule and cannot invent anything. See
  [AI_SAFETY.md](AI_SAFETY.md).

`lib/ai/factory.ts` caches one provider per process and degrades rather than breaks: if the
configured provider is `anthropic` but the key is missing or the provider reports itself
unconfigured, it returns the offline coach. `describeProvider()` returns `{ name, offline }` — safe
for the client, because it says which coach is running and never how to reach it.

Every AI module imports `server-only`, so a client component importing one fails the build rather
than shipping a key to a browser.

## Request flow: a coaching call

`POST /api/coach` (`app/api/coach/route.ts`), step by step:

1. **Mint a request id.** `newRequestId()` returns `req_<16 random hex>` — random, content-free,
   used only to correlate log lines.
2. **Authenticate.** `getSession()`; no session gives `401` with "Please sign in first."
3. **Parse the body.** A `JSON.parse` failure gives `400`.
4. **Validate.** `coachRequestSchema` bounds `message` to 8000 characters, restricts `mode` to the
   six known values, defaults `includeDraft` to `false`, and normalises `essayId`, `activityId`,
   `collegeId` and `sessionId` to either a UUID or `null`. A failure gives `400` with generic copy.
5. **Rate-limit.** `getRateLimiter().check('coach:' + session.userId)` — 20 requests per user per
   5-minute fixed window. Over the limit gives `429` with a `Retry-After` header and a message
   saying roughly how long to wait.
6. **Select the repository** for this session, so the next step can only reach this user's records.
7. **Assemble context.** `buildCoachContext()` fetches only what the request explicitly asked for,
   always with the caller's own `userId`. If a referenced record does not exist or is not theirs, it
   is reported in `missing` and the route returns `404` rather than silently sending less.
8. **Build the prompt.** `buildPrompt()` composes the shared rules, the mode role, the output
   contract, the student's voice notes if present, and the material wrapped in
   `BEGIN STUDENT MATERIAL` / `END STUDENT MATERIAL` markers.
9. **Call the provider** with a 45-second `AbortController` timeout, the mode's Zod schema and its
   schema name.
10. **Validate the response.** The provider parses the model's tool input against that schema before
    returning. A mismatch becomes `AIError('invalid-output')`.
11. **Respond.** On success: `{ mode, requestId, provider, result }`. On `AIError`: `429` for
    rate-limited, `503` for not-configured, `502` otherwise, carrying only `error.userMessage`. On
    anything else: `500`. Every failure logs one generic line —
    `[coach] failed reason=<reason> request=<requestId>` — with no prompt, draft, profile detail or
    user id. The timeout is cleared in `finally`.

`PUT /api/coach` is the preview. It authenticates, validates and assembles context using the **same**
`buildCoachContext` call, then returns the material blocks without calling any provider. That is why
the "Show what will be sent" panel cannot drift from what actually goes out.

Client-side, `components/coach/use-coach.ts` posts to our own route (never to a model), aborts any
in-flight request when a new one starts, and displays the server's chosen error copy verbatim —
there is nothing to sanitise, because the server never returns provider internals.

## The validation boundary

`lib/validation/schemas.ts` is the single boundary between untrusted input and the repository.
Server actions parse with it before touching storage; forms reuse the same schemas client-side
purely as a convenience, never as the real check.

`lib/validation/common.ts` holds the primitives that make HTML forms behave. HTML forms submit
empty strings rather than `null` and `"on"` rather than `true`, so:

| Helper                                                                     | Handles                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `optionalText`, `optionalId`, `optionalEnum`                               | `""` → `null` before validating.                                             |
| `checkboxBoolean`                                                          | `"on"` / `"true"` / `"1"` / absent → boolean.                                |
| `optionalUrl`                                                              | Accepts only `http:` and `https:`, so `javascript:` never reaches an `href`. |
| `optionalEmail`, `optionalIsoDate`, `optionalMoney`, `optionalPositiveInt` | Normalise then validate, with bounded ranges.                                |
| `tagList`                                                                  | Array or comma-separated string → trimmed, de-duplicated, bounded array.     |
| `timeZoneSchema`                                                           | Rejects anything `Intl.DateTimeFormat` will not accept.                      |

`TEXT_LIMITS` bounds every free-text field (notes 5000, prompt 4000, draft 60000, description 3000)
so nothing unbounded is stored, and `AI_INPUT_LIMITS` separately bounds what a single coaching
request may carry (message 8000, draft 20000, context 6000 characters per block).

Deliberately absent from every schema in the file: any field for Social Security numbers, bank
details, government id numbers, or demographic data.

Server actions return a discriminated `ActionResult` (`lib/utils/result.ts`) rather than throwing at
the UI, so forms can render field-level errors and every message shown is one the product chose.

## Where state lives

- **Reads happen in server components.** Pages are `async` server components that call
  `requireProfile()` (or `requireWorkspace()`), fetch through the repository — usually with a single
  `Promise.all` — and pass plain data down. No page fetches its own data from the browser.
- **Writes happen in server actions.** Each section has an `actions.ts` marked `"use server"`. An
  action re-checks the session, validates, calls the repository, then `revalidatePath`s the affected
  routes. There is no client-side data cache to keep in sync.
- **Client components exist only where interaction requires them.** Forms, dialogs, filter bars,
  the calendar controls, the essay editor's autosave, the theme toggle and the coach workspace are
  `"use client"`; the pages that host them are not.
- **The one deliberate exception** is the coach, which uses `fetch` from a client hook because it
  needs an abortable request, a loading state, and a preview call — but it fetches our own route
  handler, not a model.
- **Browser-only state** is limited to interaction state and the theme preference, which is stored
  in the browser and applied by an inline script before paint.

Server-side process memory holds exactly two things, both keyed and both bounded: the demo
workspace store (`lib/data/demo/store.ts`, ~12h TTL, 500 workspaces max) and the AI rate-limit
windows (`lib/ai/rate-limit.ts`). Both hang off `globalThis` symbols so they survive hot reloads,
and both are the single-instance implementation of an interface that a shared backend could replace.

## Directory map

```
app/
  (marketing)/page.tsx            landing page
  (auth)/login/                   login page, demo + magic-link forms, actions
  (app)/                          the signed-in product
    layout.tsx                    auth check, sidebar, mobile nav, demo banner
    loading.tsx error.tsx not-found.tsx
    onboarding/ dashboard/ colleges/ applications/ essays/ activities/
    recommendations/ scholarships/ calendar/ coach/ settings/
      page.tsx                    server component, reads
      actions.ts                  "use server", writes
      [id]/page.tsx               detail routes where they exist
  api/coach/route.ts              POST run, PUT preview
  api/export/[kind]/route.ts      json | checklist | essays | activities
  auth/callback/route.ts          Supabase magic-link exchange
  layout.tsx globals.css

components/
  ui/                             buttons, inputs, dialogs, badges, counters, toasts
  layout/                         sidebar, mobile nav, page header, logo, theme, affiliation notice
  activities/ applications/ calendar/ coach/ colleges/ dashboard/ essays/
  recommendations/ scholarships/ settings/

lib/
  ai/
    provider.ts                   the AIProvider interface, AIError, timeout
    factory.ts                    provider selection + describeProvider
    prompts.ts                    SHARED_RULES, mode roles, field guides, buildPrompt
    schemas.ts                    six output contracts + schemaForMode
    context.ts                    assembles consented student material
    rate-limit.ts                 RateLimiter interface + in-memory fixed window
    providers/anthropic.ts        forced tool call, re-validated
    providers/mock.ts             deterministic offline coach
  auth/session.ts                 demo cookie signing, Supabase session resolution
  config/env.ts                   env parsing, demoMode + provider rules, publicRuntimeConfig
  data/
    repository.ts                 ApplyPilotRepository, input types, RepositoryError
    factory.ts                    adapter selection, requireWorkspace/requireProfile
    demo/{seed,store,demo-repository}.ts
    supabase/{server-client,supabase-repository,mappers,database.types}.ts
  dates/format.ts                 zone-aware formatting; year and zone never dropped
  domain/
    types.ts                      every entity and enumeration
    progress.ts deadlines.ts calendar.ts counting.ts dashboard.ts ordering.ts labels.ts
  export/serialize.ts             JSON envelope, CSV, Markdown, safe filenames
  utils/                          cn, form helpers, id, result, use-client-value
  validation/{common,schemas}.ts  the validation boundary

supabase/migrations/
  0001_init.sql                   enums, 13 tables, indexes, updated_at triggers
  0002_policies.sql               RLS enabled + forced, owner-only policies, ownership checks

scripts/db-setup.mjs              prints migration steps; connects to nothing
tests/                            vitest unit tests + a server-only stub
middleware.ts                     Supabase cookie refresh only
playwright.config.ts              e2e config (testDir ./e2e, DEMO_MODE=true, AI_PROVIDER=mock)
```
