export type ReportType = "PROJECT_REPORT" | "SEMINAR_REPORT";
export type CitationStyle = "IEEE" | "APA";

export type ProjectStatus =
  | "DRAFT"
  | "INGESTING"
  | "READY_FOR_PLANNING"
  | "PLAN_READY"
  | "GENERATING"
  | "IN_REVIEW"
  | "ALL_SECTIONS_APPROVED"
  | "QUALITY_REVIEW"
  | "COMPILING"
  | "COMPLETED"
  | "INGESTION_FAILED"
  | "GENERATION_FAILED"
  | "EXPORT_FAILED";

export type SourceType =
  | "PAPER"
  | "PAPER_LINK"
  | "COLLEGE_FORMAT"
  | "SOURCE_CODE"
  | "SCREENSHOT";

export type SourceStatus =
  | "UPLOAD_PENDING"
  | "UPLOADED"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "RESOLVING"
  | "NEEDS_UPLOAD";

export type SectionStatus =
  | "PLANNED"
  | "GENERATING"
  | "GENERATED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REGENERATING"
  | "FAILED"
  | "NEEDS_INPUT";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "RETRYING";

export type AnyStatus =
  | ProjectStatus
  | SourceStatus
  | SectionStatus
  | JobStatus
  | "AUTO"
  | "READY"
  | "UPLOADING";

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface ProjectDetails {
  institution?: {
    college?: string;
    university?: string;
    department?: string;
    degree?: string;
    academic_year?: string;
    semester?: number;
  };
  students?: { name: string; usn: string }[];
  guide?: { name: string; designation?: string };
  hod?: { name: string };
  principal?: { name: string };
  instructions?: string;
}

export interface Project {
  id: string;
  report_type: ReportType;
  title: string;
  topic: string;
  description: string | null;
  target_pages: number | null;
  citation_style: CitationStyle | null;
  status: ProjectStatus;
  template_name: string | null;
  source_counts: Record<SourceType | "total", number>;
  sections_approved: number;
  sections_total: number;
  details: ProjectDetails;
  logo_asset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  asset_type: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  status: string;
  created_at: string;
}

export interface FrontMatterItem {
  key: string;
  title: string;
  auto: boolean;
  required_details: string[];
}

export interface ReportPlan {
  id: string;
  project_id: string;
  template_key: string;
  template_name: string;
  front_matter: FrontMatterItem[];
  style_summary: {
    font: string;
    font_size: number;
    line_spacing: number;
    margins: Record<string, number>;
    citation_style: string;
  };
  sections: SectionSummary[];
}

export interface Source {
  id: string;
  project_id: string;
  source_type: SourceType;
  filename: string | null;
  url: string | null;
  label: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: SourceStatus;
  error: { category: string; message: string } | null;
  summary: unknown | null;
  citation_key: string;
  created_at: string;
}

export interface SourcesList {
  items: Source[];
  readiness: {
    format_ready: boolean;
    paper_ready_count: number;
    can_continue_to_plan: boolean;
  };
}

export interface SectionSummary {
  id: string;
  title: string;
  section_type: string;
  order_index: number;
  status: SectionStatus;
  target_words: number;
  evidence_policy: string;
  active_version_id: string | null;
  approved_version_id: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface Job {
  id: string;
  project_id: string | null;
  job_type: string;
  status: JobStatus;
  progress: {
    step?: string;
    completed?: number;
    total?: number;
  };
  resource_type: string | null;
  resource_id: string | null;
  attempt: number;
  error: { category: string; message: string } | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AsyncEnvelope {
  job_id: string;
  job_type: string;
  status: JobStatus;
  resource_type: string | null;
  resource_id: string | null;
  status_url: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: {
      fields?: Record<string, string>;
      [k: string]: unknown;
    };
  };
  request_id: string | null;
}
