// Hand-written subset of api-contracts-v1 §2–§3 used by the foundation. Once the backend exports
// docs/api/openapi.json, run `npm run gen:api` and migrate imports to ./generated.ts (F-01).
export type ReportType = "PROJECT_REPORT" | "SEMINAR_REPORT";
export type CitationStyle = "IEEE" | "APA";
export type ProjectStatus =
  | "DRAFT" | "INGESTING" | "READY_FOR_PLANNING" | "PLAN_READY" | "GENERATING" | "IN_REVIEW"
  | "ALL_SECTIONS_APPROVED" | "QUALITY_REVIEW" | "COMPILING" | "COMPLETED"
  | "INGESTION_FAILED" | "GENERATION_FAILED" | "EXPORT_FAILED";
export type SourceType = "PAPER" | "PAPER_LINK" | "COLLEGE_FORMAT" | "SOURCE_CODE" | "SCREENSHOT";
export type SourceStatus = "UPLOAD_PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "RESOLVING" | "NEEDS_UPLOAD";
export type SectionStatus = "PLANNED" | "GENERATING" | "GENERATED" | "IN_REVIEW" | "APPROVED" | "REGENERATING" | "FAILED" | "NEEDS_INPUT";
export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "RETRYING";
export type AnyStatus = ProjectStatus | SourceStatus | SectionStatus | JobStatus | "AUTO" | "READY" | "UPLOADING";

export interface User { id: string; email: string; created_at: string; }

export interface ProjectDetails {
  institution?: { college?: string; university?: string; department?: string; degree?: string; academic_year?: string; semester?: number };
  students?: { name: string; usn: string }[];
  guide?: { name: string; designation?: string };
  hod?: { name: string };
  principal?: { name: string };
  instructions?: string;
}

export interface Project {
  id: string; report_type: ReportType; title: string; topic: string; description: string | null;
  target_pages: number | null; citation_style: CitationStyle | null; status: ProjectStatus;
  template_name: string | null; source_counts: Record<SourceType | "total", number>;
  sections_approved: number; sections_total: number; details: ProjectDetails; logo_asset_id: string | null;
  created_at: string; updated_at: string;
}

export interface Page<T> { items: T[]; page: number; page_size: number; total: number; }

export interface Job {
  id: string; project_id: string | null; job_type: string; status: JobStatus;
  progress: { step?: string; completed?: number; total?: number };
  resource_type: string | null; resource_id: string | null; attempt: number;
  error: { category: string; message: string } | null;
  created_at: string; started_at: string | null; completed_at: string | null;
}

export interface AsyncEnvelope {
  job_id: string; job_type: string; status: JobStatus; resource_type: string | null; resource_id: string | null; status_url: string;
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: { fields?: Record<string, string>; [k: string]: unknown } };
  request_id: string | null;
}
