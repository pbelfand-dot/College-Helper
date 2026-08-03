# ApplyPilot — Product specification

## Purpose

Applying to college is mostly an organisation problem wearing an emotional one's clothes. A student
has to track a shifting list of colleges, several applications with different rounds and deadlines,
a different requirement list per college, a handful of essays at different stages, an activities
list that has to fit a character limit, recommenders who work on their own timeline, scholarships
that close without notice, and a calendar that quietly overloads two weeks in November.

ApplyPilot holds all of that in one workspace and keeps the arithmetic transparent. It also
provides coaching that helps the student think and revise, without taking over the writing.

What it deliberately does not do: predict admissions outcomes, rank colleges, score the student's
profile, fetch or assert current admissions requirements, or submit anything anywhere.

## Who it is for

A student applying to university — most often a US high-school senior, though the data model does
not assume it. `currentGrade` covers grades 9 to 12 plus gap year, transfer and other, and the
region field is free text.

The product assumes a student who:

- is doing this largely on their own, possibly without a dedicated counsellor;
- has genuinely limited time, and may have a job or caring responsibilities that belong on the
  activities list just as much as a club does;
- wants help thinking and revising, not a ghostwriter;
- needs to be told plainly when something must be verified on an official source.

## Routes

Nineteen routes: sixteen pages and three route handlers.

### Public

| Route    | Group             | What it does                                                                                                                                                       |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`      | `app/(marketing)` | Landing page. Feature summary, the privacy stance, and the affiliation notice. Links into the login page.                                                          |
| `/login` | `app/(auth)`      | In demo mode: two buttons, seeded workspace or empty workspace. In Supabase mode: an email magic-link form. Redirects to `/dashboard` if a session already exists. |

### Signed in (`app/(app)`)

Every route in this group renders inside a layout that calls `requireWorkspace()`, so authentication
is checked once rather than per page. Most pages then call `requireProfile()`, which additionally
redirects to `/onboarding` until onboarding is complete.

| Route                           | What it does                                                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/onboarding`                   | Six-question profile setup; only the display name is required. Redirects to `/dashboard` once complete.                                                                       |
| `/dashboard`                    | Greeting, deadline buckets (overdue / next 7 / 14 / 30), applications with outstanding required items, and counts. Shows a distinct empty state for a brand-new workspace.    |
| `/colleges`                     | The college list, filterable, with list-status badges. Create, edit, delete, set list status, mark verified.                                                                  |
| `/colleges/[collegeId]`         | One college: notes, links, majors, tags, its applications with checklist completion, and related essays. 404s when the id is not yours.                                       |
| `/applications`                 | One row per application with round, deadline, status and checklist completion, sorted by deadline.                                                                            |
| `/applications/[applicationId]` | One application: round, deadline with time zone, fee and waiver status, testing plan, transcript status, decision, the requirement checklist, linked essays and recommenders. |
| `/essays`                       | All essays with status, counts, linked college or application and due date.                                                                                                   |
| `/essays/[essayId]`             | The essay workspace: prompt, brainstorm notes, outline, autosaving draft with live counter, and full version history with restore.                                            |
| `/activities`                   | The activities list in your order, each with a configurable character limit and counter. Create, edit, delete, reorder.                                                       |
| `/recommendations`              | Recommender requests with status, due dates, follow-ups, thank-you status, and links to applications.                                                                         |
| `/scholarships`                 | Scholarships with amount, deadline and time zone, requirements, linked essays and last-verified date.                                                                         |
| `/calendar`                     | Month grid of every dated record, in your time zone, plus task creation and completion.                                                                                       |
| `/coach`                        | All six coaching modes in one workspace, with attachment pickers, the send preview, and per-mode rendered output.                                                             |
| `/settings`                     | Profile editing, appearance, what the coach can and cannot do, exports, the privacy summary, sign out, and the danger zone (reset demo data, delete everything).              |

Three shared route files back this group: `loading.tsx`, `error.tsx` (generic message plus a
content-free digest) and `not-found.tsx` (deliberately identical wording whether a record was
deleted or belongs to somebody else, so the page cannot be used to probe for other users' records).

### Route handlers

| Route                | Methods   | What it does                                                                                                                          |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/coach`         | POST, PUT | POST runs a coaching request end to end. PUT returns the exact material a request _would_ send, without sending anything.             |
| `/api/export/[kind]` | GET       | `json`, `checklist`, `essays` or `activities`. Builds the file from the signed-in student's own bundle with a server-chosen filename. |
| `/auth/callback`     | GET       | Supabase magic-link landing point. Exchanges the code for a session; `next` is restricted to same-origin relative paths.              |

Mutations are not route handlers. They are server actions in
`app/(app)/<section>/actions.ts` — colleges, applications, essays, activities, recommendations,
scholarships, calendar, onboarding and settings each have their own file.

## Data model

All entity definitions live in `lib/domain/types.ts`. Dates are ISO-8601 strings so the demo
adapter, Postgres and the JSON export all round-trip the same value.

Enumerations used below are defined as `as const` arrays in the same file, which is what both the
Zod schemas and the Postgres enum types are derived from.

### UserProfile

| Field                   | Type                   | Notes                                                                                               |
| ----------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `id`, `userId`          | `string`               | Owner scoping.                                                                                      |
| `displayName`           | `string`               | Required; the only required onboarding field.                                                       |
| `graduationYear`        | `number \| null`       | Validated 2000–2100.                                                                                |
| `currentGrade`          | `CurrentGrade \| null` | `9`…`12`, `gap-year`, `transfer`, `other`.                                                          |
| `region`                | `string \| null`       | Free text.                                                                                          |
| `intendedMajors`        | `string[]`             | Up to 20 entries.                                                                                   |
| `interests`             | `string[]`             | Up to 30 entries.                                                                                   |
| `applicationSeason`     | `string \| null`       | Free text, e.g. "Fall 2026".                                                                        |
| `timeZone`              | `string`               | IANA zone; validated against `Intl`.                                                                |
| `writingVoiceNotes`     | `string \| null`       | The student's own description of how they write; passed to the coach so it can respect their voice. |
| `onboardingCompleted`   | `boolean`              | Gate for `requireProfile()`.                                                                        |
| `createdAt`/`updatedAt` | `IsoDateTime`          |                                                                                                     |

### College

`id`, `userId`, `name`, `city`, `stateOrRegion`, `country`, `institutionType`
(`public`, `private-nonprofit`, `private-forprofit`, `community`, `other`), `websiteUrl`,
`admissionsUrl`, `financialAidUrl`, `majors[]`, `tags[]`, `listStatus`
(`exploring`, `considering`, `applying`, `submitted`, `decision-received`), `fitNotes`,
`academicNotes`, `campusNotes`, `costNotes`, `sourceNotes`, `lastVerifiedAt`, `createdAt`,
`updatedAt`.

`sourceNotes` and `lastVerifiedAt` exist because a college fact is only as good as where it came
from and when it was checked.

### Application

`id`, `userId`, `collegeId`, `applicationRound` (`early-decision`, `early-decision-2`,
`early-action`, `restrictive-early-action`, `regular-decision`, `rolling`, `priority`, `transfer`,
`other`), `deadlineAt`, `deadlineTimeZone`, `status` (`planning`, `in-progress`, `ready-to-submit`,
`submitted`, `decision-received`, `withdrawn`), `submittedAt`, `decisionResult` (`pending`,
`accepted`, `waitlisted`, `deferred`, `denied`, `withdrawn`), `decisionAt`, `feeAmount`,
`feeWaiverStatus` (`not-applicable`, `considering`, `requested`, `approved`), `testingPlan`
(`not-decided`, `not-submitting`, `submitting-sat`, `submitting-act`, `submitting-both`,
`test-required`), `transcriptStatus` (`not-started`, `requested`, `sent`, `confirmed`), `notes`,
`createdAt`, `updatedAt`.

Each application carries its own `deadlineTimeZone` rather than inheriting the student's, because a
deadline belongs to the institution that set it.

### Requirement

`id`, `userId`, `applicationId`, `type` (`application-form`, `essay`, `recommendation`,
`transcript`, `test-scores`, `portfolio`, `interview`, `fee`, `financial-aid`, `other`), `title`,
`description`, `required` (boolean), `status` (`not-started`, `in-progress`, `complete`,
`not-needed`), `dueAt`, `sourceUrl`, `sortOrder`, `createdAt`, `updatedAt`.

`required` and the `not-needed` status are what make checklist completion honest — see
[Product principles](#product-principles).

### Essay

`id`, `userId`, `applicationId`, `collegeId`, `title`, `prompt`, `limitType` (`words`,
`characters`, `none`), `limitValue`, `brainstormNotes`, `outline`, `currentDraft`, `status`
(`not-started`, `brainstorming`, `outlining`, `drafting`, `revising`, `final`), `dueAt`,
`createdAt`, `updatedAt`.

`limitType` and `limitValue` are per essay. ApplyPilot never hardcodes another organisation's
current limit.

### EssayVersion

`id`, `userId`, `essayId`, `content`, `source` (`autosave`, `manual`, `ai-assisted`, `restored`),
`note`, `createdAt`.

Versioning policy (in `app/(app)/essays/actions.ts`): a manual save always creates a version;
autosave creates one only when the text changed and the last autosave was not recent, so history
stays readable. Restoring writes a new version rather than deleting newer ones.

### Activity

`id`, `userId`, `category` (23 values, from `academic` through `work` and `other`, including
`family-responsibilities`), `organization`, `role`, `startDate`, `endDate`, `continues`,
`hoursPerWeek`, `weeksPerYear`, `gradeLevels[]`, `description`, `descriptionLimit`,
`impactEvidence`, `reflectionNotes`, `sortOrder`, `createdAt`, `updatedAt`.

`descriptionLimit` is validated between 20 and 5000 and defaults to 150. `impactEvidence` exists so
a student can record what backs a claim before they make it.

### Recommender

`id`, `userId`, `name`, `role`, `organizationOrSubject`, `email`, `dateRequested`, `dueAt`,
`status` (`not-asked`, `asked`, `agreed`, `materials-sent`, `submitted`, `declined`), `followUpAt`,
`thankYouStatus` (`not-sent`, `planned`, `sent`), `notes`, `createdAt`, `updatedAt`.

`notes` is for the student's own reminders. The letter is never stored; that is between the
recommender and the college.

### ApplicationRecommender

`applicationId`, `recommenderId`, `userId`, `status`. A join row so one recommender can be attached
to several applications with a per-application status.

### Scholarship

`id`, `userId`, `title`, `organization`, `sourceUrl`, `amount`, `deadlineAt`, `deadlineTimeZone`,
`status` (`researching`, `planning-to-apply`, `in-progress`, `submitted`, `awarded`,
`not-selected`, `skipped`), `requirements`, `essayIds[]`, `lastVerifiedAt`, `notes`, `createdAt`,
`updatedAt`.

### Task

`id`, `userId`, `applicationId`, `essayId`, `scholarshipId`, `recommenderId`, `title`,
`description`, `category` (`application`, `essay`, `recommendation`, `testing`, `financial-aid`,
`scholarship`, `visit`, `personal`, `other`), `dueAt`, `timeZone`, `completedAt`, `priority`
(`low`, `medium`, `high`), `createdAt`, `updatedAt`.

All four foreign keys are nullable, so a task can stand alone or hang off any one record.

### CoachSession and CoachMessage

`CoachSession`: `id`, `userId`, `mode`, `title`, `createdAt`, `updatedAt`.

`CoachMessage`: `id`, `userId`, `sessionId`, `role` (`student` or `coach`), `content`, `metadata`,
`createdAt`. Only user-visible content is modelled — there is no field for model reasoning, hidden
chain-of-thought or raw provider payloads.

These entities, their repository methods and their Postgres tables all exist. No page or route
currently writes to them, so coaching history is not persisted today; a response lives in the
browser tab until the student copies what is useful.

### UserDataBundle

Everything one user owns, in one object: `profile`, `colleges`, `applications`, `requirements`,
`essays`, `essayVersions`, `activities`, `recommenders`, `applicationRecommenders`, `scholarships`,
`tasks`, `coachSessions`, `coachMessages`. It backs both the demo store and the export and delete
flows.

## Derived values

Nothing in the product stores a computed score. The three calculations that matter are pure
functions with unit tests:

| Calculation           | Where                     | Definition                                                                                                                                         |
| --------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checklist completion  | `lib/domain/progress.ts`  | `completed / total` over requirements where `required === true` and `status !== 'not-needed'`. `percent` is `null` when there is nothing to count. |
| Deadline bucketing    | `lib/domain/deadlines.ts` | Overdue / next 7 / 14 / 30 / later. Buckets are exclusive; day counts are calendar days **in the deadline's own time zone**.                       |
| Word/character counts | `lib/domain/counting.ts`  | Words are whitespace-separated tokens; characters are counted by code point so emoji and accents are not double-counted.                           |

## Product principles

These are not aspirations; each one is enforced somewhere in the code, and most of them are
repeated verbatim in the coach's system prompt.

**1. Transparent checklist completion, never a score.**
The only progress number in the product is completed required items over total required items. A
student can recount it from the rows on screen. There is no weighting, no composite index and no
hidden formula. `lib/domain/progress.ts` says so in its own header, and the AI output schemas
contain no score, rating, percentage or likelihood field anywhere — there is nowhere for a model to
put one.

**2. No admissions prediction.**
ApplyPilot does not estimate, imply or comment on anyone's chances anywhere. Rule 2 of the coach's
shared prompt forbids scoring, rating, grading or ranking the student or their work, and forbids
describing anything as "Ivy-level", "admission-worthy", "a winner", "guaranteed" or "perfect".

**3. No prestige ranking.**
The college list is a list, not a league table. There is no tier, no selectivity field and no sort
by reputation. Colleges are ordered by the student's own status and notes. The copy avoids
prestige-shaming and anxiety-driven framing.

**4. The student keeps their voice.**
The coach coaches; it does not ghostwrite. It prefers questions and observations, only rewrites a
sentence the student already wrote, and always explains why. The profile carries
`writingVoiceNotes`, which is passed into the system prompt so the model is told to respect the
student's own description of how they write. Nothing a coach returns is ever applied to the
student's work automatically — output is rendered with copy buttons, and the student decides.

**5. Character and word limits are configurable.**
Essays carry `limitType` and `limitValue`; activities carry `descriptionLimit` (20–5000, default
150). ApplyPilot never hardcodes another organisation's current limit, because those change and
being confidently out of date is worse than asking.

**6. Deadlines always show their year and time zone.**
`formatDeadline` renders "Nov 1, 2025 at 11:59 PM EST" and never drops either part; the all-day
variant still qualifies the zone. Applications and scholarships store their own
`deadlineTimeZone`, tasks store a `timeZone`, and calendar day-bucketing is done in the viewer's
zone so a deadline at 11:59pm Eastern appears on the Eastern date.

**7. No sensitive data collection.**
There is no field, column, or validation schema for a Social Security number, bank or payment
details, a government id number, test-score records, demographic profiling, or the contents of a
recommendation letter. The login page and the settings page both tell the student not to enter such
things, because ApplyPilot never asks for them. The coach's prompt additionally forbids inferring
or commenting on race, ethnicity, religion, sexuality, disability, immigration status, health or
family finances even when a student mentions them.

**8. Independence, stated plainly.**
An affiliation notice appears on the landing page, the login page and the settings page, and is
embedded in the Markdown exports. ApplyPilot is not affiliated with the Common Application, the
Coalition Application or any college, and it cannot submit an application anywhere.
