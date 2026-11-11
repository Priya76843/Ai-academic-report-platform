# TASKS.md — execution state

The live board is Plane: workspace `ironhawks-tech`, project **Internship**. This file is the index Claude and the team read at session start; Plane is where state changes. Every ticket references `docs/api/api-contracts-v1.md` and plan §11 in `docs/planning/2026-09-15-initial-repository-plan.md`.

Cycle **Slice 1 — vertical slice**: 2026-10-06 → 2026-11-14 (one-week re-baseline to 2026-11-21 proposed, not applied). Demo on the golden project in week 6.

Team: Vinay = all backend. Priya = frontend. Claude = architecture, contract owner, reviews, repository memory.

PR rules: branch from `develop`, PR into `develop` (never `main`), CI green, review findings addressed, tests for every feature (CLAUDE.md §39). Stacked branches must be rebased with `git rebase --onto origin/develop <old-base>` after the base PR is squash-merged.

## Ready (state Todo)
| Code | Plane | Title | Owner | Target |
|---|---|---|---|---|
| B-05 | INTERNSHIP-24 | Object storage adapter and project assets (+ `PATCH logo_asset_id`, contract 2026-11-02) | Vinay | Week 2 |
| B-06 | INTERNSHIP-25 | Sources API | Vinay | Week 2 |
| F-06 | INTERNSHIP-51 | Sources | Priya | Week 2 |

## Backlog — slice 1
| Code | Plane | Title | Owner | Week |
|---|---|---|---|---|
| B-07 | INTERNSHIP-26 | Golden project fixture | Vinay | Week 2 |
| B-08 | INTERNSHIP-27 | PDF extraction and document metadata | Vinay | Week 3 |
| B-09 | INTERNSHIP-28 | Page-aware chunking | Vinay | Week 3 |
| B-10 | INTERNSHIP-29 | Embeddings and pgvector storage | Vinay | Week 3 |
| B-11 | INTERNSHIP-30 | Ingestion task ingest_pdf | Vinay | Week 3 |
| B-12 | INTERNSHIP-31 | LLM gateway, providers, routing and cost | Vinay | Week 4 |
| B-13 | INTERNSHIP-32 | Prompt management and Introduction prompt v1 | Vinay | Week 4 |
| B-14 | INTERNSHIP-33 | Built-in template and deterministic planner | Vinay | Week 4 |
| B-15 | INTERNSHIP-34 | Project-scoped retrieval service | Vinay | Week 4 |
| B-16 | INTERNSHIP-35 | Introduction generation worker with citation gate | Vinay | Week 5 |
| B-17 | INTERNSHIP-36 | Section review endpoints (edit, approve, regenerate) | Vinay | Week 5 |
| B-18 | INTERNSHIP-37 | DOCX export compiler | Vinay | Week 6 |
| B-19 | INTERNSHIP-38 | Usage and cost telemetry | Vinay | Week 6 |
| F-07 | INTERNSHIP-52 | Report plan | Priya | Week 3 |
| F-08 | INTERNSHIP-53 | Chapter editor | Priya | Week 4 |
| F-09 | INTERNSHIP-54 | Export | Priya | Week 5 |
| F-10 | INTERNSHIP-55 | Integration and end-to-end test | Priya | Week 5 |

## Backlog — slice 2+ (no dates)
| Code | Plane | Title | Owner |
|---|---|---|---|
| B-20 | INTERNSHIP-39 | [Slice 2+] College format parsing → ReportTemplateSpec | Vinay |
| B-21 | INTERNSHIP-40 | [Slice 2+] Paper links: resolve DOI / arXiv / URL | Vinay |
| B-22 | INTERNSHIP-41 | [Slice 2+] Source code static analysis | Vinay |
| B-23 | INTERNSHIP-42 | [Slice 2+] Screenshot analysis and figures | Vinay |
| B-24 | INTERNSHIP-43 | [Slice 2+] Final review pipeline | Vinay |
| B-25 | INTERNSHIP-44 | [Slice 2+] PDF export via LibreOffice headless | Vinay |
| B-26 | INTERNSHIP-45 | [Slice 2+] Plan editing | Vinay |
| F-11 | INTERNSHIP-56 | [Slice 2+] Rich text editor with Markdown round-trip | Priya |
| F-12 | INTERNSHIP-57 | [Slice 2+] Final review screen | Priya |
| F-13 | INTERNSHIP-58 | [Slice 2+] Plan editing | Priya |
| F-14 | INTERNSHIP-59 | [Slice 2+] Figures: screenshots as numbered figures | Priya |

## In Progress
- B-05 Object storage adapter and project assets (Vinay) — next after B-03a.
- F-06 Sources (Priya) — implementation plan in progress.

## In Review
(none)

## Blocked
- Embedding provider and vector dimension (founder decision D-4) — blocks B-10 beyond FakeProvider.
- Schedule re-baseline (+1 week) — founder decision, not applied on Plane.

## Done
| Code | PR | Merged |
|---|---|---|
| Foundation scaffold (B-01 / F-01 base) | #1 | 2026-10-12 |
| F-04 Projects list and New project | #3 | 2026-10-21 |
| B-02 Authentication with cookie sessions | #4 | 2026-10-22 |
| Contract: auth rows | #5 | 2026-10-21 |
| F-01 Frontend foundation and mocks (+ fixes #13) | #6, #13 | 2026-10-30, 2026-11-02 |
| B-03 Projects and report details | #7 | 2026-10-30 |
| F-02 App shell and project navigation (+ fixes #14) | #8, #14 | 2026-10-30, 2026-11-02 |
| GTM decision doc | #9 | 2026-10-30 |
| F-03 Sign in and register | #10 | 2026-10-30 |
| B-04 Jobs framework (+ `GET /projects/{id}/jobs`) | #11 | 2026-11-02 |
| Contract: idempotency, jobs list, semester int, organisations | #12 | 2026-10-30 |
| F-05 Setup — report details | #15 | 2026-11-06 |
| Housekeeping: contract `logo_asset_id`, CI BOM guard | #16 | 2026-11-02 |
| B-03a Organisations and membership-based ownership | #17 | 2026-11-06 |
| Onboarding INTERNSHIP-1, 2, 3 | — | — |

## Follow-ups (small, no ticket)
- Backend: `app/db/models.py` should import `OperationReceipt` from `jobs.models`, not `jobs.idempotency` (LOW, from PR #11).
- Backend (from PR #17): the membership predicate is written three times (`deps`, `jobs.get_job`, `projects.list_projects`); extract one `user_organization_ids(user_id)` subquery. `conftest.py` re-implements personal-organisation creation; extract `create_personal_organization(db, user)`.
- Frontend (from PR #15): once B-05 lands, send `logo_asset_id` in the Setup save PATCH and preview the existing logo via `GET /assets/{aid}/url`.
- Frontend: add a Playwright/MSW smoke for register → login → create project against the real backend (part of F-10).

_Regenerated 2026-11-06 after merging #15 and #17. Previous tickets 4–18 archived in `docs/reviews/plane-backup-2026-10-06.json`._
