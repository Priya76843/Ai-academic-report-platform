from enum import StrEnum


class JobStatus(StrEnum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class JobType(StrEnum):
    INGEST_PDF = "ingest_pdf"
    RESOLVE_LINK = "resolve_link"
    PARSE_TEMPLATE = "parse_template"
    ANALYZE_CODE = "analyze_code"
    ANALYZE_SCREENSHOT = "analyze_screenshot"
    GENERATE_SECTION = "generate_section"
    FINAL_REVIEW = "final_review"
    EXPORT_DOCX = "export_docx"
    EXPORT_PDF = "export_pdf"


class ErrorCategory(StrEnum):
    VALIDATION = "validation"
    PROVIDER_TIMEOUT = "provider_timeout"
    PROVIDER_RATE_LIMIT = "provider_rate_limit"
    MALFORMED_INPUT = "malformed_input"
    PARSE_FAILURE = "parse_failure"
    CITATION_VALIDATION = "citation_validation"
    OUTPUT_VALIDATION = "output_validation"
    INTERNAL = "internal"


RETRYABLE = {ErrorCategory.PROVIDER_TIMEOUT, ErrorCategory.PROVIDER_RATE_LIMIT}
