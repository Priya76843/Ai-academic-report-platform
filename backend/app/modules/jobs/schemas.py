import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.core.config import get_settings


class JobError(BaseModel):
    category: str
    message: str


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID | None
    job_type: str
    status: str
    progress: dict[str, Any]
    resource_type: str | None
    resource_id: uuid.UUID | None
    attempt: int
    error: JobError | None = None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None

    @classmethod
    def from_job(cls, job: Any) -> "JobOut":
        out = cls.model_validate(job)
        if job.error_category:
            out.error = JobError(category=job.error_category, message=job.error_message or "")
        return out


class AsyncEnvelope(BaseModel):
    """HTTP 202 body (contract §1.2)."""

    job_id: uuid.UUID
    job_type: str
    status: str
    resource_type: str | None
    resource_id: uuid.UUID | None
    status_url: str

    @classmethod
    def from_job(cls, job: Any) -> "AsyncEnvelope":
        return cls(
            job_id=job.id,
            job_type=job.job_type,
            status=job.status,
            resource_type=job.resource_type,
            resource_id=job.resource_id,
            status_url=f"{get_settings().api_prefix}/jobs/{job.id}",
        )
