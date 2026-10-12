# Initial Repository Plan — Vertical Slice 1

| | |
|---|---|
| Status | **PROPOSED — awaiting project-owner approval** |
| Date | 2026-09-15 |
| Author | Claude (CTO / architect role, per CLAUDE.md) |
| Inputs read | CLAUDE.md (all 62 sections), MEMORY.md, PRD v1, Technical Architecture v1, Revenue & Unit Economics v1 |
| Scope | Repository structure, first backlog, per-intern tasks, dependencies, frozen API contracts, first ADRs |

On approval: MEMORY.md and TASKS.md are updated, the ADRs below are written, and the foundation scaffold is built. Nothing else in this document has been applied yet.

---

## 0. What exists today (repository inspection)

| Item | Finding |
|---|---|
| Files | 2 markdown files, 3 PDFs, 2 DOCX duplicates. No code, no `docs/`, no `TASKS.md`. |
| Git | **Not a git repository.** |
| Location | Folder is inside iCloud Drive (`com~apple~CloudDocs`). |
| File names | The two markdown files are named `CLAUDE.md — AI Project Documentation Platform.md` and `MEMORY.md — Initial Repository Memory.md`. Claude Code only auto-loads a file named exactly `CLAUDE.md`. |
| Machine tooling | python3 (Homebrew), node 22, docker 29, git 2.55, pdftotext present. No `uv`, `poetry`, `pnpm`, `psql`. |

### 0.1 Housekeeping decisions required (blocking the scaffold)

1. **Move the code repository out of iCloud Drive.** Git object stores, `node_modules`, and `.venv` inside a syncing folder cause corruption, phantom conflicts, and multi-GB uploads. Recommendation: the git repo lives at `~/dev/acamedia-builder` (or any non-synced path) with a GitHub remote as the source of truth; the iCloud folder keeps only the product PDFs if you want them there.
2. **Rename** the two markdown files to exactly `CLAUDE.md` and `MEMORY.md`.
3. **Move product documents** into `docs/product/` and `docs/architecture/` inside the repo (PDF only; drop the DOCX duplicates or keep them in iCloud).
4. **Create the GitHub repository** with `main` protected (PR + 1 review required), `develop` as integration branch.

### 0.2 Inconsistencies found between the governing documents

CLAUDE.md §49 sets the hierarchy: CLAUDE.md > ADRs > Architecture doc > PRD > MEMORY.md. These conflicts must be resolved by ADR before the interns write code, otherwise each will pick a different one.

| Topic | CLAUDE.md | Architecture doc | Proposed resolution |
|---|---|---|---|
| Section states | `PLANNED → GENERATING → GENERATED → IN_REVIEW → APPROVED` (+ `FAILED`, `REGENERATING`, `NEEDS_INPUT`) | `NOT_GENERATED → GENERATING → DRAFT_READY → USER_EDITED → APPROVED` | **CLAUDE.md names win.** Semantics borrowed from the arch doc: `GENERATED` = draft exists, untouched; `IN_REVIEW` = user has saved an edit (a user version exists); approval is version-specific. ADR-006. |
| Upload endpoint | `POST /projects/{id}/sources` | `POST /projects/{id}/uploads/presign` + `/uploads/complete` | Keep the `sources` resource name; keep the two-step presign flow: `POST /projects/{id}/sources` returns the record **and** the presigned PUT; `POST /projects/{id}/sources/{sid}/complete` verifies and enqueues ingestion. ADR-004. |
| Edit section | `PUT /sections/{id}` | `PATCH /sections/{id}/content` | `PUT /sections/{id}/content` (full replacement creates a new version). |
| Trigger generation | `POST /sections/{id}/generate` | `POST /projects/{id}/generation` | Section-level endpoint for slice 1 (we generate exactly one section). Project-level bulk generation is added later and reuses the same worker. |
| Export | `POST /projects/{id}/export` | `POST /projects/{id}/exports` | Plural resource: `POST /projects/{id}/exports` (creates an export record, 202). |
| Entity names | `ProjectSource`, `SourceDocument`, `SourceChunk`, `Evidence` | `source_assets`, `documents`, `evidence_chunks`, `evidence_links` | CLAUDE.md names: tables `sources`, `source_documents`, `source_chunks`, `evidence_links`. |
| Template upload | In MVP scope | DOCX preferred, PDF fallback | **Deferred past slice 1.** Slice 1 uses one built-in template spec (JSON) so the planner can be deterministic. |
| Frontend | "React or Next.js" | Next.js | Next.js App Router + TypeScript. ADR-008. |

---

## 1. Vertical Slice 1 — exact definition

> Create Project → Upload one reference PDF → Process it → Create report structure → Generate Introduction using retrieved evidence → User edits/approves → Export a basic DOCX.

### 1.1 In scope (P0)

| Step | What "done" means |
|---|---|
| Auth | Email + password register/login; JWT in httpOnly cookie; every project endpoint is owner-scoped; an IDOR test proves cross-user access returns 404. |
| Create Project | `report_type`, `title`, `topic`, `description`, `target_pages`, `college`, `university`, `citation_style`; persisted; listed on dashboard. |
| Upload one PDF | Two-step presigned upload to LocalStack S3 (local) / AWS S3 or compatible (prod). Allowlist `application/pdf`, max 25 MB, internal object key, original filename stored but never used as a path. |
| Process it | Celery job: PyMuPDF page-by-page extraction → normalisation → page-aware chunking with locator + content hash → embeddings via gateway → pgvector. Source status `UPLOADED → PROCESSING → READY / FAILED` with an error category. Idempotent re-run. |
| Report structure | Built-in "Generic Engineering Project Report" template spec (JSON) → deterministic planner creates a `report_plan` and `report_sections` in `PLANNED` with `section_type`, order, target words, dependencies. No LLM in the planner yet. |
| Generate Introduction | `POST /sections/{id}/generate` → 202 job. Worker: build retrieval query → project-scoped top-k retrieval → `AgentInput` → `LLMGateway.generate_structured()` → `AgentOutput` → **citation validation gate** (every `[@key]` in content must resolve to supplied evidence) → `section_versions` row + `evidence_links` → status `GENERATED`. Tokens and estimated cost recorded on the job. |
| Edit / approve | `PUT /sections/{id}/content` creates a user version and moves to `IN_REVIEW`; `POST /sections/{id}/approve` with the exact `version_id` moves to `APPROVED`. Editing an approved section creates a new version and returns it to `IN_REVIEW`. |
| Export DOCX | `POST /projects/{id}/exports` → 202 job. python-docx compiler: title page (title, college, university, year), one heading per planned section in order, approved content rendered from a constrained Markdown subset, `[@key]` replaced by `[n]`, References list from cited documents. Unapproved sections are omitted and the UI warns. Export validation: no unresolved `[@`/`{{` tokens, non-zero size, headings present. Signed download URL. |
| Telemetry | `generation_jobs` / `usage_events` record provider, model, input/output tokens, estimated INR cost, duration, retry count, prompt version. |
| Golden fixture | `backend/tests/fixtures/golden_project_01/` with one open-access (CC-BY) research PDF, project metadata JSON, and expected extraction facts (page count, a known sentence on a known page, chunk count range). |

### 1.2 Explicitly out of slice 1 (next slices)

Regenerate-with-instruction is P1 inside slice 1 (small once generate works). Everything else waits, but is **designed into the contract now** (enums, states, routes, `details` fields) so it is additive later: template DOCX/PDF upload and parsing plus a template library, paper links (DOI/arXiv/URL) with verified metadata, source code ZIP, screenshots as numbered figures, college logo and full front matter (certificate, declaration, acknowledgement, TOC, lists), LLM report planner and plan editing, multiple section types, final review (consistency, citation, proofreading), PDF export, SSE progress, payments, admin views, project deletion cascade. The interactive walkthrough (Slice One Walkthrough artifact) shows the full MVP flow with Slice 1 / Slice 2+ tags.

### 1.3 Acceptance demo

On the golden fixture, one person with no engineering help completes the whole flow in the browser in under ten minutes, the Introduction cites only the uploaded paper with correct page numbers, and the DOCX opens in Word and LibreOffice.

---

## 2. Repository structure

```text
acamedia-builder/
├── CLAUDE.md                     # renamed, unchanged content
├── MEMORY.md                     # repository memory (Claude maintains)
├── TASKS.md                      # execution board (Backlog/Ready/In Progress/In Review/Blocked/Done)
├── README.md                     # 5-minute local setup
├── CONTRIBUTING.md               # branch model, commit style, PR checklist, Definition of Done
├── Makefile                      # make up / down / migrate / test / lint / seed-golden
├── docker-compose.yml            # postgres (pgvector/pgvector:pg16), redis, localstack (S3 only), api, worker, web
├── .env.example                  # names only, no values
├── .gitignore
├── .github/workflows/ci.yml      # backend lint+type+tests (with pg/redis services); frontend lint+type+tests
│
├── backend/
│   ├── pyproject.toml            # uv-managed; ruff, mypy, pytest
│   ├── uv.lock
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/             # 0001_foundation.py, 0002_sources.py, ...
│   ├── app/
│   │   ├── main.py               # app factory, router mount, middleware
│   │   ├── core/                 # config.py, logging.py (structlog), security.py (jwt, hashing),
│   │   │                         # exceptions.py (error envelope), ids.py (uuid7)
│   │   ├── db/                   # base.py, session.py, mixins.py (timestamps)
│   │   ├── api/
│   │   │   ├── deps.py           # get_db, get_current_user, get_owned_project, get_owned_section
│   │   │   └── v1/               # thin routers only: auth.py, projects.py, sources.py, plan.py,
│   │   │                         # sections.py, exports.py, jobs.py, router.py
│   │   ├── modules/              # one package per bounded module; each has models.py, schemas.py,
│   │   │   ├── auth/             #   service.py, (repository.py), tests live in backend/tests
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   ├── sources/          # upload records, presign, complete   (Rajeshwari)
│   │   │   ├── ingestion/        # pdf_extract.py, normalize.py, chunking.py, pipeline.py (Rajeshwari)
│   │   │   ├── knowledge/        # source_chunks model, embeddings, retrieval.py, evidence schemas (Rajeshwari)
│   │   │   ├── templates/        # builtin/*.json + ReportTemplateSpec schema (Vinay)
│   │   │   ├── planning/         # planner.py (deterministic v1), report_plan/report_sections models (Vinay)
│   │   │   ├── generation/       # agent contracts, section_worker.py, citation_gate.py (Vinay)
│   │   │   ├── review/           # section lifecycle state machine, versions, approval (Vinay)
│   │   │   ├── quality/          # placeholder package; only citation validity in slice 1
│   │   │   ├── exports/          # compiler/ (docx_builder.py, markdown_subset.py), service.py (Vinay)
│   │   │   ├── jobs/             # Job model, state machine, error categories (Vinay)
│   │   │   ├── usage/            # usage_events, cost estimator (Vinay)
│   │   │   └── storage/          # StorageAdapter protocol + s3.py (LocalStack S3/S3) (Rajeshwari)
│   │   ├── ai/
│   │   │   ├── gateway.py        # LLMGateway: generate, generate_structured, embed
│   │   │   ├── schemas.py        # GenerationRequest/Result, EmbeddingResult, usage
│   │   │   ├── routing.py        # task class → model alias + effort
│   │   │   ├── cost.py           # per-model price table → INR estimate
│   │   │   ├── providers/        # base.py, fake.py (deterministic, CI), anthropic.py, embeddings provider
│   │   │   └── prompts/
│   │   │       ├── loader.py     # loads name/version, renders with untrusted-data delimiters
│   │   │       └── section_writer/introduction/v1.md
│   │   ├── workers/
│   │   │   ├── celery_app.py     # queues: ingestion, generation, export
│   │   │   ├── base_task.py      # job row lifecycle, retry classification, idempotency key
│   │   │   ├── tasks_ingestion.py
│   │   │   ├── tasks_generation.py
│   │   │   └── tasks_export.py
│   │   └── observability/        # request_id middleware, log context binding
│   └── tests/
│       ├── conftest.py           # test DB (transaction rollback), fake gateway, fake storage
│       ├── unit/
│       ├── api/
│       ├── integration/          # real postgres+pgvector+redis via compose in CI
│       ├── ai/                   # contract tests for structured outputs; recorded fixtures
│       ├── golden/               # golden_project_01 end-to-end (mocked LLM, real parsing)
│       └── fixtures/golden_project_01/
│
├── frontend/
│   ├── package.json              # npm; Next.js (App Router), TypeScript, TanStack Query, Tailwind
│   ├── next.config.ts            # dev rewrite /api/* → backend (same-origin, no CORS)
│   ├── src/
│   │   ├── app/                  # /login /register /dashboard /projects/new
│   │   │                         # /projects/[id]/setup /sources /plan /sections/[sectionId] /final-review /export
│   │   │                         # (setup = report details for front matter; final-review is slice 2+)
│   │   ├── components/           # shared UI (status badges, job progress, empty/error states)
│   │   ├── features/             # auth/ projects/ sources/ plan/ sections/ exports/
│   │   ├── lib/api/              # generated OpenAPI types + typed fetch client + query hooks
│   │   └── mocks/                # MSW handlers built from the frozen contract (dev + tests)
│   └── tests/                    # vitest (components/hooks), playwright (e2e happy path)
│
├── scripts/
│   ├── dev/                      # bootstrap.sh, reset_db.sh, create_buckets.sh, seed_user.py
│   └── golden/                   # ingest_golden.py (loads fixture into a dev project)
│
├── docs/
│   ├── decisions/                # ADR-001 … (see §7)
│   ├── api/                      # api-contracts-v1.md (frozen), openapi.json snapshot (CI diff-checked)
│   ├── architecture/             # Technical Architecture PDF, state-machines.md, data-model.md
│   ├── product/                  # PRD PDF, Revenue plan PDF
│   ├── prompts/                  # prompt design guidelines, evaluation rubric (the prompts themselves live in backend/app/ai/prompts)
│   ├── planning/                 # this document, weekly integration notes
│   └── runbooks/                 # local-setup.md, troubleshooting.md, secrets.md
│
└── infra/
    ├── docker/                   # Dockerfile.api, Dockerfile.worker, Dockerfile.web
    └── deploy/                   # empty until staging exists (single VM + compose is the plan)
```

Rules baked into the structure (from CLAUDE.md §26, §27, §24, §51): routers are thin; prompts are versioned files; provider SDKs appear only under `app/ai/providers/`; no `utils.py` dumping ground; migrations only through Alembic.

---

## 3. Foundation scaffold (week 1) — recommended to be built by Claude, reviewed by the founder

The single biggest risk with three parallel interns is three incompatible foundations. The scaffold contains **no product logic**, only the walking skeleton every task plugs into. Interns then own their areas from day one on top of a shared base.

| ID | Deliverable | Why it unblocks parallel work |
|---|---|---|
| F-1 | Repo init, rename files, docs moved, `.gitignore`, `.env.example`, branch model, CI skeleton | Everyone starts from the same tree |
| F-2 | Backend app factory, settings, structlog + request id, error envelope, health endpoint, SQLAlchemy 2 sync session, Alembic wired | Interns write modules, not plumbing |
| F-3 | `docker-compose.yml` (postgres+pgvector, redis, localstack + bucket bootstrap), Makefile | Identical local environments; presign works locally exactly as in prod |
| F-4 | Migration `0001_foundation`: `users`, `projects`, `jobs` + `get_current_user` / `get_owned_project` dependencies (JWT verification, no login endpoint yet) | Rajeshwari's sources module and Vinay's plan module both need project ownership on day one |
| F-5 | `LLMGateway` protocol + Pydantic schemas + `FakeProvider` (deterministic text and hashed embeddings) + routing table + cost table | Rajeshwari can embed and Vinay can generate in tests before a real key exists |
| F-6 | `StorageAdapter` protocol + `FakeStorage` for tests (real S3 impl is R-1) | Contract fixed; tests don't need LocalStack S3 |
| F-7 | Celery app, queues, `base_task` with job-row lifecycle and retry classification | Both backend interns write tasks the same way |
| F-8 | Frontend shell: Next.js, TS strict, Tailwind, TanStack Query, OpenAPI type generation, MSW wiring, layout, route stubs | Priya builds screens against mocks from day one |
| F-9 | `docs/api/api-contracts-v1.md` (this document's §6, expanded), `docs/decisions/ADR-001…009` | The frozen contract |
| F-10 | Golden fixture folder with a CC-BY PDF and metadata JSON | Real data for every test from week 1 |

Alternative if you prefer interns to build the foundation themselves: assign F-2/F-4/F-7 to Vinay, F-3/F-6 to Rajeshwari, F-8 to Priya. Expect roughly one extra week before parallel feature work can begin, and more review load.

---

## 4. Backlog and per-intern tasks

Every task: owner, objective, acceptance criteria (AC), dependencies. IDs are stable and will be copied into TASKS.md on approval. `[P1]` marks stretch items within the slice.

### 4.1 Rajeshwari — Backend, Knowledge Intelligence

| ID | Task | Acceptance criteria | Depends on |
|---|---|---|---|
| R-1 | S3 (LocalStack locally, AWS S3 or compatible in production) `StorageAdapter` implementation | `presign_put`, `presign_get`, `head`, `delete`; keys are `projects/{project_id}/sources/{source_id}/{uuid}.pdf`; integration test against LocalStack S3 in compose; expiry ≤ 15 min | F-6 |
| R-2 | Sources module + migration `0002_sources` | `POST /projects/{id}/sources` validates type/size, creates `UPLOAD_PENDING` record, returns presigned PUT; `POST …/complete` HEADs object, checks size, sets `UPLOADED`, enqueues `ingest_pdf`; `GET` list/one; `DELETE` removes object + chunks; IDOR test; filename never used in key | F-4, R-1 |
| R-3 | PDF extraction | PyMuPDF page-by-page text with page numbers; header/footer and line-wrap normalisation; `extraction_quality` flag (chars/page threshold); `source_documents` row with title/authors/year **only from PDF metadata, else null**; unit tests on golden PDF | F-10 |
| R-4 | Chunking | Page-aware chunker (~700 tokens, ~100 overlap, never crosses a page silently: chunk carries `page_start`/`page_end`), stable `locator` JSON and `content_hash`; deterministic across runs; tests assert count range and locator correctness on golden PDF | R-3 |
| R-5 | Embeddings + pgvector | Migration `0003_source_chunks` enables `vector`, fixed dimension from config; batch `gateway.embed()`; skip chunks whose `content_hash` already embedded; tests use `FakeProvider` | F-5, R-4 |
| R-6 | Retrieval service | `retrieve_evidence(project_id, query, k, source_types) -> list[EvidenceItem]` (chunk_id, source_id, citation_key, page, excerpt, score); SQL always filters `project_id`; **test proves chunks from project B never appear for project A**; citation keys assigned per source document (`S1`, `S2`, …) | R-5 |
| R-7 | Ingestion Celery task `ingest_pdf(source_id)` | Orchestrates R-3→R-5; transitions `PROCESSING → READY/FAILED` with error category (`parse_failure`, `provider_timeout`, `internal`); idempotent (re-run replaces chunks for that source atomically); job row updated; golden integration test | F-7, R-3..R-5 |
| R-8 [P1] | Ingestion summary for the UI | `GET /projects/{id}/sources/{sid}` returns page_count, chunk_count, extraction_quality, document metadata | R-7 |

### 4.2 Vinay — Backend, Generation & Orchestration

| ID | Task | Acceptance criteria | Depends on |
|---|---|---|---|
| V-1 | Auth endpoints | `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`; argon2 hashing; JWT (15 min) in httpOnly `Secure` `SameSite=Lax` cookie; rate limit on login; passwords never logged; API tests | F-4 |
| V-2 | Projects endpoints | `POST/GET /projects`, `GET/PATCH /projects/{id}`; Pydantic schemas, no ORM leakage; project status enum from ADR-006; IDOR test | F-4 |
| V-3 | Real LLM provider(s) behind the gateway | Anthropic provider using the official SDK: `generate_structured` via `output_config.format` with Pydantic schema, bounded repair retry on invalid output, streaming for long outputs, typed error mapping (rate limit / timeout / invalid request); embeddings provider (see §8 decision); usage tokens returned on every call; contract tests with recorded fixtures, never live in CI | F-5 |
| V-4 | Jobs API + state machine ownership | `GET /jobs/{id}`; states `QUEUED RUNNING SUCCEEDED FAILED RETRYING`; error categories; retry policy table from arch doc §11.1 encoded in `base_task`; tests for each transition | F-7 |
| V-5 | Built-in template + deterministic planner | `templates/builtin/generic_engineering_project_report_v1.json` conforming to `ReportTemplateSpec`; `POST /projects/{id}/plan` (sync, 201) creates plan + sections in `PLANNED` with `section_type`, `order_index`, `target_words`, `dependencies`; re-running returns 409 if any section is past `PLANNED`; `GET /projects/{id}/plan`, `GET /projects/{id}/sections` | V-2 |
| V-6 | Prompt management | `prompts/loader.py` (name, version, objective header); `section_writer/introduction/v1.md`; evidence rendered inside explicit untrusted-data delimiters with the trust-hierarchy instruction; unit test that injected text like "ignore previous instructions" inside evidence is delimited, not treated as instruction | F-5 |
| V-7 | Introduction generation worker | `POST /sections/{id}/generate` → 202 (409 if a generation job is active — Redis lock); task builds query from title/topic/description/section objective → `RetrievalService` → `AgentInput` → `generate_structured(AgentOutput)` → citation gate (every `[@key]` ∈ supplied keys, else one repair attempt then `FAILED` with `citation_validation`) → `section_versions` + `evidence_links` → `GENERATED`; job records model, prompt version, tokens, cost | V-4, V-5, V-6, R-6 (interface from F-5; real data from R-7) |
| V-8 | Review endpoints | `GET /sections/{id}` (active version + evidence list); `PUT /sections/{id}/content` (new user version, `IN_REVIEW`); `POST /sections/{id}/approve` `{version_id}` (must equal active version, `APPROVED`); editing an approved section → new version + `IN_REVIEW`; `POST /sections/{id}/regenerate` `{instruction}` [P1]; state-machine unit tests for every legal and illegal transition | V-7 |
| V-9 | DOCX export | `POST /projects/{id}/exports` → 202; compiler renders title page, headings in plan order, approved versions only, Markdown subset (paragraphs, `##`/`###`, bullet lists), `[@S1]`→`[1]`, References list; validation gate (no unresolved tokens, headings present, size > 0); upload to storage; `GET /projects/{id}/exports`, `GET /exports/{id}/download` → signed URL; golden DOCX test opens with python-docx and asserts headings | V-8, R-1 |
| V-10 | Cost telemetry | `usage_events` row per gateway call; INR estimate from `ai/cost.py`; `GET /projects/{id}/usage` (owner) | V-3, V-7 |

### 4.3 Priya — Frontend

| ID | Task | Acceptance criteria | Depends on |
|---|---|---|---|
| P-1 | Frontend foundation ownership | Typed API client generated from `docs/api/openapi.json`; query hooks per resource; global error envelope → toast/inline mapping; loading/empty/error/processing states as reusable components; MSW handlers covering every contract endpoint with realistic status progressions (e.g. source `UPLOADED → PROCESSING → READY` on repeated polls) | F-8, F-9 |
| P-2 | Auth UX | Register, login, logout; protected routes redirect; session via cookie (no token in JS); form validation messages match backend error codes | P-1 (mock), V-1 (integration) |
| P-3 | Dashboard + Create Project | Project cards with status and updated time; create form with all slice-1 fields; validation | P-1, V-2 |
| P-4 | Sources page | PDF drop zone; two-step upload with progress (PUT to presigned URL via XHR progress); source list polling job/source status; explicit states pending/uploading/uploaded/processing/ready/failed with actionable error text; delete | P-1, R-2, R-7 |
| P-5 | Plan page | "Create report plan" action; section list with type, order, status badge; "Generate" on the Introduction; disabled while a job is active; job progress from `GET /jobs/{id}` (no fake timers) | P-1, V-5, V-7 |
| P-6 | Section editor | Active version content in an editor (textarea/Markdown for slice 1); evidence drawer listing cited sources with page and excerpt; save edit → new version; approve (sends exact `version_id`); regenerate with instruction [P1]; status and version number always visible | P-1, V-7, V-8 |
| P-7 | Export page | Trigger DOCX export; job progress; warning listing unapproved sections; download via signed URL; export history | P-1, V-9 |
| P-8 | E2E happy path (Playwright) | Register → create project → upload golden PDF → plan → generate → edit → approve → export → file downloaded; runs against compose with `FakeProvider` | All of the above |

### 4.4 Claude / founder (continuous)

Contract freeze and OpenAPI drift check in CI; PR review for every PR (findings classified CRITICAL/HIGH/MEDIUM/LOW/SUGGESTION); weekly integration on the golden project; MEMORY.md and TASKS.md upkeep; ADR authoring.

---

## 5. Dependencies and parallel schedule

### 5.1 The four dependency-breakers

1. **Foundation migration `0001` includes `users`, `projects`, `jobs` and the ownership dependency.** Without it, R-2 waits on V-2. With it, both start day one.
2. **`LLMGateway` + `FakeProvider` in the scaffold.** R-5 embeds and V-7 generates in tests with no key and no network.
3. **`RetrievalService` protocol + `EvidenceItem` schema frozen in the scaffold.** Vinay codes V-7 against the interface with a fake; Rajeshwari implements it in R-6; they meet in week 4.
4. **MSW mocks generated from the frozen contract.** Priya builds every screen before any backend endpoint exists; integration is a base-URL switch.

### 5.2 Hard dependency graph

```text
F-1..F-10 (week 1)
 ├─ R-1 → R-2 ─────────────────────────────┐
 ├─ R-3 → R-4 → R-5 → R-6 → R-7 ───────────┤
 ├─ V-1, V-2, V-4 (independent)            │
 ├─ V-3, V-6 (independent)                 │
 ├─ V-2 → V-5 → V-7 ←(R-6 interface)───────┘
 │                └→ V-8 → V-9 (needs R-1 for upload)
 │                └→ V-10
 └─ P-1 → P-2..P-7 (mock) ─ integration as each backend task lands → P-8
```

### 5.3 Week-by-week

| Week | Rajeshwari | Vinay | Priya | Integration checkpoint |
|---|---|---|---|---|
| 1 | Env setup; read docs; R-1 | Env setup; read docs; V-1 | Env setup; P-1; P-2 (mock) | Scaffold merged; everyone runs `make up && make test` green |
| 2 | R-2, R-3 | V-2, V-4, V-3 | P-3, P-4 (mock) | Real login + create project + upload PDF to LocalStack S3 from the browser |
| 3 | R-4, R-5, R-6 | V-5, V-6, start V-7 | P-5, P-6 (mock); P-3/P-4 on real API | Golden PDF ingested to chunks; plan created; retrieval returns evidence with pages |
| 4 | R-7 hardening, isolation tests, R-8 | V-7 (real retrieval), V-8 | P-5/P-6 on real API; P-7 (mock) | Introduction generated from golden paper, cited, edited, approved in the browser |
| 5 | Golden regression tests; ingestion error UX support | V-9, V-10 | P-7 real; P-8 | **Slice 1 demo**: end to end on golden project; DOCX opens in Word |

Slack is deliberate: intern velocity is unknown. If week 5 slips, nothing is cut from P0; P1 items go first.

---

## 6. Contracts to freeze before parallel work (summary; full document is F-9)

### 6.1 Conventions

- Base path `/api/v1`. JSON everywhere. IDs are UUIDs. Timestamps ISO-8601 UTC.
- **Error envelope** (every non-2xx):
  ```json
  { "error": { "code": "SOURCE_TOO_LARGE", "message": "Human readable", "details": {} }, "request_id": "uuid" }
  ```
  Codes are stable strings the frontend switches on. 401 unauthenticated, 403 never used for ownership (return 404 to avoid existence leaks), 409 state conflict, 422 validation.
- **Async envelope** (HTTP 202):
  ```json
  { "job_id": "uuid", "job_type": "ingest_pdf", "status": "QUEUED", "resource_type": "source", "resource_id": "uuid", "status_url": "/api/v1/jobs/{job_id}" }
  ```
- Mutations that enqueue accept an optional `Idempotency-Key` header.

### 6.2 Enums (frozen)

| Enum | Values |
|---|---|
| `ReportType` | `PROJECT_REPORT`, `SEMINAR_REPORT` |
| `ProjectStatus` | `DRAFT`, `INGESTING`, `READY_FOR_PLANNING`, `PLAN_READY`, `GENERATING`, `IN_REVIEW`, `ALL_SECTIONS_APPROVED`, `COMPILING`, `COMPLETED`, `INGESTION_FAILED`, `GENERATION_FAILED`, `EXPORT_FAILED` |
| `SourceType` | `RESEARCH_PDF` (slice 1); designed now, built in slice 2+: `TEMPLATE`, `PAPER_LINK`, `SOURCE_CODE`, `SCREENSHOT` |
| `SourceStatus` additions for `PAPER_LINK` | `RESOLVING`, `NEEDS_UPLOAD` (verified metadata found, full text not open; user attaches the PDF under the same citation key) |
| `SourceStatus` | `UPLOAD_PENDING`, `UPLOADED`, `PROCESSING`, `READY`, `FAILED` |
| `SectionStatus` | `PLANNED`, `GENERATING`, `GENERATED`, `IN_REVIEW`, `APPROVED`, `REGENERATING`, `FAILED`, `NEEDS_INPUT` |
| `JobStatus` | `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `RETRYING` |
| `JobType` | `ingest_pdf`, `generate_section`, `export_docx` |
| `ErrorCategory` | `validation`, `provider_timeout`, `provider_rate_limit`, `malformed_input`, `parse_failure`, `citation_validation`, `internal` |
| `ExportFormat` / `ExportStatus` | `DOCX` / `QUEUED`, `RUNNING`, `READY`, `FAILED` |

### 6.3 Endpoints (slice 1)

| Method & path | Request | Response | Owner |
|---|---|---|---|
| `POST /auth/register` | `{email, password}` | 201 `User` + cookie | Vinay |
| `POST /auth/login` | `{email, password}` | 200 `User` + cookie | Vinay |
| `POST /auth/logout` | – | 204 | Vinay |
| `GET /auth/me` | – | `User {id, email, created_at}` | Vinay |
| `POST /projects` | `{report_type, title, topic, description?, target_pages?, college?, university?, citation_style?}` | 201 `Project` | Vinay |
| `GET /projects` | – | `{items: Project[]}` | Vinay |
| `GET /projects/{id}` / `PATCH` | partial fields, including `details` (institution, students[{name, usn}], guide, hod, principal, instructions, logo_asset_id) used by the compiler for front matter, never as model evidence | `Project {id, report_type, title, topic, description, target_pages, college, university, citation_style, status, created_at, updated_at}` | Vinay |
| `POST /projects/{id}/sources` | `{source_type, filename, mime_type, size_bytes}` | 201 `{source: Source, upload: {url, method: "PUT", headers, expires_at}}` | Rajeshwari |
| `POST /projects/{id}/sources/{sid}/complete` | – | 202 async envelope (`ingest_pdf`) | Rajeshwari |
| `GET /projects/{id}/sources` | – | `{items: Source[]}`; `Source {id, project_id, source_type, filename, mime_type, size_bytes, status, error?: {category, message}, document?: {title, authors, year, page_count}, chunk_count?, created_at}` | Rajeshwari |
| `DELETE /projects/{id}/sources/{sid}` | – | 204 | Rajeshwari |
| `POST /projects/{id}/assets` + `…/{aid}/complete` | `{asset_type: "LOGO", filename, mime_type, size_bytes}` | 201 `{asset, upload}`; project assets (logo) are not evidence and never enter retrieval. Slice 2+ but the upload pattern is identical to sources | Rajeshwari |
| `POST /projects/{id}/plan` | `{template_key?: "generic_engineering_project_report_v1"}` | 201 `ReportPlan {id, project_id, template_key, sections: SectionSummary[]}` (409 if already generating) | Vinay |
| `GET /projects/{id}/plan` | – | `ReportPlan` | Vinay |
| `GET /projects/{id}/sections` | – | `{items: SectionSummary[]}`; `SectionSummary {id, title, section_type, order_index, status, target_words, active_version_id?, approved_version_id?}` | Vinay |
| `GET /sections/{id}` | – | `SectionDetail = SectionSummary + {objective, active_version?: SectionVersion, versions: SectionVersionSummary[]}`; `SectionVersion {id, version_no, content, created_by: "ai" \| "user", model?, prompt_version?, evidence: EvidenceRef[], assumptions: string[], unresolved_questions: string[], created_at}`; `EvidenceRef {citation_key, chunk_id, source_id, source_title, page_start, page_end, excerpt}` | Vinay |
| `POST /sections/{id}/generate` | – | 202 async envelope (`generate_section`); 409 if active job | Vinay |
| `POST /sections/{id}/regenerate` | `{instruction?}` | 202 async envelope | Vinay [P1] |
| `PUT /sections/{id}/content` | `{content}` | 200 `SectionDetail` (new version, `IN_REVIEW`) | Vinay |
| `POST /sections/{id}/approve` | `{version_id}` | 200 `SectionDetail` (`APPROVED`); 409 if `version_id` ≠ active | Vinay |
| `POST /projects/{id}/exports` | `{format: "DOCX"}` | 202 async envelope (`export_docx`) | Vinay |
| `GET /projects/{id}/exports` | – | `{items: Export[]}`; `Export {id, format, status, warnings: string[], file_size?, created_at, completed_at?}` | Vinay |
| `GET /exports/{id}/download` | – | `{url, expires_at}` | Vinay |
| `GET /jobs/{id}` | – | `Job {id, project_id, job_type, status, resource_type, resource_id, attempt, error?: {category, message}, created_at, started_at?, completed_at?}` | Vinay |

### 6.4 Internal Python contracts (frozen in the scaffold)

```python
class LLMGateway(Protocol):
    def generate(self, req: GenerationRequest) -> GenerationResult: ...
    def generate_structured(self, req: GenerationRequest, schema: type[T]) -> StructuredResult[T]: ...
    def embed(self, texts: list[str], *, task: EmbeddingTask) -> EmbeddingResult: ...
# GenerationRequest carries task_class (routing key), system, user, max_tokens, metadata (project_id, job_id, prompt_name, prompt_version).
# Every result carries usage {provider, model, input_tokens, output_tokens, estimated_cost_inr, duration_ms}.

class RetrievalService(Protocol):
    def retrieve_evidence(self, project_id: UUID, query: str, *, k: int = 12,
                          source_types: list[SourceType] | None = None) -> list[EvidenceItem]: ...

class AgentInput(BaseModel):      # CLAUDE.md §17, arch doc §8.2
    project_id: UUID; section_id: UUID; section_title: str; section_type: str; section_objective: str
    project_summary: str; evidence: list[EvidenceItem]; approved_previous_sections: list[ApprovedSectionSummary]
    target_word_count: int | None; citation_style: str | None; formatting_requirements: dict; user_instructions: str | None

class AgentOutput(BaseModel):     # CLAUDE.md §18
    content: str                  # constrained Markdown; citations as [@S1]
    evidence_refs: list[str]      # citation keys actually used — must be a subset of input keys
    assumptions: list[str]; unresolved_questions: list[str]; confidence_score: float | None

class StorageAdapter(Protocol):
    def presign_put(self, key: str, *, content_type: str, size: int, expires_s: int) -> PresignedUpload: ...
    def presign_get(self, key: str, *, expires_s: int) -> str: ...
    def head(self, key: str) -> ObjectInfo | None: ...
    def delete(self, key: str) -> None: ...
```

**Content format decision:** section content is a Markdown string using a documented subset (paragraphs, `##`/`###`, `-` lists, `[@key]` citations). Block-structured content (arch doc `content_blocks[]`) is deferred; the compiler is the only consumer and can be swapped later.

---

## 7. First Architecture Decision Records

Written to `docs/decisions/` on approval. Status "Accepted" where the source documents already agree; "Proposed" where this plan resolves a conflict.

| ADR | Title | Status | Key content |
|---|---|---|---|
| ADR-001 | Modular monolith with asynchronous workers | Accepted (from CLAUDE.md §7, arch §20) | One FastAPI codebase, module boundaries, extraction only with a new ADR |
| ADR-002 | PostgreSQL + pgvector as system of record and vector store; sync SQLAlchemy 2 + psycopg | Accepted + proposed detail | Fixed embedding dimension in migration; project-scoped retrieval invariant; sync session shared by API and workers (simpler for interns; async deferred) |
| ADR-003 | Celery + Redis for background jobs | Accepted | Queues `ingestion`/`generation`/`export`; job state machine; retry classification; Redis locks per section |
| ADR-004 | Direct-to-object-storage uploads via presigned URLs; LocalStack (S3 service) for local dev | Accepted + resolves endpoint naming | Two-step `sources` flow; allowlists; key scheme; no file bytes through the API |
| ADR-005 | Centralised LLM gateway, provider choice, and routing policy | Proposed | See §8; structured outputs via Pydantic; cost recorded per call; provider SDK confined to `ai/providers/` |
| ADR-006 | Section and project lifecycle state machines | Proposed (resolves CLAUDE.md vs arch doc) | State names from CLAUDE.md, semantics from arch doc; version-specific approval; legal transitions table |
| ADR-007 | Deterministic document compiler; constrained Markdown + citation tokens as the content format | Proposed | python-docx; no LLM formatting; validation gate; PDF via LibreOffice later |
| ADR-008 | Frontend stack and auth transport | Proposed | Next.js App Router + TS, TanStack Query, generated OpenAPI client, same-origin proxy, httpOnly cookie JWT, MSW for contract mocks |
| ADR-009 | No agent framework; workers are application services with Pydantic contracts | Accepted (CLAUDE.md §51) | Decision criteria for ever revisiting |
| ADR-010 | Uploaded source code is never executed | Accepted (CLAUDE.md §12) | Recorded now although code upload is a later slice, so nobody designs around execution |
| ADR-011 | Prompt management and prompt-injection boundary | Accepted (CLAUDE.md §24–25) | Versioned prompt files; untrusted-data delimiters; trust hierarchy; prompt version stored on every version |
| ADR-012 | First-party email/password auth for MVP | Proposed | Argon2, short-lived JWT cookie; third-party auth (Clerk/Auth0/Google) deferred until pilot feedback |

---

## 8. Decisions needed from the project owner

Stated with my recommendation; I will proceed on the recommendation unless you say otherwise.

| # | Decision | Recommendation |
|---|---|---|
| D-1 | Repo location and hosting | Move out of iCloud; GitHub private repo; `main` protected |
| D-2 | Claude builds the week-1 scaffold (§3) | Yes |
| D-3 | Generation provider and routing | Anthropic via the official Python SDK. One model, `claude-opus-5` (USD 5 / 25 per MTok as of 2026-06), with **effort as the routing lever**: `low` for metadata/classification, `medium` for section drafting, `high` for planning and consistency later. This satisfies CLAUDE.md §23 tiering with one cache namespace and one integration to test. Add `claude-haiku-4-5` only if telemetry shows a route where it holds quality. Enable server-side refusal fallbacks. Re-verify prices at implementation time. |
| D-4 | Embeddings provider | Anthropic has no embeddings endpoint. Choose one and fix the vector dimension in migration `0003`: Voyage AI (Anthropic's recommended partner) or OpenAI `text-embedding-3-small`. Recommendation: Voyage; both sit behind `gateway.embed()` so switching later is a re-embed job, not a rewrite. |
| D-5 | Golden project | Slice 1 uses one CC-BY open-access paper. **You supply one real student project (papers + college template + code + screenshots) by week 3** for slices 2+. |
| D-6 | Package managers | `uv` for Python, `npm` for frontend (no extra installs for interns) |
| D-7 | Section content format | Constrained Markdown with `[@key]` citations (§6.4) |

---

## 9. Risks specific to this plan

| Risk | Mitigation |
|---|---|
| Interns block on each other despite the plan | Interfaces and fakes in the scaffold; weekly integration checkpoint is a hard calendar event, not "when ready" |
| Frontend drifts from backend | OpenAPI snapshot committed; CI fails on undocumented contract change; MSW mocks regenerated from the snapshot |
| Retrieval quality on one paper is poor and the Introduction is generic | Prompt requires `[@key]` on factual claims; citation gate rejects unsupported keys; `assumptions`/`unresolved_questions` shown in the UI so the user sees what the model did not know |
| LLM cost during development | `FakeProvider` in tests; real provider only behind an env flag; per-call cost logged from day one |
| Foundation quality debt | Founder reviews the scaffold PR before any intern branches from it |

---

## 10. What happens on approval

1. Apply §0.1 housekeeping (with your confirmation of the target path).
2. Write ADR-001…012 and `docs/api/api-contracts-v1.md`.
3. Build the scaffold (F-1…F-10) as one reviewed PR.
4. Update `MEMORY.md` (replace "Next Priorities" with slice-1 state, record all decisions) and create `TASKS.md` with the R/V/P tasks in `Ready`.
5. Interns branch `feature/<name>/<task>` from `develop` and begin week 1.

---

## Change log

| Date | Change |
|---|---|
| 2026-10-06 | Rajeshwari has left the team. Every task in §4.1 (R-1..R-8) and the "R" owner in §6.3 is unowned until the founder decides reallocation (see `docs/reviews/2026-10-05-board-and-api-contract-review.md` and the 2026-10-06 options note below). Slice-2+ knowledge intelligence (template parsing, code analysis, screenshot analysis) also needs a named owner before those slices are planned. |
| 2026-10-12 | **Founder decision:** local object storage is **LocalStack (S3 service)** instead of MinIO. Same S3 API and presigned flow; production remains AWS S3 or any S3-compatible service. ADR-004 updated accordingly. |
| 2026-10-06 | **Founder decision:** two-person team. Vinay owns the whole backend (former R-1..R-8 plus V-1..V-10). Priya owns the frontend. Task IDs are unchanged; only ownership and sequence change. See §11. |

## 11. Two-person team: resequenced slice-1 schedule (2026-10-06)

With one backend developer, the backend must be built **along the vertical slice**, not layer by layer. Each week ends with something the frontend can integrate against for real.

| Week | Vinay (backend) | Priya (frontend) | Integration checkpoint |
|---|---|---|---|
| 1 | Foundation (INTERNSHIP-16 trimmed per review §2.3) · V-1 auth (cookie session) · V-2 projects with `details` | P-1 mock-first client from the frozen contract · P-2 auth · P-3 projects + new project (on mocks) | Login, create project, save report details against the real API |
| 2 | V-4 jobs framework · R-1 storage adapter (LocalStack S3) · R-2 sources endpoints (create / complete / list / delete) | P-4 sources screen (on mocks, then real) · setup screen | PDF reaches LocalStack S3 from the browser; job row visible via `GET /jobs/{id}` |
| 3 | R-3 extraction · R-4 chunking · R-5 embeddings (FakeProvider) · R-7 ingestion task | P-5 plan screen (on mocks) · polish states on sources | Golden PDF ingested to chunks; source shows READY with metadata |
| 4 | V-3 real gateway provider · V-6 prompts · V-5 deterministic planner · R-6 retrieval with isolation test | P-6 chapter editor (on mocks) | Plan created on the real API; retrieval returns evidence with page numbers |
| 5 | V-7 Introduction worker with citation gate · V-8 review endpoints (edit, approve) | P-6 on real API · P-7 export (on mocks) | Introduction generated, edited and approved in the browser |
| 6 | V-9 DOCX export · V-10 telemetry · regenerate (P1) | P-7 on real API · P-8 E2E happy path | **Slice 1 demo** on the golden project |

Compared with the three-person plan this adds one week and moves the demo to week 6. Two levers keep it from slipping further:

1. **Claude builds the foundation scaffold (§3)** before week 1, so Vinay starts on auth, not on compose files. Without this, add a week.
2. **Priya never waits on the backend.** Every screen is built on MSW mocks generated from the frozen contract and switched to the real API when the week's checkpoint lands.

Slice 2+ knowledge intelligence (template parsing, code analysis, screenshot analysis) has no owner yet. That decision is needed before slice 2 is planned, not before slice 1 starts.
