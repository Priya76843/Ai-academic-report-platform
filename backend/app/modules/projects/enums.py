"""Enums from contract §2. Project status is derived server-side (B-03); clients never set it."""

from enum import StrEnum


class ReportType(StrEnum):
    PROJECT_REPORT = "PROJECT_REPORT"
    SEMINAR_REPORT = "SEMINAR_REPORT"


class CitationStyle(StrEnum):
    IEEE = "IEEE"
    APA = "APA"


class ProjectStatus(StrEnum):
    DRAFT = "DRAFT"
    INGESTING = "INGESTING"
    READY_FOR_PLANNING = "READY_FOR_PLANNING"
    PLAN_READY = "PLAN_READY"
    GENERATING = "GENERATING"
    IN_REVIEW = "IN_REVIEW"
    ALL_SECTIONS_APPROVED = "ALL_SECTIONS_APPROVED"
    QUALITY_REVIEW = "QUALITY_REVIEW"
    COMPILING = "COMPILING"
    COMPLETED = "COMPLETED"
    INGESTION_FAILED = "INGESTION_FAILED"
    GENERATION_FAILED = "GENERATION_FAILED"
    EXPORT_FAILED = "EXPORT_FAILED"
