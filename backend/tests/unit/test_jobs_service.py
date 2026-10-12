import pytest

from app.core.exceptions import ProviderError
from app.modules.jobs.enums import ErrorCategory, JobStatus, JobType
from app.modules.jobs.schemas import AsyncEnvelope
from app.modules.jobs.service import IllegalJobTransition, classify, create_job, fail, set_progress, transition


def test_lifecycle_and_envelope(db):
    job = create_job(db, job_type=JobType.GENERATE_SECTION, project_id=None)
    env = AsyncEnvelope.from_job(job)
    assert env.status == "QUEUED" and env.status_url.endswith(f"/jobs/{job.id}")
    transition(db, job, JobStatus.RUNNING)
    assert job.started_at is not None
    set_progress(db, job, "DRAFTING", 2, 3)
    assert job.progress["step"] == "DRAFTING"
    transition(db, job, JobStatus.RETRYING)
    assert job.attempt == 2
    transition(db, job, JobStatus.RUNNING)
    transition(db, job, JobStatus.SUCCEEDED)
    assert job.completed_at is not None
    with pytest.raises(IllegalJobTransition):
        transition(db, job, JobStatus.RUNNING)


def test_fail_classifies(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    transition(db, job, JobStatus.RUNNING)
    fail(db, job, ProviderError("429 from provider", category="provider_rate_limit", retryable=True))
    assert job.status == "FAILED" and job.error_category == "provider_rate_limit"


def test_classify_defaults():
    assert classify(ValueError("x")) == ErrorCategory.MALFORMED_INPUT
    assert classify(RuntimeError("x")) == ErrorCategory.INTERNAL
