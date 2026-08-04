# QA report

Two review passes over the finished MVP: an application-security and accessibility audit, and an
admissions-domain and coaching-ethics audit. Both were run against the committed code and a
production build. This records what was checked, what was found, what was fixed, and what was
deliberately left alone.

Severity is judged by consequence to a student, not by how interesting the bug is.

---

## Findings

### 1. White text on the dark-mode primary button — **high**, fixed

`components/ui/button.tsx`, `app/globals.css`

The primary button was `bg-accent text-white`. In light mode the accent is a dark teal and white
reads at 5.69:1. In dark mode the accent is a _light_ teal (`180 62% 48%`), where white measured
**2.09:1** — far below the 4.5:1 minimum, and the worst possible place for it, since the primary
button is the main action on nearly every screen. The danger button had the same shape of problem:
white on the dark-mode red measured 2.78:1.

Fixed by adding `--ap-accent-contrast` and `--ap-danger-contrast` tokens, white in light mode and
near-black in dark, and using them wherever text sits on a filled accent or danger surface (the
button, the logo mark, the calendar's today marker, the skip link). Dark mode now measures 8.68:1
and 6.57:1.

### 2. Interactive borders below the non-text contrast minimum — **medium**, fixed

`app/globals.css`

`--ap-border-strong` is the border on every input, select and secondary button. It measured 1.94:1
in light mode and 2.68:1 in dark against their surfaces, below the 3:1 that WCAG 1.4.11 requires for
the boundary of a control. A user with low vision could not reliably see where a field was.

Fixed: light `214 18% 74%` → `58%` (3.20:1), dark `218 18% 40%` → `46%` (3.33:1).

### 3. Muted helper text below AA — **medium**, fixed

`app/globals.css`

`--ap-text-subtle` is used for field hints, empty-state italics and timestamps. It measured 4.22:1
on white and **3.85:1** on the muted surface — under the 4.5:1 body-text minimum in both cases.

Fixed: `215 14% 50%` → `45%`, giving 5.03:1 and 4.59:1.

All 38 foreground/background pairs in both themes now meet AA. The ratios were computed directly
from the token values rather than eyeballed.

### 4. Four buttons all named "Download" — **medium**, fixed

`components/settings/export-menu.tsx`

The export list rendered four buttons whose accessible name was just "Download". Someone tabbing
through with a screen reader heard the same label four times with no way to tell which format they
were about to get. Fixed with `aria-label={\`Download ${entry.title}\`}`.

### 5. Seeded requirements could read as claims about a college — **low**, fixed

`components/applications/requirement-checklist.tsx`

Every seeded college, application and scholarship carries an explicit "sample data — verify on the
official website" note, and the demo banner repeats it. Individual requirement rows did not, and a
row like "Two teacher recommendations" reads like a statement of fact about that college even though
the student owns the list.

The add-requirement dialog already said requirements differ between colleges and change between
years. That wording is now also on the checklist heading, where it is visible without opening a
dialog.

### 6. Missing space in the demo banner — **low**, fixed

`components/layout/demo-banner.tsx`

The banner rendered "Demo workspace.Everything here is sample data…" — the space after the bold
lead-in was dropped. Found by reading the rendered DOM rather than the source, where the space is
plainly present.

Eight places in the codebase use the same "closing inline tag, space, text" pattern; only this one
loses the space, so it is a layout-dependent JSX text-node quirk rather than a general rule. The
first two attempted fixes were both undone by the formatter, which treats `{' '}` followed by text
as equivalent to a plain space. The fix that holds puts the explicit space before an _element_,
which the formatter leaves alone, with a comment recording why the shape is unusual.

Worth noting because this is exactly the class of defect a green test suite does not catch: nothing
was broken, and the wording of the one banner whose whole job is to say "this is not real data" was
slightly harder to read.

---

## Checked and sound

Recorded so it is clear these were examined rather than skipped.

**Cross-user isolation.** Every method on `ApplyPilotRepository` takes `userId` first, and every call
site in every server action passes the resolved `session.userId` — verified by grepping all
repository call sites and inspecting the two multi-line calls the grep flagged. `tests/repository.test.ts`
asserts that a known record id from another user cannot be read, updated, deleted, linked to, or
exported. RLS in `0002_policies.sql` enforces the same rule independently at the database.

**Route gating.** All fourteen pages under `app/(app)/` enter through `requireWorkspace` or
`requireProfile`; the layout gates as well, but no page relies on that alone. Every exported server
action resolves the session itself. `middleware.ts` only refreshes the Supabase cookie and is not
treated as the authorisation gate.

**API routes.** `/api/coach` and `/api/export/[kind]` both authenticate before doing any work.
The export builds from `exportUserData(session.userId)` and takes no parameter that could widen it.
The coach route validates the body, rate-limits per user, then assembles context scoped to the
caller — a crafted request naming another user's essay returns 404.

**Secret exposure.** `.next/static` was grepped for `ANTHROPIC`, `SUPABASE_SERVICE_ROLE` and
`sk-ant-` after a production build: nothing. Every module touching keys imports `server-only`.

**Unsafe rendering.** One `dangerouslySetInnerHTML` in the whole repository, in
`components/layout/theme-script.tsx`, holding a fixed string literal with no interpolation — it must
run before hydration to stop a dark-mode flash. All model output renders as text nodes.

**Link safety.** `optionalUrl` rejects anything that is not `http:` or `https:`, so a `javascript:`
URL cannot reach an `href`. Verified end to end: the e2e suite submits one and asserts the error.

**Export escaping.** CSV cells starting `=`, `+`, `-` or `@` are apostrophe-prefixed against formula
injection; Markdown is escaped; filenames are stripped of path separators, control characters and
leading dots. All tested, including `../../etc/passwd` → `etcpasswd.json`.

**Time zones and DST.** `toIsoInstant` measures the target zone's offset at the target instant, not
at "now". A dedicated test suite round-trips wall-clock times through both US and UK DST transition
days, a half-hour offset (Asia/Kolkata) and a southern-hemisphere zone (Australia/Sydney). An
11:59pm deadline stays on its intended calendar day.

**Deadline display.** No surface uses `toLocaleDateString`; every date goes through
`lib/dates/format.ts`, which always emits the year and, for deadlines, the time zone. Confirmed
across the badge, the dashboard list, the calendar and the exported Markdown.

**Validation.** Every server action `safeParse`s before touching storage. Every free-text field is
bounded. A Zod behaviour that had caused a real bug — a missing key is not the same as an explicit
`undefined`, so unchecked checkboxes and omitted JSON fields were rejected — is fixed and covered by
tests.

**Affiliation and prediction.** Grepping all rendered copy for affiliation claims, chance estimates,
guarantees and prestige framing returns only prohibitions and denials. No output schema has a score,
rating or likelihood field; a test scans every schema's keys for those words.

**Urgency.** No countdown, no exclamation marks on deadlines, no shame. `DeadlineBadge` says "Due in
6 days" and a passed deadline says "Passed 3 days ago" rather than anything alarming. "Not started"
is styled neutral, not red.

**Configurable limits.** Essay limits and activity character limits are student-set fields with
defaults, not assertions. The only `650` in application code is a form default; nothing claims it is
any organisation's current limit.

**Destructive actions.** Deleting a college, application, requirement, essay, activity, recommender,
scholarship or task goes through a confirmation dialog naming the record and stating the
consequences. Deleting all data additionally requires typing `DELETE`. Deleting a college does not
delete essays — they survive, unlinked, and the dialog says so.

**Not-found wording.** Identical for a deleted record and another user's record, so the page cannot
be used to probe for the existence of someone else's data.

**Placeholders.** No `TODO`, `FIXME`, `any`, `@ts-ignore`, empty catch or stray `console.log` in
`app/`, `components/` or `lib/`.

---

## Not fixed, deliberately

**The demo cookie's signing secret is per-process.** It is regenerated on restart, so demo cookies do
not survive a deploy. This is correct for the threat it addresses — one demo visitor guessing
another's workspace id — and invalidating disposable workspaces on restart is the desired behaviour,
not a defect. A persistent secret would be needed only if demo data were meant to be durable, and it
is not.

**Rate limiting is per-instance.** Documented in `docs/BUILD_STATUS.md`. The `RateLimiter` interface
exists precisely so a shared backend can replace it; building one now would be speculative.

---

## Not verifiable in this environment

- The **Supabase adapter** has never run against a live project — no credentials were available. The
  code is written and type-checked and the migrations and RLS policies are committed, but the
  Postgres path is unexercised. The verification step is written down in `scripts/db-setup.mjs` and
  `docs/BUILD_STATUS.md`.
- The **Anthropic provider** has never made a real API call. Prompt construction, schema validation
  and error mapping are unit-tested; the network path is not. Every coaching flow demonstrated
  working used the offline coach.

Both are stated as limitations rather than presented as verified.
