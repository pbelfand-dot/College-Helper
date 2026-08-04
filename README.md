# ApplyPilot

ApplyPilot is an independent college-application planning tool. It gives a student one place to
keep their college list, their applications and requirement checklists, their essays and drafts,
their activities, their recommendation requests, their scholarships and every deadline attached to
all of it — plus a coaching layer that works from what the student has already written and refuses
to write it for them.

It does not rank colleges, does not estimate anyone's chances of admission, and does not produce a
proprietary "readiness score". Every number on screen is a plain count of items the student can
recount by hand.

ApplyPilot cannot submit an application anywhere. It is a planning and drafting workspace; the
actual submission always happens on the college's or platform's own site.

## Features

- **College list.** Name, location, institution type, links, majors, tags, your own fit, academic,
  campus and cost notes, where each fact came from, and a last-verified date.
- **Applications and requirement checklists.** One application per college and round, with a
  requirement list you control. Completion is `completed required items / total required items`;
  items marked "not needed" leave both sides of the fraction.
- **Essay workspace.** Prompt, brainstorm notes, outline and draft in one place. Drafts autosave
  after a debounce, manual saves always create a labelled version, and restoring an older version
  does not destroy the newer ones.
- **Activities.** Category, organisation, role, dates, hours per week, weeks per year, grade
  levels, description, evidence and reflection — with a character counter whose limit you set per
  activity, plus manual reordering.
- **Recommendations.** Who you asked, their subject, when you asked, what is due, follow-up date,
  status, thank-you status, and which applications each recommender is attached to. The letter
  itself is never stored.
- **Scholarships.** Amount, deadline with its own time zone, requirements, source link, linked
  essays, and a last-verified date.
- **Calendar and tasks.** A month grid built from every dated record you own, plus your own tasks.
  Deadlines are grouped as overdue / next 7 / 14 / 30 days / later.
- **Dashboard.** Upcoming deadlines, applications with outstanding required items, and counts of
  what exists.
- **Coaching.** Six modes — Profile, College Research Organizer, Essay Brainstorm, Essay Feedback,
  Activities Description, Deadline Planning. Every response is validated against a strict schema
  before it is rendered, and you can see exactly what will be sent before sending it.
- **Exports.** JSON backup, Markdown application checklist, Markdown essays, CSV activities.
- **Delete everything.** A typed confirmation removes all your records and signs you out.
- **Demo mode.** The whole product works with no credentials at all.

## Screenshots

Screenshots are not committed to this repository. They would go stale as the UI changes, and a
screenshot of a populated workspace is an easy way to leak sample content into places it does not
belong.

To see the product for yourself:

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>, choose **Enter the demo with sample data**, and visit the routes
you want to capture: `/dashboard`, `/colleges`, `/applications`, `/essays`, `/activities`,
`/recommendations`, `/scholarships`, `/calendar`, `/coach`, `/settings`.

## Tech stack

| Piece            | Version (from `package.json`)                             |
| ---------------- | --------------------------------------------------------- |
| Next.js          | 16.2.12 (App Router)                                      |
| React            | 19.2.4 / react-dom 19.2.4                                 |
| TypeScript       | ^5 (strict)                                               |
| Tailwind CSS     | ^4 with `@tailwindcss/postcss`                            |
| Radix UI         | dialog, select, tabs, popover, tooltip and others         |
| lucide-react     | ^1.28.0                                                   |
| Zod              | ^4.4.3                                                    |
| react-hook-form  | ^7.84.0 with `@hookform/resolvers` ^5.7.1                 |
| date-fns         | ^4.4.0 with date-fns-tz ^3.2.0                            |
| Supabase         | `@supabase/supabase-js` ^2.112.0, `@supabase/ssr` ^0.12.4 |
| Anthropic SDK    | `@anthropic-ai/sdk` ^0.115.0                              |
| Vitest           | ^4.1.10 (jsdom)                                           |
| Playwright       | ^1.62.1                                                   |
| Prettier, ESLint | ^3.9.6, ^9 with `eslint-config-next` 16.2.12              |

## Local setup

Requirements: Node 20 or newer (the repo pins `@types/node` at ^20) and npm.

```bash
git clone <your fork or clone url>
cd College-Helper
npm install
npm run dev
```

The dev server listens on <http://localhost:3000>. No `.env.local` is required to start.

Copy `.env.example` to `.env.local` only when you want Supabase persistence or a live model:

```bash
cp .env.example .env.local
```

## Demo mode

**ApplyPilot runs with zero credentials.** If `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are not both set — or if `DEMO_MODE=true` — the app selects the
in-memory demo adapter and the deterministic offline coach.

```bash
npm run dev
```

Open <http://localhost:3000>, go to the login page and click **"Enter the demo with sample data"**.
There is also **"Start with an empty workspace"** if you would rather plan for real.

What demo mode means in practice:

- A seeded, entirely fictional student workspace: colleges, applications, requirements, essays with
  version history, activities, recommenders, scholarships and tasks, with dates generated relative
  to the moment you start so the calendar is always useful.
- Your workspace is private to your browser. It is keyed by an opaque random id in an httpOnly,
  HMAC-signed cookie, so one demo visitor cannot reach another's workspace.
- Storage is server memory only. Nothing is written to a database. Workspaces expire after about
  12 hours and the store keeps at most 500 of them, dropping the least recently used.
- Sign-in by email is disabled; the coach runs offline unless you supply a key.
- `Settings → Danger zone` can reset the workspace back to its seeded state.

## Desktop app

ApplyPilot can also be built as a desktop application — its own window, no browser, no account, and
your records saved on your own computer instead of in a database.

It is the same application: an Electron shell starts the ordinary Next.js server on `127.0.0.1`,
bound to a port the operating system picks, and opens a window onto it. Every feature works the way
it does on the web, because it _is_ the web build.

### What is different in the desktop build

- **Storage is a file.** Everything lives in `applypilot-data.json` in the OS's per-user application
  data directory. `Help → About` and `File → Open the data folder` both tell you where.
  Writes are atomic and flushed when you quit, so closing the window does not lose the sentence you
  just typed.
- **There is no sign-in.** There is no account to sign into: the server is loopback-only and the
  boundary around your file is your computer account. Use a separate OS account or disk encryption
  if you need a stronger one.
- **No demo banner, no sample data.** Your first run starts empty and goes to onboarding, because
  these are your real records.
- **Links open in your real browser.** Clicking a college's website leaves the app window alone and
  hands the address to your normal browser, where your bookmarks and password manager are.
- **No network unless you ask for one.** Without an `ANTHROPIC_API_KEY` in the environment the
  offline coach runs locally and ApplyPilot makes no outbound requests at all.

### Building it

```bash
npm ci
npm run desktop:prepare        # next build, then assemble the standalone server
npx electron-builder --win     # Windows: a folder, a zip and (with NSIS) Setup.exe
npx electron-builder --linux   # or --mac
```

`npm run desktop:dev` runs the shell against an already-prepared build without packaging.

The Windows zip is about 140 MB and the unpacked folder about 390 MB. Nearly all of that is the
Chromium runtime Electron carries — the ApplyPilot half is 26 MB. `desktop:prepare` drops the
`next/image` optimizer from the traced server before packaging, since nothing in the app renders a
`next/image` and its libvips binaries are 33 MB of native code for the wrong platform; the script
checks for `next/image` first and keeps sharp if it ever finds one.

To try the packaged build straight away, `npm run desktop:build` produces
`dist-desktop/linux-unpacked/`, and `npm run test:e2e:desktop` drives that package with Playwright —
including quitting the app, reopening it and checking your college list is still there.

### Installing on Windows

Download `ApplyPilot-Setup-<version>.exe` from the [Releases page][releases] and run it. Windows
SmartScreen will say "Windows protected your PC" — choose **More info → Run anyway**. It installs
per-user, so it asks for no administrator password and lets you pick the folder.

If you would rather not install anything, `ApplyPilot-<version>-win.zip` on the same page is the
identical app as a plain folder: unzip it anywhere and run `ApplyPilot.exe`.

That SmartScreen warning is accurate and worth taking at face value. The installer is not
code-signed, because signing needs a purchased certificate this repository does not carry. The
warning means the publisher is unverified — not that Windows found anything wrong with the file.

[releases]: https://github.com/pbelfand-dot/College-Helper/releases

### Cutting a release

The **Desktop build** workflow (`.github/workflows/desktop.yml`) runs on a Windows runner: lint,
typecheck and tests first, then `electron-builder`, then a GitHub Release with the installer and the
zip attached. Start it either way:

```bash
# The usual way.
git tag -a v0.1.1 -m "ApplyPilot 0.1.1" && git push origin v0.1.1

# Or, if your access allows pushing branches but not tags:
echo 0.1.1 > .github/release-version && git commit -am "Release 0.1.1" && git push
```

Both end up in the same place, because `gh release create` makes the tag itself — a pushed tag was
never actually a requirement. The path filter on `.github/release-version` is what keeps the
workflow off ordinary pushes.

Running it from the Actions tab instead builds the same artifacts and uploads them to the run
without publishing a release, which is what you want when checking that a change still packages.
The workflow refuses to overwrite a release that already exists, so bump the version rather than
re-running a released one.

A Windows runner is not a convenience here. Cross-building from Linux produces a genuine Windows
`.exe` for the `dir` and `zip` targets, but `nsis` shells out to `makensis` through Wine, so on a
machine without Wine the installer step fails with `spawn wine ENOENT` — there is no installer that
way.

## Supabase setup

Supabase provides authentication (email magic link) and Postgres persistence.

1. Create a project at <https://supabase.com/dashboard>.
2. Apply the migrations — see [Database migration](#database-migration) below, or run
   `npm run db:setup` for the printed steps.
3. Put the project URL and anon key in `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

4. Under **Authentication → Providers**, enable Email (magic link).
5. Add `<your app URL>/auth/callback` to the allowed redirect URLs.
6. Restart the dev server. Setting both public values switches the app out of demo mode.

The app queries Supabase with the **anon** key plus the signed-in user's session cookie, so every
statement runs as that user and row-level security applies. The service-role key is not used by any
application code.

## Anthropic setup

Without a key, the coach is the deterministic offline provider described in
[docs/AI_SAFETY.md](docs/AI_SAFETY.md). To use a model instead:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5
```

`AI_PROVIDER` is optional and overrides the default choice: `anthropic` or `mock`. Without it, the
app uses Anthropic when a key is present and the offline coach when it is not. All model calls
happen server-side in `app/api/coach/route.ts`; the key is never exposed to the browser.

## Environment variables

Every variable is optional. The app starts and works fully with none of them set.

| Variable                        | Optional | Default                 | What it does                                                                                                |
| ------------------------------- | -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Yes      | `http://localhost:3000` | Public base URL. Used to build the magic-link redirect back to `/auth/callback`.                            |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | unset                   | Supabase project URL. Must be set **together with** the anon key to leave demo mode.                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | unset                   | Supabase anon key. Used with the user's session cookie so RLS applies.                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | unset                   | Server-side only. Read into config but not used by any application code; normal operation does not need it. |
| `ANTHROPIC_API_KEY`             | Yes      | unset                   | Enables the model-backed coach. Server-side only.                                                           |
| `AI_PROVIDER`                   | Yes      | derived                 | `anthropic` or `mock`. Overrides the default (`anthropic` when a key exists, otherwise `mock`).             |
| `ANTHROPIC_MODEL`               | Yes      | `claude-sonnet-4-5`     | Model used when the provider is `anthropic`.                                                                |
| `DEMO_MODE`                     | Yes      | unset                   | `true` forces the seeded demo workspace even when Supabase is configured.                                   |

Two derived rules worth stating plainly (both live in `lib/config/env.ts`):

- **Storage adapter:** demo when `DEMO_MODE=true` **or** when either Supabase public value is
  missing; Supabase otherwise.
- **AI provider:** `AI_PROVIDER` wins if set to `mock` or `anthropic`; otherwise Anthropic when
  `ANTHROPIC_API_KEY` is present, offline coach when it is not.

## Database migration

```bash
npm run db:setup
```

This prints the steps; it deliberately does not connect to anything, because applying migrations
needs credentials the script has no business holding.

Migrations, applied in order:

| File                                    | Contents                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/0001_init.sql`     | Enums, 13 tables, indexes and `updated_at` triggers.                                                                               |
| `supabase/migrations/0002_policies.sql` | RLS enabled and forced on every table, owner-only policies, ownership checks, and a trigger that creates a profile row on sign-up. |

Apply them with the Supabase CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file into the SQL editor in the Supabase dashboard, in order.

## Testing

| Command                | What it runs                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run test`         | Vitest unit tests once (`tests/**/*.test.ts`)               |
| `npm run test:watch`   | Vitest in watch mode                                        |
| `npm run test:e2e`     | Playwright specs (`playwright.config.ts`, `testDir: ./e2e`) |
| `npm run lint`         | ESLint                                                      |
| `npm run typecheck`    | `tsc --noEmit`                                              |
| `npm run format`       | Prettier, writing changes                                   |
| `npm run format:check` | Prettier in check mode                                      |
| `npm run verify`       | format:check → lint → typecheck → test → build              |

The unit suite covers the pure domain logic (counting, progress, deadlines, calendar, ordering),
validation schemas, export serialisation and the AI layer. The Playwright config boots
`npm run start` on port 3100 with `DEMO_MODE=true` and `AI_PROVIDER=mock`; note that the `e2e/`
directory is not present in the repository at the time of writing, so `npm run test:e2e` currently
has no specs to run.

## Production build

```bash
npm run build
npm run start
```

`npm run verify` is the full gate — formatting, lint, types, tests and a production build — and is
what to run before declaring a change finished.

## Deployment

ApplyPilot is a standard Next.js App Router application with a middleware and three route handlers,
so any host that runs Next.js 16 works. Vercel is the path of least resistance.

Checklist:

1. Set `NEXT_PUBLIC_APP_URL` to the deployed URL.
2. Decide the storage adapter. Leave the Supabase variables unset for a public demo deployment;
   set both to run with real persistence.
3. If you deploy the demo publicly, remember the demo store is per-instance server memory — it does
   not survive a restart, and it is not shared between instances behind a load balancer.
4. If you want the model-backed coach, set `ANTHROPIC_API_KEY` as a server-side secret. Never
   prefix it with `NEXT_PUBLIC_`.
5. Add `<deployed URL>/auth/callback` to Supabase's allowed redirect URLs.
6. The AI rate limiter is in-process (20 requests per user per 5 minutes). On more than one
   instance, replace it with a shared implementation of the `RateLimiter` interface in
   `lib/ai/rate-limit.ts`.

## Privacy model

- **Everything is scoped to one user.** Every repository method takes a `userId` and both adapters
  filter on it. In Supabase, RLS is enabled _and_ forced on all 13 tables with owner-only policies,
  so guessing another student's record id returns nothing.
- **Nothing is sent to a model unless you press a coaching button**, and you can open "Show what
  will be sent" to read the exact material first. The preview is built by the same server function
  that assembles the real request, so it cannot drift.
- **Your essay draft is opt-in per request.** It is attached only when you tick the box, or when
  you are explicitly asking for feedback on a draft.
- **Not collected, anywhere in the product:** Social Security numbers, banking or payment details,
  government id numbers, demographic profiling, or the contents of a recommendation letter. There
  are no fields, no columns and no validation schemas for any of them.
- **Logging is generic.** Server logs record that something happened and whether it failed, keyed
  by a random content-free request id. No essay text, no profile detail, no user id, no prompt.
- **Export and delete are both first-class.** Four export formats and a typed-confirmation delete
  that removes every record and signs you out.

More detail in [docs/DATA_PRIVACY.md](docs/DATA_PRIVACY.md).

## Known MVP limitations

- **Demo storage is in-memory and per-instance.** It disappears on restart and after roughly 12
  hours of inactivity, and it is not shared between server instances.
- **The Supabase adapter has not been run against a live project in this environment.** It is
  written, type-checked, and its migrations and RLS policies are committed, but no credentials were
  available here to exercise it end to end.
- **Coaching history is not persisted.** The repository interface and the `coach_sessions` /
  `coach_messages` tables exist, but no page or route currently writes to them; a coaching response
  lives only in the browser tab until you copy what is useful.
- **Rate limiting is in-process.** Correct for a single instance, not for a horizontally scaled one.
- **No import.** JSON export exists; there is no matching import path yet.
- **No collaboration.** No counsellor, parent or teacher view, and no sharing.
- **No college data source.** Every college fact is something you typed. ApplyPilot does not fetch
  deadlines, requirements or costs from anywhere, by design.
- **No email or notifications.** Deadlines are shown in the app; nothing is sent to you.
- **The Windows package has never been run on Windows.** It is built by `electron-builder` from the
  same shell, server and config as the Linux package, and the Linux package is driven end to end by
  `npm run test:e2e:desktop` — window, server boot, navigation guard, and quit/reopen persistence.
  What is unverified is specifically whether that executable starts on Windows. The GitHub Actions
  workflow exists so a build can be produced and smoke-tested on a real Windows runner.
- **The desktop app does not auto-update and is not code-signed.** Signing needs a certificate;
  updating a copy means downloading a new one.

## Documentation

| Document                                     | Covers                                                         |
| -------------------------------------------- | -------------------------------------------------------------- |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Purpose, routes, data model, product principles.               |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layering, seams, request flows, directory map.                 |
| [docs/AI_SAFETY.md](docs/AI_SAFETY.md)       | Coaching modes, prompt rules, validation, limits.              |
| [docs/DATA_PRIVACY.md](docs/DATA_PRIVACY.md) | What is and is not stored, scoping, logging, export, deletion. |
| [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md) | Build phases, test counts, known limitations.                  |

## Disclaimer

ApplyPilot is an independent tool. It is **not affiliated with, endorsed by, or connected to** the
Common Application, the Coalition Application, or any college, university or admissions office.

ApplyPilot **cannot submit an application** to any platform or institution. Everything in it is a
planning and drafting workspace.

Every deadline, requirement, fee and policy recorded in ApplyPilot is something you entered
yourself. Confirm all of it on the relevant college's official website before you rely on it.
Nothing here predicts or influences an admissions outcome.
