# TASKS.md — execution state

The live board is Plane: workspace `ironhawks-tech`, project **Internship**. This file is the index Claude and the team read at session start; Plane is where state changes. Every ticket references `docs/api/api-contracts-v1.md` and plan §11 in `docs/planning/2026-09-15-initial-repository-plan.md`.

Cycle **Slice 1 — vertical slice**: 2026-10-06 → 2026-11-14. Demo on the golden project in week 6.

Team: Vinay = all backend. Priya = frontend. Claude = architecture, contract owner, reviews, foundation scaffold if approved.

## Ready (week 1, state Todo)
| Code | Plane | Title | Owner | Week |
|---|---|---|---|---|
| B-01 | INTERNSHIP-20 | Backend foundation & local environment | Vinay | Week 1 |
| B-02 | INTERNSHIP-21 | Authentication with cookie sessions | Vinay | Week 1 |
| B-03 | INTERNSHIP-22 | Projects and report details | Vinay | Week 1 |
| F-01 | INTERNSHIP-46 | Frontend foundation and mock-first API client | Priya | Week 1 |
| F-02 | INTERNSHIP-47 | App shell and project navigation | Priya | Week 1 |
| F-03 | INTERNSHIP-48 | Sign in and register | Priya | Week 1 |

## Backlog — slice 1 (weeks 2–6)
| Code | Plane | Title | Owner | Week |
|---|---|---|---|---|
| B-04 | INTERNSHIP-23 | Jobs framework | Vinay | Week 2 |
| B-05 | INTERNSHIP-24 | Object storage adapter and project assets | Vinay | Week 2 |
| B-06 | INTERNSHIP-25 | Sources API | Vinay | Week 2 |
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
| F-04 | INTERNSHIP-49 | Projects list and New project | Priya | Week 2 |
| F-05 | INTERNSHIP-50 | Setup — report details | Priya | Week 2 |
| F-06 | INTERNSHIP-51 | Sources | Priya | Week 2 |
| F-07 | INTERNSHIP-52 | Report plan | Priya | Week 3 |
| F-08 | INTERNSHIP-53 | Chapter editor | Priya | Week 4 |
| F-09 | INTERNSHIP-54 | Export | Priya | Week 5 |
| F-10 | INTERNSHIP-55 | Integration and end-to-end test | Priya | Week 5 |

## Backlog — slice 2+ (no dates)
| Code | Plane | Title | Owner | Week |
|---|---|---|---|---|
| B-20 | INTERNSHIP-39 | [Slice 2+] College format parsing → ReportTemplateSpec | Vinay | — |
| B-21 | INTERNSHIP-40 | [Slice 2+] Paper links: resolve DOI / arXiv / URL | Vinay | — |
| B-22 | INTERNSHIP-41 | [Slice 2+] Source code static analysis | Vinay | — |
| B-23 | INTERNSHIP-42 | [Slice 2+] Screenshot analysis and figures | Vinay | — |
| B-24 | INTERNSHIP-43 | [Slice 2+] Final review pipeline | Vinay | — |
| B-25 | INTERNSHIP-44 | [Slice 2+] PDF export via LibreOffice headless | Vinay | — |
| B-26 | INTERNSHIP-45 | [Slice 2+] Plan editing | Vinay | — |
| F-11 | INTERNSHIP-56 | [Slice 2+] Rich text editor with Markdown round-trip | Priya | — |
| F-12 | INTERNSHIP-57 | [Slice 2+] Final review screen | Priya | — |
| F-13 | INTERNSHIP-58 | [Slice 2+] Plan editing | Priya | — |
| F-14 | INTERNSHIP-59 | [Slice 2+] Figures: screenshots as numbered figures | Priya | — |

## In Progress
(none)

## In Review
- Foundation scaffold — PR `feature/claude/foundation-scaffold` → `develop` (Claude). Covers plan §3 F-1…F-9; B-01 and F-01 become review-and-own once merged.

## Blocked
- Embedding provider and vector dimension (founder decision D-4) — blocks B-10 beyond FakeProvider.

## Done
- Onboarding: INTERNSHIP-1, 2, 3 (kept on the board for history).

_Regenerated 2026-10-06 from Plane; scaffold note added 2026-10-12. Previous tickets 4–18 archived in `docs/reviews/plane-backup-2026-10-06.json`._
