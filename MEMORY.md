# MEMORY.md — repository memory

Read with CLAUDE.md at the start of every session. Replace outdated facts; do not append history (git has it).

# Current Product State
AI Project Documentation Platform (working name; folder/repo `acamedia-builder`). MVP = project reports and seminar reports for Indian engineering students. Positioning: evidence-grounded documentation that understands the student's real project, never "AI report generator". Commercial goal: 10 pilot users → 100 paying → ₹10 lakh.

Status 2026-11-06: foundation, auth, projects, organisations, jobs framework and the frontend screens through Setup (F-05) are merged on `develop`. Nothing is deployed. Slice 1 cycle ends 2026-11-14; the team is ~2 weeks behind the original dates (re-baseline to 11-28 recommended, founder decision pending). Next: assets (B-05), sources (B-06 / F-06).

# Go-to-market (decided 2026-10-27)
Two zero-engineering tests run in parallel until 2026-11-30: (1) student ₹499 pre-orders for the April season, pass ≥25; (2) project-centre pilots at ₹15,000 advance, pass ≥3 of 20 calls. Whichever produces advance payment decides the channel. Product unchanged either way. Engineering consequence: organisations in the data model (B-03a, merged 2026-11-06 as PR #17). Full reasoning: `docs/planning/2026-10-27-go-to-market-tests.md`.

# Team
- Founder / approver: Vivek (viveksj2920). Decides scope, architecture approvals, provider choices, merges.
- Vinay (`vinu-11`): all backend.
- Priya (`Priya76843`): frontend.
- Claude: CTO/architect, contract owner, reviewer, QA, repository memory.
- Rajeshwari left 2026-10-06. Slice-2+ knowledge intelligence (format parsing, code analysis, screenshots) has no named owner yet.

# Architecture Decisions (approved)
- Modular monolith: FastAPI + Pydantic + SQLAlchemy 2 (sync) + Alembic; PostgreSQL + pgvector; Redis + Celery (queues ingestion / generation / export); S3-compatible object storage with direct presigned uploads; centralised LLM gateway; versioned prompt files; no agent framework; uploaded code never executed.
- Local object storage: **LocalStack (S3 service)** in docker-compose (decided 2026-10-12; replaced MinIO), pinned to image `4.13.1` because `2026.x` images require `LOCALSTACK_AUTH_TOKEN`. Production: AWS S3 or any S3-compatible service.
- Frontend: React + Vite + TypeScript + React Router + TanStack Query + Tailwind (accepted 2026-10-05; Next.js not used). Same-origin dev proxy; cookie session, no token in JS. Design tokens (`ink-*`, `surface-*`, `canvas`, brand) in `frontend/src/index.css`; raw Tailwind palettes are not used in screens.
- Auth: email + password, argon2, server-side `sessions` table, HttpOnly cookie; login rate limit keyed by email + IP, fail-open when Redis is down.
- Organisations (2026-10-27, implemented 2026-11-06): `organizations {name, kind STUDENT|CENTRE|COLLEGE}`, `organization_members {role OWNER|STAFF}`, `projects.organization_id` (NOT NULL; `user_id` kept as creator). Registration creates a personal STUDENT organisation; ownership checks are membership-based (404, never 403); projects are always created in the caller's personal organisation until an org picker exists; centres are onboarded with `backend/scripts/admin/add_member.py`.
- Jobs: Celery tasks are instances of `BaseJobTask` subclasses registered with `celery_app.register_task(...)`; lifecycle QUEUED → RUNNING → SUCCEEDED/FAILED/RETRYING with provider-error retries (max 3, backoff); Redis resource locks (`resource_lock_ttl_seconds`, default 900); DB-backed `operation_receipts` for idempotent worker operations.
- Section content: constrained Markdown with `[@S1]` citation and `[[fig:key]]` figure markers; deterministic python-docx compiler; PDF later via LibreOffice.
- Section lifecycle names from CLAUDE.md §20; approval is version-specific; project status is derived server-side (`ProjectStatusService.recompute`, currently always DRAFT until sources/sections exist).
- Generation provider: Anthropic via official SDK, `claude-opus-5` with effort as the routing lever (recommended, pending founder confirmation). Embeddings provider and vector dimension: **undecided (D-4)**.
- ADR files not yet written; decisions are recorded in `docs/planning/2026-09-15-initial-repository-plan.md` §7 and change log.

# Contracts
- `docs/api/api-contracts-v1.md` — frozen 2026-10-06, amended 2026-10-21, 2026-10-27, 2026-11-02 (`PATCH /projects/{id}` accepts `logo_asset_id`). Single source of truth for both lanes; changes only by PR to that file.
- Interactive product walkthrough (all screens, states, per-screen backend notes): Claude artifact "Slice One Walkthrough".

# Backend Status (develop, 2026-11-02)
Merged: foundation scaffold; B-02 auth (register/login/logout/me, sessions, rate limit); B-03 projects (CRUD, soft delete, `Idempotency-Key` on create, `details` JSONB, `semester` int, list ordered by `updated_at`); B-03a organisations and membership ownership; B-04 jobs framework (`BaseJobTask`, resource locks, operation receipts, `GET /jobs/{id}`, `GET /projects/{id}/jobs?active=`). Placeholder `noop` tasks on the three queues. LLM gateway + FakeProvider + prompt loader from the scaffold. 117 backend tests, CI green. `docs/api/openapi.json` and `frontend/src/lib/api/generated.ts` regenerated 2026-11-03. Next: B-05 (assets incl. `PATCH logo_asset_id`), B-06.

# Frontend Status (develop, 2026-11-02)
Merged: F-01 mocks (MSW, contract-coverage test), F-02 app shell (step states, jobs tray on a local registry — backend endpoint now exists, wire it), F-03 auth (sign in/register, `RequireAuth`, safe redirect), F-04 projects list + new project, F-05 Setup report details (form, students, logo three-step upload on mocks, required-details warnings, 8 page tests). Logo is uploaded but not yet attached to the project (needs B-05). Next: F-06 sources. Mock-first; `VITE_API_MODE=real` switches to the backend through the Vite proxy.

# Database Status
Migrations: `0001_foundation` (users, sessions, projects, jobs, `vector` extension) → `ced36758c0a8` (project_idempotency_keys) → `e3dc2e76cfc3` (operation_receipts) → `f3c6a9329cb8` (organizations, organization_members, projects.organization_id with backfill of one STUDENT org per user). Local Postgres on host port 5433 (5432 is taken on the founder's machine). Vector dimension fixed when D-4 is decided (B-10).

# Task Tracking
Plane board (workspace `ironhawks-tech`, project Internship) is the live board; `TASKS.md` is the index. 44 tickets (B-01..B-26, B-03a, F-01..F-14). Cycle "Slice 1 — vertical slice" 2026-10-06 → 2026-11-14.

# Review Lessons (keep applying)
- Vinay: twice a green suite hid a runtime defect (rate limiter, class-decorated Celery tasks). Require a test that exercises the registered/real object, not the class behind it. Fixed well on re-review.
- Priya: ships tests with acceptance criteria and sanitised redirects unasked; recurring issues are UTF-8 BOMs from her editor (CI now rejects them), PRs opened against `main`, and stacked branches not rebased after squash merges.
- Squash-merging a stacked PR makes the next PR in the stack conflict; the fix is `git rebase --onto origin/develop <old-base-sha>`.

# Known Issues / Risks
- Repo lives inside iCloud Drive (founder's convention for all ironhawks repos). Keep `node_modules`, `.venv`, caches ignored; never commit from a half-synced state.
- GitHub org is on the free plan: branch protection unavailable on private repos. `main` is protected by convention (PRs only, review required); `develop` is the integration branch.
- One backend developer: slice 1 is six weeks; B-03a adds ~3 days before B-05.
- LocalStack is on its last token-free line (4.13.1); no further updates without an account.
- Logo attachment to a project needs B-05 to implement the 2026-11-02 contract row; until then F-05 uploads the logo but cannot persist the link.

# Technical Debt
- `backend/app/db/models.py` imports `OperationReceipt` via `jobs.idempotency` (re-export) instead of `jobs.models`.
- Membership predicate duplicated in `deps`, `jobs.get_job`, `projects.list_projects`; `conftest.py` duplicates personal-organisation creation (PR #17 LOWs).
- Frontend jobs tray still uses a local registry; switch to `GET /projects/{id}/jobs?active=true`.
- Project status recompute is a stub (always DRAFT) until sources/sections land.

# Next Priorities
1. Vinay: B-05 (assets, incl. `PATCH logo_asset_id`) → B-06 (sources) → B-07 golden fixture.
2. Priya: F-06 sources; verify F-03/F-05 against the real backend; wire the jobs tray to `GET /projects/{id}/jobs?active=true`.
3. Founder: D-4 embeddings decision; decide on the one-week re-baseline; rotate the Plane API token that was pasted in chat.
4. Write ADR-001..012 files into `docs/decisions/` from plan §7; golden project fixture (B-07).
