# Review: Plane board and interns' API contract

| | |
|---|---|
| Date | 2026-10-05 |
| Reviewer | Claude (CTO / reviewer role) |
| Inputs | Plane project "Internship" (18 tickets, fetched via API), `AI_Academic_Report_Generation_Platform_Complete_API_Contract.pdf` (17 pages) |
| Compared against | CLAUDE.md, Technical Architecture v1, `docs/planning/2026-09-15-initial-repository-plan.md` §4–§6, Slice One Walkthrough contract panels |
| Severity scale | CRITICAL · HIGH · MEDIUM · LOW · SUGGESTION (CLAUDE.md §41) |

## 1. Verdict

**Understanding: good. Execution plan: not yet buildable.** The interns have absorbed the key ideas: owner-scoped queries, cookie sessions, idempotent create, the facts-versus-evidence boundary, version-specific approval, citation validation, signed download URLs. That is exactly what the exercise was meant to test, and they passed it.

Two things block starting parallel development:

1. **The board covers roughly a third of slice 1.** There are zero tickets for the knowledge layer (storage, sources, PDF ingestion, chunking, embeddings, retrieval) and zero backend tickets after project CRUD (jobs, gateway, planner, generation, review, export). The frontend is ticketed end to end but sequentially, finishing 10 November with no intermediate demo.
2. **The contract PDF is two documents stitched together** and contradicts itself on the shapes every screen depends on: five different job/async shapes, three different error shapes, two shapes for the same project resource, two sets of section statuses. Vinay's tickets then contradict the PDF on auth and project creation. Nobody can code against it until one shape is chosen for each.

Neither is a quality problem with the people. Both are reconciliation work that should happen in one session before any more tickets are written.

## 2. Board review

### 2.1 Coverage against the slice-1 plan

| Plan area (owner) | Tickets on board | Gap |
|---|---|---|
| Foundation (F-1..F-10) | INTERNSHIP-16 (Vinay) | Missing: object storage in compose, pgvector extension, jobs table + base task, gateway interface + fake provider, storage adapter, `.env.example`, CI, lint/type tooling, golden fixture |
| Auth, projects (V-1, V-2) | INTERNSHIP-17, 18 | Present; contract conflicts (see §2.3) |
| Jobs, gateway, prompts, planner, generation, review, export, telemetry (V-3..V-10) | none | **Entire generation chain unticketed** |
| Storage, sources, extraction, chunking, embeddings, retrieval, ingestion task (R-1..R-8) | none | **Entire knowledge layer unticketed.** Rajeshwari has no product ticket at all |
| Frontend (P-1..P-8) | INTERNSHIP-4..15 | Present; missing MSW/mock-first task (P-1) and the per-ticket contract references |
| Golden project fixture | none | Missing |
| Onboarding (FastAPI basics, booking microservice, mentoring) | INTERNSHIP-1..3 | Done; not product work |

### 2.2 Structural findings

| Sev | Finding | Fix |
|---|---|---|
| HIGH | No vertical-slice milestone. Frontend runs screen by screen to 10 Nov; backend stops at project CRUD on 8 Oct. The first end-to-end demo has no date. | Add a cycle "Slice 1" with a demo date and pull the minimum from each lane into it (see §4). |
| HIGH | Frontend tickets 5–14 each list "Prerequisite task: previous ticket" and "Backend … APIs" as blockers. That makes the frontend serial and blocked on the backend. | Add the mock-first task (MSW handlers from the frozen contract). Then screens depend only on the contract, and the only real ordering is auth → everything else. |
| MEDIUM | No labels, modules, cycles, estimates or parent/child links. Owners are the only structure. | Labels `slice-1` / `slice-2+`, `frontend` / `backend-knowledge` / `backend-generation`; one module per plan area; one cycle per slice. |
| MEDIUM | Backend tickets are 87–124 numbered micro-steps ("Create the backend root directory"). They read as AI-generated checklists. Risk: optimising for ticked boxes over working software, and nobody will update 124 checkboxes. | Keep Objective, Contract, Acceptance Criteria, Dependencies. Collapse steps to 6–10 meaningful tasks each. |
| MEDIUM | Testing is a single ticket at the end (INTERNSHIP-15). CLAUDE.md §38–39 make tests part of every ticket's Definition of Done. | Delete 15 as a phase; keep an E2E ticket (P-8) that only runs after integration. |
| LOW | Dates slipped: INTERNSHIP-4 (target 1 Oct) and 16 (target 2 Oct) are still In Progress on 5 Oct; 5 and 17 are past their start dates in Backlog. | Re-baseline after the reconciliation session rather than now. |
| LOW | Descriptions contain "Pasted text" artefacts. | Clean up. |

### 2.3 Ticket-level findings

**INTERNSHIP-16 Backend foundation (Vinay)**
- HIGH: no object storage (LocalStack S3) in compose, so the presigned upload flow in the contract cannot be developed locally.
- HIGH: pgvector is listed but no step enables the extension or fixes the embedding dimension; Rajeshwari's work depends on it.
- MEDIUM: "common utilities module" (step 17) is exactly what CLAUDE.md §26 forbids. Replace with `core/` (config, logging, security, exceptions) and module-local code.
- MEDIUM: logging is "centralised" but not structured; no request ID. CLAUDE.md §36 requires structured logs with request/project/job IDs.
- MEDIUM: no `jobs` table or base Celery task. Both backend lanes and the frontend poll `GET /jobs/{id}`; it must exist in the foundation.
- LOW: no `.env.example`, lockfile, ruff/mypy, CI.

**INTERNSHIP-17 Auth (Vinay)**
- CRITICAL (contract): login returns `{"access_token","token_type":"bearer"}`. The PDF (Frame 01) and Priya's INTERNSHIP-5 specify cookie session auth. Backend and frontend would not interoperate. Pick cookie session (ADR-012) and delete the bearer example.
- MEDIUM: no login rate limit; no statement that ownership failures return 404, not 403.
- SUGGESTION: the PDF's server-side `sessions` table is a good call. It makes logout a real revocation. Adopt it instead of stateless JWT.

**INTERNSHIP-18 Projects (Vinay)**
- CRITICAL (contract): create body is `{name, description}` with a `state` field. The PDF and the walkthrough use `{report_type, title, topic, description, target_pages, citation_style}` with `status`. Same resource, two schemas.
- HIGH (architecture): `PATCH /projects/{id}/state` lets the client set project state. Project state is derived by the backend from events (sources READY, plan created, sections approved, export done). A client-settable state invites the frontend to carry business logic, which CLAUDE.md §42 forbids. Remove the endpoint; keep the state machine as an internal service.
- HIGH (contract): introduces a `project_requirements` table with three `/requirements` endpoints. The PDF models the same data as `details` on `PATCH /projects/{id}`. One or the other. Recommendation: `details` JSONB on the project, no separate resource, because the compiler reads it as one object and it is never queried on its own.
- MEDIUM: "Implement pagination if required." The PDF already specifies `page`, `page_size`, `total`. It is required.

**INTERNSHIP-4..15 Frontend (Priya)**
- HIGH (stack decision): React + Vite + React Router instead of Next.js (proposed ADR-008). Acceptable under CLAUDE.md §8 ("React or Next.js") and simpler for a cookie-authenticated SPA behind a dev proxy. Record it as the decision in ADR-008 so it stops being implicit. Work has already started on it (ticket 4 in progress).
- HIGH: INTERNSHIP-11 Tiptap rich-text editor in slice 1. The content contract is constrained Markdown with `[@S1]` citation tokens (ADR-007). A rich-text editor stores HTML or its own JSON and will mangle the tokens unless a Markdown round-trip and token-preservation layer is built. Two days are budgeted. Move to slice 2+ with the explicit requirement "serialises to the Markdown subset, preserves citation and figure markers"; slice 1 uses a Markdown textarea with preview.
- MEDIUM: INTERNSHIP-10 adds Zustand for "section state management". Server state belongs in TanStack Query (CLAUDE.md §32). Zustand only for genuinely local UI state, if at all. Remove from the ticket until a need is shown.
- MEDIUM: INTERNSHIP-12 says "Integrate evidence retrieval API". There is no frontend-facing retrieval API. Evidence arrives on the section version (`active_version.evidence[]`). Retrieval is internal to the generation worker and must stay there (project scoping, cost). Reword to "render evidence from the section response".
- MEDIUM: INTERNSHIP-10 "Generate, Approve and Revise actions". "Revise" is undefined. The contract has Edit (new version) and Regenerate with instruction (job). Name them.
- MEDIUM: acceptance criteria are generic ("loading, empty and error states work"). Each screen ticket should list its states and error codes from the walkthrough panel, e.g. Sources: pending / uploading / uploaded / processing / ready / failed / resolving / needs-upload; errors `UNSUPPORTED_TYPE`, `SOURCE_TOO_LARGE`, `parse_failure`.
- LOW: INTERNSHIP-9 "AI generated report structure" and "plan generation state". In slice 1 the planner is deterministic and synchronous (201). Wording should not promise async AI planning.
- SUGGESTION: good that INTERNSHIP-8 includes retry handling and INTERNSHIP-14 includes retry and download handling.

## 3. API contract PDF review

### 3.1 What is right

- Frames 01–05 match the walkthrough contract closely and add useful backend-owned detail: paginated project list, `source_counts`, `sections_approved/total`, `Idempotency-Key` persistence rules, students "replaced as a whole, never normalised", `IMAGE_TOO_SMALL`, the `attach-pdf` flow for paywalled links, `can_continue_to_plan` readiness on sources.
- Modules 6–8 keep version-specific approval (`VERSION_NOT_ACTIVE`), `UNKNOWN_CITATION` on save, the export rule (approved versions only, warnings for the rest), `NOTHING_APPROVED`, a signed download URL with expiry, and an output-validation failure code.
- The data boundary statement in Frame 04 ("students, guide, HOD, principal and logo are report metadata, not evidence") is exactly the rule that matters most for grounding.

### 3.2 Blocking inconsistencies (must be fixed before freeze)

| # | Sev | Inconsistency | Where | Decision |
|---|---|---|---|---|
| C1 | CRITICAL | **Job / async shape appears five ways**: `{id,type,status,progress:65,step,source_id}` (Frame 05); `{job_id,status,message}` (6.5); `{job_id,job_type,status,progress:{current_step},section_id}` (6.6); `{job_id,status,export_type,message}` (8.4); `{job_id,type,status,progress:{current_step,completed,total}}` (8.5) | 05, 6.5, 6.6, 8.4, 8.5 | One **202 envelope** `{job_id, job_type, status, resource_type, resource_id, status_url}` and one **Job** `{id, project_id, job_type, status, progress:{step, completed, total}, resource_type, resource_id, attempt, error:{category,message}|null, created_at, started_at, completed_at}` |
| C2 | CRITICAL | **Error shape appears three ways**: `{"error":{"code","message","fields"}}` (Frame 03); `{"detail":"..."}` (6.1, 6.3); `{"error":"NO_EVIDENCE","detail":...}` and `{"error":"NOTHING_APPROVED","message":...}` (6.3, 6.5, 8.4) | 03, 6.x, 7.x, 8.4 | One envelope `{"error":{"code","message","details":{"fields":{...}}},"request_id"}`. Disable FastAPI's default `detail` body with a global exception handler |
| C3 | CRITICAL | **Project resource has two shapes**: nested `details.institution / students / guide` (Frame 04) vs flat `name, university, college, guide_name, logo_url, students` (8.1) | 04 vs 8.1 | Nested `details`. `logo_url` becomes `logo_asset_id` plus a signed URL endpoint |
| C4 | HIGH | **Project state machine** `DRAFT → SETUP → SOURCES → PLAN_READY → IN_REVIEW → COMPLETED` (Frame 02). SETUP and SOURCES are UI steps, not states; INGESTING, GENERATING, COMPILING and failure states are missing | 02 | Use the architecture doc machine (walkthrough → State machines). State is derived by the backend, never set by the client |
| C5 | HIGH | **Section statuses** listed as `PLANNED, GENERATING, GENERATED, FAILED` (6.2) but 7.x uses `IN_REVIEW`, `APPROVED` and regenerate implies `REGENERATING` | 6.2 vs 7.x | Full enum from ADR-006 in one place |
| C6 | HIGH | **Evidence item** `{key, source_id, page, passage}` (7.1) cannot render the evidence pane (no title, excerpt, page range, chunk id) | 7.1 | `{citation_key, chunk_id, source_id, source_title, page_start, page_end, excerpt}` |
| C7 | HIGH | **Direct storage paths** `file_url: "storage/figures/login.png"` (7.2) and `logo_url: "/files/logo.png"` (8.1) violate the signed-URL rule | 7.2, 8.1 | Return asset ids; `GET /assets/{id}/url` → `{url, expires_at}` |
| C8 | MEDIUM | `report_type` is `FINAL_YEAR_PROJECT` in one example (Frame 02) and `PROJECT_REPORT | SEMINAR_REPORT` in the enum (Frame 03) | 02 vs 03 | Enum wins |
| C9 | MEDIUM | `source_counts` keys `papers, documents, web_sources` do not match source types `PAPER, PAPER_LINK, COLLEGE_FORMAT, SOURCE_CODE, SCREENSHOT` | 02 vs 05 | Count by source type |
| C10 | MEDIUM | Collections are bare arrays in 6.2, 7.2, 8.2, 8.3 but `{items, page, page_size, total}` in Frame 02 | several | Always `{items: [...]}`; add paging fields where lists can grow |
| C11 | MEDIUM | `PATCH /plan` returns `{"message": "..."}` (6.4) | 6.4 | Return the updated plan. Message-only responses force a second call |
| C12 | MEDIUM | `cost: 0.83` has no unit (7.1) | 7.1 | `estimated_cost_inr`; also record `provider` and `model` |
| C13 | MEDIUM | `NO_EVIDENCE` raised on plan creation (6.3). The slice-1 planner is deterministic from the template and needs no evidence | 6.3 | Move `NO_EVIDENCE` to generate only (it is already there in 6.5) |
| C14 | LOW | `target_pages` 10–500 and `citation_style` adds MLA (Frame 03) vs plan 10–300, IEEE/APA | 03 | Founder decision; either is fine, pick one |
| C15 | LOW | Final review module (`/final-review`, findings, dismiss) is absent although the flow and Priya's INTERNSHIP-13 include it | — | Add as slice 2+ section so the frontend ticket has something to reference |
| C16 | LOW | Title says "Academic Report Generation Platform". CLAUDE.md §3 and PRD §3 explicitly reject "report generator" positioning | cover | Rename to the working product name |

### 3.3 Cross-document conflicts (PDF vs tickets)

| Sev | Conflict |
|---|---|
| CRITICAL | Auth: PDF cookie session vs INTERNSHIP-17 bearer token response |
| CRITICAL | Project create: PDF `{report_type,title,topic,…}` vs INTERNSHIP-18 `{name,description}` |
| HIGH | Report details: PDF `PATCH /projects/{id} {details}` vs INTERNSHIP-18 `/requirements` sub-resource |
| HIGH | Project state: PDF derived states vs INTERNSHIP-18 `PATCH /projects/{id}/state` |
| MEDIUM | Section editing: PDF Markdown `content` string with `[@S1]` tokens vs INTERNSHIP-11 Tiptap rich text |

### 3.4 Decisions this review hands to the founder

| # | Decision | Recommendation |
|---|---|---|
| D-A | Frontend stack: React + Vite + React Router (as started) vs Next.js | Accept Vite. Record in ADR-008. |
| D-B | Session mechanism: server-side session table (PDF) vs stateless JWT cookie | Accept server-side sessions. Record in ADR-012. |
| D-C | Source type enum names: `PAPER / PAPER_LINK / COLLEGE_FORMAT / SOURCE_CODE / SCREENSHOT` (PDF) vs `RESEARCH_PDF / PAPER_LINK / TEMPLATE / …` (plan) | Accept the PDF's names; they read better. Update the plan. |
| D-D | `target_pages` range and citation styles | 10–300; IEEE and APA only for MVP |
| D-E | Who reconciles the contract | One 90-minute session: Vinay, Priya, Rajeshwari, founder, Claude. Output is `docs/api/api-contracts-v1.md` plus an OpenAPI snapshot. Nothing is "frozen" until it is in that file. |

## 4. Recommended next steps, in order

1. **Reconciliation session** on C1–C7 and the five cross-document conflicts. Everything else can be fixed by one author afterwards.
2. **Freeze** `docs/api/api-contracts-v1.md` and commit an OpenAPI snapshot the frontend mocks are generated from.
3. **Rewrite the board around slice 1**:
   - Cycle "Slice 1" with a demo date.
   - Rajeshwari: R-1 storage adapter, R-2 sources, R-3 extraction, R-4 chunking, R-5 embeddings, R-6 retrieval, R-7 ingestion task (from the plan §4.1).
   - Vinay: trim 16–18 per §2.3; add V-3 gateway, V-4 jobs, V-5 planner, V-6 prompts, V-7 introduction worker, V-8 review, V-9 export, V-10 telemetry.
   - Priya: add P-1 mock-first client; rewrite 10–12 per §2.3; move 11 (Tiptap) and 13 (final review) to slice 2+; delete 15 as a phase.
   - Labels, modules, estimates on every ticket.
4. **Foundation scaffold** (plan §3) merged before interns branch feature work, so the shared pieces (jobs table, gateway interface, storage adapter, compose with LocalStack S3 and pgvector) exist once.
5. Re-baseline dates after steps 1–4.

Claude can create the missing tickets and labels in Plane from the plan's task tables on request; this review deliberately changed nothing on the board.

---

## Appendix A (2026-10-06): ticket-by-ticket fixes

Board re-fetched 2026-10-06; no ticket content changed since the review. Ownership now: Vinay = all backend, Priya = frontend.

| Ticket | What is wrong | What to change |
|---|---|---|
| 1, 2, 3 Onboarding | Done. Ticket 1 title is truncated and prefixed "Title:". Mixed into the product backlog. | Fix title; move all three to an "Onboarding" module or archive so the product board is clean. |
| 4 Layout & navigation (Priya, overdue) | Nav is "Dashboard, Projects" (same screen twice). No project-scoped navigation. No jobs tray. Prerequisite "Frontend Project Foundation" does not exist on the board. | Shell = Projects list + project-scoped six-step nav (Setup, Sources, Plan, Chapters, Final review, Export) with done / current / locked glyphs driven by backend state; jobs tray in the header. Create the missing foundation ticket P-1: API client generated from the OpenAPI snapshot, TanStack Query setup, MSW mocks for every contract endpoint. Re-date. |
| 5 Sign in | Sign-in only; register missing. Blocked on "Backend authentication APIs". Errors generic. | Add register. Build on mocks, not on the backend. Call `GET /auth/me` on app load. Name the codes: `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, 422 field errors, 429 too many attempts. |
| 6 Dashboard | "Project summary and recent projects" undefined. Card data source unspecified. | Rename "Projects". Card renders only list fields: status pill, `sections_approved/total` progress, `source_counts`, `updated_at`; no extra calls. Primary action by status (DRAFT → Setup, PLAN_READY/IN_REVIEW → Plan, COMPLETED → Export). Paging, empty, loading, error. |
| 7 New project + Setup | Fields unspecified. Setup content missing: institution, students array, guide/HOD/principal, writer instructions, logo. No idempotency. | Enumerate fields and 422 codes. `Idempotency-Key` on create; 201 → redirect to Setup. Logo = three-step presigned upload. "Missing for cover page" warnings per field. Tag logo/students UI Slice 2+ but buildable on mocks. |
| 8 Sources | "Required source/file types" vague. Upload flow unspecified. States generic. | Five categories (format, papers incl. paste-a-link, code, screenshots). Two-step upload: create → browser PUT with progress → complete → poll job. States: pending, uploading, uploaded, processing, ready, failed, resolving, needs-upload. Continue gated by `can_continue_to_plan`. Template library picker. Error codes from contract. |
| 9 Plan review | Promises "AI generated structure" and async "plan generation state". Slice-1 planner is deterministic and synchronous (201). Front matter missing. | Reword. Add front-matter rows (AUTO except Abstract). Generate button per section → 202, disable others while a job runs, handle 409 CONFLICT and NO_EVIDENCE. |
| 10 Workspace | Zustand for server state. "Revise" undefined. Overlaps 11 and 12. | Remove Zustand (TanStack Query owns server state). Actions are Edit (new version → IN_REVIEW), Approve (`version_id`, handle `VERSION_NOT_ACTIVE`), Regenerate (instruction → job). Merge 10, 11, 12 into one "Chapter editor" ticket: toolbar, document view, evidence pane. |
| 11 Tiptap editor | Rich text conflicts with constrained Markdown + `[@S1]` tokens. Two days budgeted. | Slice 1: Markdown textarea with preview; reject unknown tokens on save (`UNKNOWN_CITATION`). Move Tiptap to Slice 2+ with the requirement "serialises to the Markdown subset and preserves citation and figure markers". |
| 12 Evidence panel | "Evidence retrieval API" does not exist for the frontend; retrieval is internal to the worker. | Render `active_version.evidence[]` from the section response. Tabs: Cited, Available, Versions (model, prompt version, tokens, cost). Fold into the editor ticket. |
| 13 Final review | Slice 2+. No backend contract exists yet (PDF omits it). "QA/proofreader APIs" undefined. | Tag Slice 2+. Blocked on contract item C15. Keep the ticket, remove it from the slice-1 chain. |
| 14 Export | Missing: included / left-out summary, warnings, cover preview, export history, signed URL fetched at click, `NOTHING_APPROVED` handling. PDF not tagged. | Add all of the above. DOCX Slice 1, PDF Slice 2+. |
| 15 Testing phase | Testing as a final phase contradicts the Definition of Done. | Delete as a phase. Each ticket's AC includes its unit/component tests. Replace with P-8: Playwright happy path on the golden project, after integration. |
| 16 Backend foundation (Vinay, overdue) | 87 micro-steps. Missing: LocalStack S3 in compose, pgvector extension + fixed dimension, `jobs` table + base Celery task, storage adapter, structured logging with request id, `.env.example`, lockfile, ruff/mypy, CI, golden fixture. "Common utilities module" violates CLAUDE.md §26. | Collapse to 8–10 outcome tasks. Add the missing items; now that Vinay owns ingestion, jobs and storage belong here. Replace utilities with `core/`. Or accept the Claude scaffold and convert this ticket to "review, run and own the scaffold". |
| 17 Auth | Login returns a bearer token; contract and ticket 5 use a cookie session. No sessions table. No rate limit. 403 vs 404 unstated. | Cookie session (HttpOnly, Secure, SameSite=Lax) backed by a `sessions` table so logout revokes. Rate-limit login. Ownership failures return 404. `/auth/me` returns id, email, created_at. |
| 18 Projects | Create body `{name, description}`; field `state`. Client-settable `PATCH /state`. `/requirements` sub-resource duplicates `details`. Pagination "if required". | Body `{report_type, title, topic, description, target_pages, citation_style}`; field `status`. Remove the state endpoint; state is derived server-side. Replace requirements with `details` JSONB on `PATCH /projects/{id}`. Pagination required. `Idempotency-Key`. Optional soft delete per PDF. |

**Tickets that do not exist and must be created (all Vinay unless noted):** V-4 jobs framework · R-1 storage adapter · R-2 sources endpoints · R-3 PDF extraction · R-4 chunking · R-5 embeddings · R-7 ingestion task · R-6 retrieval with isolation test · V-3 gateway provider · V-6 prompts · V-5 planner · V-7 Introduction worker · V-8 review endpoints · V-9 DOCX export · V-10 telemetry · golden fixture · P-1 mock-first client (Priya) · P-8 E2E (Priya). Sequence per plan §11.

**Board hygiene:** labels `slice-1` / `slice-2+`, `frontend` / `backend`; a "Slice 1" cycle with the week-6 demo date; estimates; remove `rsabnis174` from the project.
