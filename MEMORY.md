# MEMORY.md — repository memory

Read with CLAUDE.md at the start of every session. Replace outdated facts; do not append history (git has it).

# Current Product State
AI Project Documentation Platform (working name; folder/repo `acamedia-builder`). MVP = project reports and seminar reports for Indian engineering students. Positioning: evidence-grounded documentation that understands the student's real project, never "AI report generator". Commercial goal: 10 pilot users → 100 paying → ₹10 lakh.

Status 2026-10-12: planning complete, repository initialised, foundation scaffold built by Claude (PR `feature/claude/foundation-scaffold` → `develop`). No product logic yet. Slice 1 starts 2026-10-06 and demos in week 6 (2026-11-14).

# Team
- Founder / approver: Vivek (viveksj2920). Decides scope, architecture approvals, provider choices.
- Vinay: all backend (foundation, auth, projects, jobs, storage, sources, ingestion, retrieval, gateway, planner, generation, review, export, telemetry).
- Priya: frontend.
- Claude: CTO/architect, contract owner, reviewer, QA, repository memory; may build the foundation scaffold if approved.
- Rajeshwari left 2026-10-06. Slice-2+ knowledge intelligence (format parsing, code analysis, screenshots) has no named owner yet.

# Architecture Decisions (approved)
- Modular monolith: FastAPI + Pydantic + SQLAlchemy 2 (sync) + Alembic; PostgreSQL + pgvector; Redis + Celery (queues ingestion / generation / export); S3-compatible object storage with direct presigned uploads; centralised LLM gateway; versioned prompt files; no agent framework; uploaded code never executed.
- Local object storage: **LocalStack (S3 service)** in docker-compose (decided 2026-10-12; replaced MinIO), pinned to image `4.13.1` because `2026.x` images require `LOCALSTACK_AUTH_TOKEN`. Production: AWS S3 or any S3-compatible service.
- Frontend: React + Vite + TypeScript + React Router + TanStack Query + Tailwind (accepted 2026-10-05; Next.js not used). Same-origin dev proxy; cookie session, no token in JS.
- Auth: email + password, argon2, server-side `sessions` table, HttpOnly cookie.
- Section content: constrained Markdown with `[@S1]` citation and `[[fig:key]]` figure markers; deterministic python-docx compiler; PDF later via LibreOffice.
- Section lifecycle names from CLAUDE.md §20 (PLANNED → GENERATING → GENERATED → IN_REVIEW → APPROVED, + REGENERATING / FAILED / NEEDS_INPUT); approval is version-specific; project status is derived server-side, never set by the client.
- Generation provider: Anthropic via official SDK, `claude-opus-5` with effort as the routing lever (recommended, pending founder confirmation). Embeddings provider and vector dimension: **undecided (D-4)**.
- ADR files not yet written; the decisions above are recorded in `docs/planning/2026-09-15-initial-repository-plan.md` §7 and change log.

# Contracts
- `docs/api/api-contracts-v1.md` — frozen 2026-10-06. Single source of truth for both lanes; changes only by PR to that file.
- Interactive product walkthrough (all screens, states, per-screen backend notes): Claude artifact "Slice One Walkthrough".

# Backend Status
Scaffold only (no product logic): FastAPI app factory, settings, structlog + request id, error envelope, sync SQLAlchemy + Alembic 0001 (users, sessions, projects, jobs, pgvector), `GET /health`, `GET /auth/me`, `GET /jobs/{id}`, auth/ownership dependencies (404 not 403), jobs service with transition table, LLM gateway + FakeProvider + prompt loader + introduction/v1 prompt, storage adapter (S3/LocalStack + FakeStorage), Celery app with three queues, 23 tests, CI. Real providers, register/login, projects endpoints are B-12 / B-02 / B-03. Tickets B-01..B-19 (slice 1) and B-20..B-26 (slice 2+) on Plane.

# Frontend Status
Scaffold only: Vite + React 19 + TS strict + React Router 7 + TanStack Query 5 + Tailwind 4; `api()` client with `ApiError`; `useJob`; StatusPill/ProgressBar/Note/EmptyState; routes for every screen (placeholders); MSW handlers for health, auth/me, projects, jobs; generated types from `docs/api/openapi.json`; 5 tests; build passes. Priya's earlier layout work is to be absorbed into F-02.

# Database Status
Migration 0001: users, sessions, projects, jobs + `vector` extension. Local Postgres on host port 5433 (5432 is taken on the founder's machine). Vector dimension fixed when D-4 is decided (B-10).

# Task Tracking
Plane board (workspace `ironhawks-tech`, project Internship) is the live board; `TASKS.md` is the index. Cycle "Slice 1 — vertical slice" 2026-10-06 → 2026-11-14. Old intern tickets archived at `docs/reviews/plane-backup-2026-10-06.json`.

# Known Issues / Risks
- Repo lives inside iCloud Drive (founder's convention for all ironhawks repos). Keep `node_modules`, `.venv`, caches ignored; never commit from a half-synced state.
- GitHub org is on the free plan: branch protection unavailable on private repos. `main` is protected by convention (PRs only, review required).
- One backend developer: slice 1 is six weeks. Foundation scaffold delivered 2026-10-12, so B-01/F-01 are review-and-own.
- LocalStack is on its last token-free line (4.13.1); no further updates without an account. Revisit if S3 emulation breaks.

# Technical Debt
None yet (no code).

# Next Priorities
1. Founder: merge the scaffold PR; invite Vinay and Priya to the repo; decide embeddings provider + dimension (D-4).
2. Week 1 tickets: B-01 (review scaffold), B-02, B-03 (Vinay); F-01 (review scaffold, extend mocks), F-02, F-03 (Priya).
3. Write ADR-001..012 files into `docs/decisions/` from plan §7.
4. Golden project fixture (B-07); founder to supply a real student project for slice 2.
