# Data privacy

ApplyPilot holds a student's application planning notes and their unfinished writing. That is
personal material, and some of it is the kind a person would not want read by anyone. This
document describes what the application stores, what it deliberately refuses to store, and the
mechanisms that keep one student's records away from another's.

## What is stored

Only what the student types in:

| Area           | Stored                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile        | Display name, graduation year, current year of study, region, intended majors, interests, application season, time zone, self-described writing voice    |
| Colleges       | Name, location, institution type, links, majors, tags, list status, the student's own fit/academic/campus/cost/source notes, last-verified date          |
| Applications   | College, round, deadline and its time zone, status, submission and decision dates, fee amount, fee-waiver status, testing plan, transcript status, notes |
| Requirements   | Type, title, description, required flag, status, due date, source URL, order                                                                             |
| Essays         | Title, prompt, limit type and value, brainstorm notes, outline, current draft, status, due date                                                          |
| Essay versions | Full text of each saved version, its source (autosave, manual, ai-assisted, restored), an optional note                                                  |
| Activities     | Category, organisation, role, dates, hours, weeks, year levels, description, character limit, evidence, private reflection notes, order                  |
| Recommenders   | Name, role, subject, optional email, request/due/follow-up dates, status, thank-you status, notes                                                        |
| Scholarships   | Title, organisation, source URL, amount, deadline and its time zone, status, requirements, linked essays, last-verified date, notes                      |
| Tasks          | Title, description, category, due date and time zone, completion time, priority, optional links                                                          |
| Coach history  | The student's message and the coach's visible reply, plus structured metadata                                                                            |

## What is deliberately not stored

These are absent from the domain model, the validation schemas and the database schema. There is
no field to put them in.

- **Social Security numbers, national insurance numbers, or any government identifier.**
- **Bank details, card numbers, or any payment credential.** ApplyPilot records that an application
  has a fee; it never handles money.
- **Passwords for any other service.** ApplyPilot does not sign in to admissions systems, and could
  not, because it holds no credentials for them.
- **The text of a recommendation letter.** A letter is confidential between the recommender and the
  college. ApplyPilot tracks that a request was made, when it is due, and whether it was submitted.
  `lib/validation/schemas.ts` says so at the field where a naive design would put the letter.
- **Demographic profiling.** No race, ethnicity, religion, sexuality, disability, immigration status
  or family financial data. Onboarding asks for a name, a year, a region and some interests.
- **Test score records.** The student records a _plan_ ("submitting SAT", "not submitting"), not a
  score, because ApplyPilot has no business being a score repository.
- **Hidden model reasoning.** `CoachMessage` stores the visible message only. No chain-of-thought,
  no raw provider payloads. The comment on the type in `lib/domain/types.ts` states this.

## User scoping

Every record belongs to exactly one user, and there is no sharing feature to complicate that.

**Layer 1 — the repository interface.** Every method on `ApplyPilotRepository`
(`lib/data/repository.ts`) takes `userId` as its first argument, and every implementation filters on
it for reads _and_ writes. Passing another user's record id returns `null` from a getter and throws
`RepositoryError('not-found')` from a mutation. `tests/repository.test.ts` asserts this directly,
including that a known-id update, delete or cross-user link attempt all fail.

**Layer 2 — row-level security.** `supabase/migrations/0002_policies.sql` enables and _forces_ RLS on
all thirteen tables and creates owner-only select/insert/update/delete policies comparing `user_id`
to `auth.uid()`. `with check` is set on insert and update as well as `using` on select and delete,
so a user cannot create a row owned by someone else or re-assign one. Additional check constraints
(`owns_application`, `owns_essay`, `owns_college`, `owns_recommender`) stop a crafted insert
attaching a child row to another user's parent.

The server-side Supabase client uses the **anon** key plus the user's session, so queries run as
that user and RLS applies. The service-role key would bypass RLS; the application never uses it,
and `.env.example` says it is not required for normal operation.

**Not a layer: middleware.** `middleware.ts` refreshes the session cookie. It does not authorise
anything, and its own comment says so. Every page and every server action resolves the session
itself through `requireWorkspace` / `requireProfile`.

## Demo mode

With no Supabase credentials configured, ApplyPilot runs a seeded demo workspace.

- The data lives in a server-side `Map`, never in a database. Demo activity cannot touch production
  rows because there is no production connection.
- Each visitor gets their own workspace, keyed by an opaque random identifier held in an httpOnly,
  `SameSite=Lax` cookie signed with an HMAC. Two people using the same deployment do not see each
  other's edits.
- Workspaces expire after **12 hours** and the store holds at most **500** of them, evicting the
  least recently used (`lib/data/demo/store.ts`). Nothing is persisted to disk.
- The demo banner is always visible, and it states that the data is sample data and that the
  deadlines and requirements on the example colleges are placeholders.
- The signing secret is generated per process. That is appropriate for the threat it addresses — one
  visitor guessing another visitor's workspace id — and means a server restart invalidates all demo
  cookies, which is the correct outcome for disposable data.

## What reaches an AI model

Nothing, unless the student presses a coaching button on a specific request.

- Model calls happen only in `app/api/coach/route.ts`, on the server. The API key is read from the
  server environment by a module that imports `server-only`, so a client component importing it
  fails the build rather than shipping a key to a browser.
- The material attached to a request is assembled by `buildCoachContext`, scoped to the caller's own
  `userId`. A crafted request naming another user's essay gets a 404.
- The **essay draft is opt-in per request**. Brainstorming does not include it unless the student
  ticks the box; feedback includes it because feedback without a draft is meaningless, and the UI
  says so.
- The "Show what will be sent" preview is generated by the _same server function_ that builds the
  real request, so the preview cannot drift from what actually goes out.
- With no API key configured, the offline coach runs and nothing leaves the server at all.

See `docs/AI_SAFETY.md` for the behavioural rules.

## Logging

Server logs record that a request happened and whether it failed. They never contain:

- essay text, brainstorm notes, outlines or any draft;
- profile details or any student-identifying value;
- the contents of a coaching request or response;
- API keys or session tokens.

AI and repository failures log a failure reason and an opaque request id generated by `newRequestId`
(`lib/utils/id.ts`), which is random and derived from nothing about the student. The Supabase adapter
logs an operation name and error code, never row contents. The magic-link path logs that an exchange
failed, never the address it was for.

## Error messages

A student sees copy that was written deliberately. Repository and provider errors are mapped to
fixed messages in `lib/utils/form.ts` and `lib/ai/provider.ts`; internal details, table names and
constraint names never reach the browser. The route-level error boundary shows a generic message
plus a `digest` — a server-generated identifier with no request content in it.

The not-found page uses **identical wording** for a record that was deleted and a record belonging to
someone else. This is intentional: differentiating them would let someone probe for the existence of
another user's records.

## Getting your data out, and getting rid of it

**Export**, from Settings, in four formats:

| Format   | Contents                                                           |
| -------- | ------------------------------------------------------------------ |
| JSON     | Complete backup, versioned envelope, everything                    |
| Markdown | Readable application checklist with progress and requirement lists |
| Markdown | Every essay with prompt, draft, outline and notes                  |
| CSV      | Activities in order, with hours and character counts               |

Each is built from `repository.exportUserData(session.userId)`, so an export can only contain the
requesting user's records. CSV cells beginning `=`, `+`, `-` or `@` are prefixed with an apostrophe
so a spreadsheet treats them as text; filenames are constructed server-side and stripped of path
separators, control characters and leading dots. Responses are `Cache-Control: no-store, private`.

**Deletion**, also from Settings, requires typing `DELETE`. It removes every college, application,
requirement, essay, essay version, activity, recommender, scholarship, task and coach message, then
signs the account out so no cached page keeps rendering removed records. There is no soft delete and
no recovery — the dialog says so, and suggests exporting first.

Demo users additionally get **Reset demo**, which discards their changes and restores the seeded
sample workspace.

## If you self-host this

The privacy properties above depend on things a deployer controls:

- **Apply both migrations.** `0002_policies.sql` is what enforces row-level security. Without it the
  repository's own scoping is the only protection, which is one layer short of the design.
- **Do not set `SUPABASE_SERVICE_ROLE_KEY`** unless you add something that genuinely needs it. It
  bypasses RLS.
- **Serve over HTTPS.** Session cookies are marked `secure` in production; over plain HTTP they will
  not be sent.
- **Check your hosting provider's logging.** ApplyPilot does not log student content, but a platform
  that logs full request bodies would capture coaching requests and form submissions regardless.
- **You become the data controller.** Students' essays are on your infrastructure, and whatever
  obligations apply in your jurisdiction are yours.
