# ApplyPilot Project Instructions

ApplyPilot is an independent college-application planning and coaching tool.

## Core commands

| Purpose            | Command                                             |
| ------------------ | --------------------------------------------------- |
| Development server | `npm run dev`                                       |
| Lint               | `npm run lint`                                      |
| Type check         | `npm run typecheck`                                 |
| Unit tests         | `npm run test`                                      |
| End-to-end tests   | `npm run test:e2e`                                  |
| Production build   | `npm run build`                                     |
| Format             | `npm run format`                                    |
| Format check       | `npm run format:check`                              |
| Database setup     | `npm run db:setup` (prints the migration steps)     |
| Demo-data seed     | Automatic on first request. Reset from `/settings`. |

Update this section whenever commands change.

## Engineering rules

- Use strict TypeScript.
- Do not use `any` unless unavoidable and documented.
- Validate incoming server data.
- Keep secrets server-side.
- Scope every private query and mutation to the active user.
- Prefer server components for noninteractive data loading.
- Use client components only where interaction requires them.
- Keep database logic behind repositories or services.
- Keep AI-provider logic behind a server-side interface.
- Ensure the app runs in demo mode without external credentials.
- Do not add dependencies that duplicate existing capabilities.
- Avoid huge multipurpose components.
- Add tests for important domain logic.
- Run checks before declaring a feature complete.
- Never commit real secrets or personal application data.

## Product rules

- Do not claim ApplyPilot is affiliated with Common App.
- Do not attempt to submit applications to third-party platforms.
- Do not promise admissions outcomes.
- Do not invent student information.
- AI should coach and revise, not impersonate the student.
- Preserve the student's voice.
- Make external character limits configurable.
- Display deadline years and relevant time zones.
- Use transparent completion checklists instead of unexplained scores.
- Avoid prestige-shaming and anxiety-driven copy.
- Do not collect Social Security numbers or banking credentials.
- Provide export and deletion paths for user data.

## Completion definition

A feature is complete only when:

- The core interaction works
- Data persists through the selected storage adapter
- Validation and errors are handled
- Mobile and desktop states are usable
- The feature has an empty state
- Important logic has tests
- Lint and type checks pass
- Related documentation is updated

## Layout conventions

- `app/(marketing)` public landing, `app/(auth)` login, `app/(app)` the signed-in product.
- Mutations live in `app/(app)/<section>/actions.ts` as server actions.
- Domain calculations are pure functions in `lib/domain/` with unit tests in `tests/`.
- All persistence goes through `ApplyPilotRepository` (`lib/data/repository.ts`).
- All model calls go through `AIProvider` (`lib/ai/provider.ts`). Never call a model from the browser.
