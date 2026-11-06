import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.projects.enums import CitationStyle, ProjectStatus, ReportType


class InstitutionDetails(BaseModel):
    college: str | None = None
    university: str | None = None
    department: str | None = None
    degree: str | None = None
    academic_year: str | None = None
    semester: int | None = None


class StudentDetails(BaseModel):
    name: str
    usn: str


class GuideDetails(BaseModel):
    name: str | None = None
    designation: str | None = None


class StaffDetails(BaseModel):
    name: str | None = None


class ProjectDetails(BaseModel):
    institution: InstitutionDetails = Field(default_factory=InstitutionDetails)
    students: list[StudentDetails] = Field(default_factory=list)
    guide: GuideDetails = Field(default_factory=GuideDetails)
    hod: StaffDetails = Field(default_factory=StaffDetails)
    principal: StaffDetails = Field(default_factory=StaffDetails)
    instructions: str | None = None


class ProjectCreate(BaseModel):
    report_type: ReportType
    title: str = Field(min_length=5, max_length=255)
    topic: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    target_pages: int | None = Field(default=None, ge=10, le=300)
    citation_style: CitationStyle | None = None


class ProjectPatch(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=255)
    topic: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    target_pages: int | None = Field(default=None, ge=10, le=300)
    citation_style: CitationStyle | None = None
    details: ProjectDetails | None = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def reject_null_details(cls, values: Any) -> Any:
        if isinstance(values, dict) and "details" in values and values["details"] is None:
            raise ValueError("details must be an object, not null.")
        return values


class SourceCounts(BaseModel):
    PAPER: int = 0
    PAPER_LINK: int = 0
    COLLEGE_FORMAT: int = 0
    SOURCE_CODE: int = 0
    SCREENSHOT: int = 0
    total: int = 0


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    report_type: ReportType
    title: str
    topic: str
    description: str | None
    target_pages: int | None
    citation_style: CitationStyle | None
    status: ProjectStatus
    template_name: str | None
    source_counts: SourceCounts
    sections_approved: int
    sections_total: int
    details: dict[str, Any]
    logo_asset_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class ProjectListOut(BaseModel):
    items: list[ProjectOut]
    page: int
    page_size: int
    total: int
