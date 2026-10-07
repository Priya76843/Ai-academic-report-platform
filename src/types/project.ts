export type ReportType = "PROJECT_REPORT" | "SEMINAR_REPORT"

export type CitationStyle = "IEEE" | "APA"

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
  | "EXPORT_FAILED"

export type SourceType =
  | "PAPER"
  | "PAPER_LINK"
  | "COLLEGE_FORMAT"
  | "SOURCE_CODE"
  | "SCREENSHOT"

export interface SourceCounts {
  PAPER: number
  PAPER_LINK: number
  COLLEGE_FORMAT: number
  SOURCE_CODE: number
  SCREENSHOT: number
  total: number
}

export interface ProjectDetails {
  [key: string]: unknown
}

export interface Project {
  id: string
  report_type: ReportType
  title: string
  topic: string
  description?: string
  target_pages?: number
  citation_style?: CitationStyle
  status: ProjectStatus
  template_name?: string
  source_counts: SourceCounts
  sections_approved: number
  sections_total: number
  details: ProjectDetails
  logo_asset_id?: string
  created_at: string
  updated_at: string
}

export interface ProjectListResponse {
  items: Project[]
  page: number
  page_size: number
  total: number
}

export interface CreateProjectRequest {
  report_type: ReportType
  title: string
  topic: string
  description?: string
  target_pages?: number
  citation_style?: CitationStyle
}