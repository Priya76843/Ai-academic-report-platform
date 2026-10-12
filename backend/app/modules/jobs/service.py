"""Job lifecycle. B-04 adds the Celery BaseJobTask, retry policy and locks on top of these primitives."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ProviderError
from app.modules.jobs.enums import ErrorCategory, JobStatus, JobType
from app.modules.jobs.models import Job

_LEGAL = {
    JobStatus.QUEUED: {JobStatus.RUNNING, JobStatus.FAILED},
    JobStatus.RUNNING: {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.RETRYING},
    JobStatus.RETRYING: {JobStatus.RUNNING, JobStatus.FAILED},
    JobStatus.SUCCEEDED: set(),
    JobStatus.FAILED: set(),
}


class IllegalJobTransition(AppError):
    status_code = 409
    code = "ILLEGAL_JOB_TRANSITION"


def create_job(
    db: Session,
    *,
    job_type: JobType,
    project_id: uuid.UUID | None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    idempotency_key: str | None = None,
) -> Job:
    job = Job(
        job_type=job_type.value,
        project_id=project_id,
        resource_type=resource_type,
        resource_id=resource_id,
        idempotency_key=idempotency_key,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def transition(db: Session, job: Job, to: JobStatus, **fields: Any) -> Job:
    frm = JobStatus(job.status)
    if to not in _LEGAL[frm]:
        raise IllegalJobTransition(f"Job cannot move from {frm} to {to}")
    now = datetime.now(UTC)
    job.status = to.value
    if to == JobStatus.RUNNING:
        job.started_at = job.started_at or now
    if to in (JobStatus.SUCCEEDED, JobStatus.FAILED):
        job.completed_at = now
    if to == JobStatus.RETRYING:
        job.attempt += 1
    for k, v in fields.items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


def set_progress(db: Session, job: Job, step: str, completed: int, total: int) -> None:
    job.progress = {"step": step, "completed": completed, "total": total}
    db.commit()


def classify(exc: BaseException) -> ErrorCategory:
    if isinstance(exc, ProviderError):
        try:
            return ErrorCategory(exc.category)
        except ValueError:
            return ErrorCategory.INTERNAL
    if isinstance(exc, AppError) and exc.status_code == 422:
        return ErrorCategory.VALIDATION
    if isinstance(exc, (ValueError, TypeError)):
        return ErrorCategory.MALFORMED_INPUT
    return ErrorCategory.INTERNAL


def fail(db: Session, job: Job, exc: BaseException) -> Job:
    category = classify(exc)
    return transition(db, job, JobStatus.FAILED, error_category=category.value, error_message=str(exc)[:1000])
