# API Contract v1 — frozen 2026-10-06

Single source of truth for frontend and backend. Every Plane ticket references this file. A change here is a pull request reviewed by both lanes, never a verbal agreement. Resolutions of the 2026-10-05 review (items C1–C16) are applied.

## 1. Conventions

- Base path `/api/v1`, same origin as the frontend (dev proxy). JSON. UUIDs. ISO-8601 UTC timestamps.
- Session: HttpOnly, Secure, SameSite=Lax cookie `session_id`, backed by a `sessions` table. The browser never handles a token.
- Ownership: every project-scoped query filters by the authenticated user. A resource the user does not own returns **404**, never 403.
- Lists: always `{"items": [...], "page": 1, "page_size": 20, "total": n}`.
- Mutations that may be retried accept `Idempotency-Key`; the backend stores key + user + request hash + response for 24 h and replays the stored response.

### 1.1 Error envelope (every non-2xx)

```json
{ "error": { "code": "SOURCE_TOO_LARGE", "message": "PDF files must be 25 MB or smaller.",
             "details": { "max_bytes": 26214400, "fields": { "title": "Project title is required." } } },
  "request_id": "0191c…" }
```

`code` is a stable UPPER_SNAKE string. 401 `UNAUTHENTICATED`, 404 `NOT_FOUND`, 409 state conflicts (named codes below), 422 `VALIDATION_ERROR` with `details.fields`, 429 `RATE_LIMITED`, 500 `INTERNAL_ERROR`. FastAPI's default `{"detail": …}` body is disabled by a global handler.

### 1.2 Async envelope (HTTP 202) and Job

```json
{ "job_id": "…", "job_type": "ingest_pdf", "status": "QUEUED",
  "resource_type": "source", "resource_id": "…", "status_url": "/api/v1/jobs/{job_id}" }
```

```json
{ "id": "…", "project_id": "…", "job_type": "ingest_pdf", "status": "RUNNING",
  "progress": { "step": "EXTRACTING_TEXT", "completed": 1, "total": 4 },
  "resource_type": "source", "resource_id": "…", "attempt": 1,
  "error": null, "created_at": "…", "started_at": "…", "completed_at": null }
```

`error` when FAILED: `{ "category": "parse_failure", "message": "…" }`. Clients poll `status_url` every 2 s while QUEUED or RUNNING, then re-fetch the resource. Never set resource state client-side.

## 2. Enums

| Enum | Values |
|---|---|
| `ReportType` | `PROJECT_REPORT`, `SEMINAR_REPORT` |
| `CitationStyle` | `IEEE`, `APA` |
| `ProjectStatus` (derived server-side, never set by client) | `DRAFT`, `INGESTING`, `READY_FOR_PLANNING`, `PLAN_READY`, `GENERATING`, `IN_REVIEW`, `ALL_SECTIONS_APPROVED`, `QUALITY_REVIEW`, `COMPILING`, `COMPLETED`, `INGESTION_FAILED`, `GENERATION_FAILED`, `EXPORT_FAILED` |
| `SourceType` | `PAPER` (slice 1), `PAPER_LINK`, `COLLEGE_FORMAT`, `SOURCE_CODE`, `SCREENSHOT` |
| `SourceStatus` | `UPLOAD_PENDING`, `UPLOADED`, `PROCESSING`, `READY`, `FAILED`; links add `RESOLVING`, `NEEDS_UPLOAD` |
| `SectionStatus` | `PLANNED`, `GENERATING`, `GENERATED`, `IN_REVIEW`, `APPROVED`, `REGENERATING`, `FAILED`, `NEEDS_INPUT` |
| `JobStatus` | `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `RETRYING` |
| `JobType` | `ingest_pdf`, `resolve_link`, `parse_template`, `analyze_code`, `analyze_screenshot`, `generate_section`, `final_review`, `export_docx`, `export_pdf` |
| `ErrorCategory` | `validation`, `provider_timeout`, `provider_rate_limit`, `malformed_input`, `parse_failure`, `citation_validation`, `output_validation`, `internal` |
| `ExportFormat` / `ExportStatus` | `DOCX`, `PDF` / `QUEUED`, `RUNNING`, `READY`, `FAILED` |
| `AssetType` | `LOGO` |

## 3. Resources

```text
User            { id, email, created_at }
Project         { id, report_type, title, topic, description, target_pages, citation_style, status,
                  template_name, source_counts: {PAPER, PAPER_LINK, COLLEGE_FORMAT, SOURCE_CODE, SCREENSHOT, total},
                  sections_approved, sections_total, details: ProjectDetails, logo_asset_id, created_at, updated_at }
ProjectDetails  { institution: {college, university, department, degree, academic_year, semester},
                  students: [{name, usn}], guide: {name, designation}, hod: {name}, principal: {name}, instructions }
Asset           { id, project_id, asset_type, filename, mime_type, size_bytes, width, height, status, created_at }
Source          { id, project_id, source_type, filename, url, label, mime_type, size_bytes, status,
                  error: {category, message} | null, summary: SourceSummary | null, citation_key, created_at }
SourceSummary   PAPER/PAPER_LINK: {title, authors[], year, page_count, passage_count, extraction_quality}
                COLLEGE_FORMAT: {front_matter[], chapter_count, style: {font, size, spacing, margins, citation_style}}
                SOURCE_CODE: {languages[], frameworks[], file_count, routes, models, modules}
                SCREENSHOT: {description, suggested_section, caption}
SourcesList     { items: Source[], readiness: {format_ready, paper_ready_count, can_continue_to_plan} }
ReportPlan      { id, project_id, template_key, template_name, front_matter: [{key, title, auto, required_details[]}],
                  style_summary: {font, font_size, line_spacing, margins, citation_style}, sections: SectionSummary[] }
SectionSummary  { id, title, section_type, order_index, status, target_words, evidence_policy, active_version_id, approved_version_id }
SectionDetail   SectionSummary + { objective, active_version: SectionVersion | null, versions: [{id, version_no, created_by, status, created_at}] }
SectionVersion  { id, version_no, content (Markdown subset, citations as [@S1], figures as [[fig:key]]), created_by: "ai"|"user",
                  model, prompt_version, usage: {provider, model, input_tokens, output_tokens, estimated_cost_inr},
                  evidence: EvidenceRef[], figures[], assumptions[], unresolved_questions[], created_at }
EvidenceRef     { citation_key, chunk_id, source_id, source_title, page_start, page_end, excerpt }
Export          { id, project_id, format, status, file_name, warnings[], page_count, file_size, created_at, completed_at }
Job             see §1.2
```

## 4. Endpoints (slice 1 unless tagged S2)

| Method & path | Request → Response | Errors |
|---|---|---|
| `POST /auth/register` | `{email, password}` → 201 User + cookie | 409 `EMAIL_TAKEN`, 422 |
| `POST /auth/login` | `{email, password}` → 200 User + cookie | 401 `INVALID_CREDENTIALS` (same message for both halves), 429 |
| `POST /auth/logout` | → 204, session revoked, cookie cleared | 401 |
| `GET /auth/me` | → User | 401 |
| `GET /projects?page&page_size` | → list of Project | |
| `POST /projects` (+`Idempotency-Key`) | `{report_type, title (5–255), topic (≤500), description? (≤5000), target_pages? (10–300), citation_style?}` → 201 Project | 422 |
| `GET /projects/{id}` | → Project | 404 |
| `PATCH /projects/{id}` | partial `{title?, topic?, description?, target_pages?, citation_style?, details?}`; `details.students` replaced whole, never normalised → Project | 404, 422 |
| `DELETE /projects/{id}` | → 204 soft delete; derived data removal is a job (S2) | 404 |
| `POST /projects/{id}/assets` | `{asset_type, filename, mime_type, size_bytes}` → 201 `{asset, upload: {url, method: "PUT", headers, expires_at}}` | 422 `UNSUPPORTED_TYPE`, `IMAGE_TOO_SMALL` |
| `POST /projects/{id}/assets/{aid}/complete` | → 200 Asset (dimensions verified) | 409 `OBJECT_NOT_FOUND` |
| `GET /assets/{aid}/url` | → `{url, expires_at}` signed, short-lived | 404 |
| `GET /projects/{id}/sources` | → SourcesList | |
| `POST /projects/{id}/sources` | `{source_type, filename?, mime_type?, size_bytes?, url?, label?}` → 201 `{source, upload?}`; PAPER_LINK has no upload and enqueues `resolve_link` (S2) | 422 `UNSUPPORTED_TYPE`, `SOURCE_TOO_LARGE` (25 MB PDF, 50 MB ZIP, 10 MB image), `NESTED_ARCHIVE` |
| `POST /projects/{id}/sources/{sid}/complete` | → 202 (`ingest_pdf` for PAPER; `parse_template`, `analyze_code`, `analyze_screenshot` S2) | 409 `OBJECT_NOT_FOUND`, `SIZE_MISMATCH` |
| `POST /projects/{id}/sources/{sid}/attach-pdf` (S2) | → 201 `{source, upload}` for a NEEDS_UPLOAD link | 409 |
| `GET /projects/{id}/sources/{sid}` | → Source | 404 |
| `DELETE /projects/{id}/sources/{sid}` | → 204; removes object, document, chunks, figures | 404, 409 `SOURCE_IN_USE` if cited by an approved version |
| `GET /templates/library` | → `{items: [{template_key, name, university, front_matter[], chapter_count}]}` | |
| `POST /projects/{id}/template/select` | `{template_key}` → 201 Source (COLLEGE_FORMAT, READY) | 409 if a READY format exists |
| `POST /projects/{id}/plan` | `{template_key?}` → 201 ReportPlan. Synchronous. Uses READY COLLEGE_FORMAT source if present, else built-in `generic_engineering_project_report_v1` | 409 `PLAN_LOCKED` (a section left PLANNED) |
| `GET /projects/{id}/plan` | → ReportPlan | 404 `PLAN_NOT_FOUND` |
| `PATCH /projects/{id}/plan` (S2) | `{sections: [{id?, title, order_index, target_words, removed?}]}` → ReportPlan | 409 `PLAN_LOCKED` |
| `GET /projects/{id}/sections` | → `{items: SectionSummary[]}` | |
| `GET /sections/{sid}` | → SectionDetail | 404 |
| `POST /sections/{sid}/generate` | → 202 `generate_section` | 409 `GENERATION_ACTIVE`, 409 `NO_EVIDENCE` |
| `POST /sections/{sid}/regenerate` (P1) | `{instruction?}` → 202 | 409 `GENERATION_ACTIVE` |
| `PUT /sections/{sid}/content` | `{content}` → 200 SectionDetail; new user version; status IN_REVIEW | 422 `UNKNOWN_CITATION {details: {keys: ["S9"]}}` |
| `POST /sections/{sid}/approve` | `{version_id}` → 200 SectionDetail (APPROVED) | 409 `VERSION_NOT_ACTIVE` |
| `GET /projects/{id}/figures` (S2) | → `{items: [{id, key, title, asset_id, status}]}` | |
| `POST /projects/{id}/final-review` (S2) | → 202 `final_review` | 409 `SECTIONS_NOT_APPROVED {details: {section_ids}}` |
| `GET /projects/{id}/final-review` (S2) | → `{status, findings: [{id, check, severity, section_id, message, evidence, status}], counts}` | 404 |
| `POST /final-review/findings/{fid}/dismiss` (S2) | → 200 finding | |
| `POST /projects/{id}/exports` | `{format: "DOCX"}` (`PDF` S2) → 202 `export_docx` | 409 `NOTHING_APPROVED` |
| `GET /projects/{id}/exports` | → list of Export | |
| `GET /exports/{eid}/download` | → `{url, expires_at}` fetched at click time | 404, 409 `EXPORT_NOT_READY` |
| `GET /jobs/{jid}` | → Job | 404 |
| `GET /projects/{id}/usage` | → `{total_estimated_cost_inr, by_job_type: {…}, events: [{job_id, model, input_tokens, output_tokens, estimated_cost_inr, created_at}]}` | |
| `GET /health` | → `{status: "ok", version}` | |

## 5. Internal contracts (backend only, frozen in the foundation)

```python
class LLMGateway(Protocol):
    def generate(self, req: GenerationRequest) -> GenerationResult: ...
    def generate_structured(self, req: GenerationRequest, schema: type[T]) -> StructuredResult[T]: ...
    def embed(self, texts: list[str], *, task: EmbeddingTask) -> EmbeddingResult: ...
# Every result carries usage {provider, model, input_tokens, output_tokens, estimated_cost_inr, duration_ms}.
# GenerationRequest carries task_class (routing key → model alias + effort), system, user, max_tokens,
# metadata {project_id, job_id, prompt_name, prompt_version}.

class RetrievalService(Protocol):
    def retrieve_evidence(self, project_id: UUID, query: str, *, k: int = 12,
                          source_types: list[SourceType] | None = None) -> list[EvidenceItem]: ...
# EvidenceItem = EvidenceRef + score. SQL always filters project_id. Citation keys are per source document (S1, S2…).

class AgentInput(BaseModel):
    project_id: UUID; section_id: UUID; section_title: str; section_type: str; section_objective: str
    project_summary: str; evidence: list[EvidenceItem]; approved_previous_sections: list[ApprovedSectionSummary]
    target_word_count: int | None; citation_style: str | None; formatting_requirements: dict; user_instructions: str | None

class AgentOutput(BaseModel):
    content: str                      # Markdown subset; citations [@S1]; figures [[fig:key]]
    evidence_refs: list[str]          # keys used — must be a subset of input keys (citation gate)
    assumptions: list[str]; unresolved_questions: list[str]; confidence_score: float | None

class StorageAdapter(Protocol):
    def presign_put(self, key, *, content_type, size, expires_s) -> PresignedUpload: ...
    def presign_get(self, key, *, expires_s) -> str: ...
    def head(self, key) -> ObjectInfo | None: ...
    def delete(self, key) -> None: ...
# Object keys: projects/{project_id}/sources/{source_id}/{uuid}.{ext}; projects/{project_id}/assets/{asset_id}/{uuid}.{ext};
# projects/{project_id}/exports/{export_id}/{file_name}. User filenames are never used as keys.
```

## 6. Content format

Section content is a Markdown string using only: paragraphs, `##`/`###` headings, `-` lists, `[@S1]` citation markers, `[[fig:key]]` figure markers. The compiler maps `[@S1]` → `[1]` in order of first use and builds References from cited sources. Unknown markers fail validation (422 on save, `citation_validation` on generation, `output_validation` on export).

## 7. Change log

| Date | Change |
|---|---|
| 2026-10-06 | v1 frozen from plan §6 plus accepted PDF additions (sessions table, readiness flags, paging, idempotency storage, PDF source-type names). Supersedes the interns' PDF and ticket-level contracts. |
