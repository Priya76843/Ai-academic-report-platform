# acamedia-builder — AI Project Documentation Platform

AI-assisted documentation workspace for final-year project and seminar reports. Students upload their college format, research papers, source code and screenshots; the system builds a grounded project knowledge base, plans the report, generates chapters with evidence, and compiles an editable DOCX after human approval.

## Read first
1. `CLAUDE.md` — how we build (architecture rules, security, Definition of Done).
2. `MEMORY.md` — current state of the project.
3. `docs/api/api-contracts-v1.md` — the frozen API contract both lanes code against.
4. `docs/planning/2026-09-15-initial-repository-plan.md` — repository plan, slice-1 scope, schedule (§11).
5. `TASKS.md` — index of the Plane board.

## Layout
```
backend/   FastAPI modular monolith, Celery workers, Alembic migrations   (created by B-01)
frontend/  React + Vite + TypeScript                                       (created by F-01)
docs/      product, architecture, api, decisions, planning, reviews, runbooks
scripts/   dev and golden-project helpers
infra/     Dockerfiles and deployment
```

## Local development
Defined by ticket B-01: `docker compose up` brings up PostgreSQL (pgvector), Redis, LocalStack (S3), the API and a worker. Until then this repository contains documentation only.

## Workflow
See `CONTRIBUTING.md`. Branch from `develop`, open a pull request, get one review, squash-merge. `main` receives only reviewed releases from `develop`.
