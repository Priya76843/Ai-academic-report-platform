# MEMORY.md — repository memory

Read with CLAUDE.md at the start of every session. Replace outdated facts; do not append history (git has it).

# Current Product State
AI Project Documentation Platform (working name; folder/repo `acamedia-builder`). MVP = project reports and seminar reports for Indian engineering students. Positioning: evidence-grounded documentation that understands the student's real project, never "AI report generator". Commercial goal: 10 pilot users → 100 paying → ₹10 lakh.

Status 2026-10-12: planning complete, repository initialised, no product code yet. Slice 1 starts 2026-10-06 and demos in week 6 (2026-11-14).

# Team
- Founder / approver: Vivek (viveksj2920). Decides scope, architecture approvals, provider choices.
- Vinay: all backend (foundation, auth, projects, jobs, storage, sources, ingestion, retrieval, gateway, planner, generation, review, export, telemetry).
- Priya: frontend.
- Claude: CTO/architect, contract owner, reviewer, QA, repository memory; may build the foundation scaffold if approved.
- Rajeshwari left 2026-10-06. Slice-2+ knowledge intelligence (format parsing, code analysis, screenshots) has no named owner yet.

# Architecture Decisions (approved)
- Modular monolith: FastAPI + Pydantic + SQLAlchemy 2 (sync) + Alembic; PostgreSQL + pgvector; Redis + Celery (queues ingestion / generation / export); S3-compatible object storage with direct presigned uploads; centralised LLM gateway; versioned prompt files; no agent framework; uploaded code never executed.
- Local object storage: **LocalStack (S3 service)** in docker-compose (decided 2026-10-12; replaced MinIO). Production: AWS S3 or any S3-compatible service.
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
Nothing implemented. Tickets B-01..B-19 (slice 1) and B-20..B-26 (slice 2+) on Plane.

# Frontend Status
Layout work from the old ticket 4 exists on Priya's machine only; to be absorbed into F-01/F-02. Nothing in this repo yet.

# Database Status
No migrations. Planned first migration: users, sessions, projects, jobs. Vector dimension fixed when D-4 is decided.

# Task Tracking
Plane board (workspace `ironhawks-tech`, project Internship) is the live board; `TASKS.md` is the index. Cycle "Slice 1 — vertical slice" 2026-10-06 → 2026-11-14. Old intern tickets archived at `docs/reviews/plane-backup-2026-10-06.json`.

# Known Issues / Risks
- Repo lives inside iCloud Drive (founder's convention for all ironhawks repos). Keep `node_modules`, `.venv`, caches ignored; never commit from a half-synced state.
- GitHub org is on the free plan: branch protection unavailable on private repos. `main` is protected by convention (PRs only, review required).
- One backend developer: slice 1 is six weeks; the foundation scaffold by Claude is the main lever to hold that.

# Technical Debt
None yet (no code).

# Next Priorities
1. Founder decisions: embeddings provider + dimension (D-4); Claude foundation scaffold yes/no.
2. Week 1 tickets: B-01, B-02, B-03 (Vinay); F-01, F-02, F-03 (Priya).
3. Write ADR-001..012 files into `docs/decisions/` from plan §7.
4. Golden project fixture (B-07); founder to supply a real student project for slice 2.
