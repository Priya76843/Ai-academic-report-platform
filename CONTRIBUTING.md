# Contributing

## Branches
- `main` — releasable. Protected by convention: never push directly; merge from `develop` by pull request only.
- `develop` — integration branch. All feature branches start here and merge back here by pull request.
- `feature/<name>/<ticket>-<short-title>` — e.g. `feature/vinay/B-02-auth-sessions`, `feature/priya/F-04-projects-list`.

## Pull requests
- One ticket per PR where possible. Title: `B-02: authentication with cookie sessions`.
- Description: what changed, how it was tested, contract rows touched, screenshots for UI.
- At least one review (Claude reviews every PR; the founder approves architecture-affecting ones).
- CI green: lint, type-check, tests.
- Contract changes are a separate PR to `docs/api/api-contracts-v1.md`, reviewed by both lanes, before the implementation PR.

## Commits
Conventional prefixes: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`. Small and meaningful.

## Definition of Done
CLAUDE.md §39. In short: requirement met, reviewed, tests written and passing, errors handled, logs meaningful, authorization checked, docs updated, contract stable, no known critical security issue.

## Never
- Commit secrets or `.env` files (use `.env.example` with names only).
- Execute uploaded student code.
- Add a dependency, framework, service or database without a note in the PR explaining why the existing stack cannot do it.
