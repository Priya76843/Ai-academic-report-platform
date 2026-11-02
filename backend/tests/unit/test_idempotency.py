from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.modules.jobs.enums import JobType
from app.modules.jobs.idempotency import (
    IdempotencyConflictError,
    execute_idempotently,
)
from app.modules.jobs.service import create_job


def make_session_factory(db):
    connection = db.connection()

    def factory():
        return Session(
            bind=connection,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        )

    return factory


def test_duplicate_operation_returns_saved_result_without_repeating(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id
    calls = []

    def operation(session):
        calls.append("executed")
        return {"value": 42}

    with patch(
        "app.modules.jobs.idempotency.SessionLocal",
        side_effect=make_session_factory(db),
    ):
        first = execute_idempotently(
            job_id=job_id,
            operation_key=f"job:{job_id}:test",
            input_data={"document_id": "doc-1"},
            operation=operation,
        )
        second = execute_idempotently(
            job_id=job_id,
            operation_key=f"job:{job_id}:test",
            input_data={"document_id": "doc-1"},
            operation=operation,
        )

    assert first == {"value": 42}
    assert second == first
    assert calls == ["executed"]


def test_reusing_operation_key_with_different_input_fails(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    def operation(session):
        return {"value": 42}

    with patch(
        "app.modules.jobs.idempotency.SessionLocal",
        side_effect=make_session_factory(db),
    ):
        execute_idempotently(
            job_id=job_id,
            operation_key=f"job:{job_id}:test",
            input_data={"document_id": "doc-1"},
            operation=operation,
        )

        with pytest.raises(IdempotencyConflictError):
            execute_idempotently(
                job_id=job_id,
                operation_key=f"job:{job_id}:test",
                input_data={"document_id": "doc-2"},
                operation=operation,
            )


def test_operation_is_not_repeated_after_worker_crash(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id
    calls = []

    def operation(session):
        calls.append("executed")
        return {"document_id": "doc-123", "created": True}

    with patch(
        "app.modules.jobs.idempotency.SessionLocal",
        side_effect=make_session_factory(db),
    ):
        # First delivery: the operation and receipt commit successfully.
        first_result = execute_idempotently(
            job_id=job_id,
            operation_key=f"job:{job_id}:ingest",
            input_data={"document_id": "doc-123"},
            operation=operation,
        )

        # Simulate a worker crash before it can mark the job SUCCEEDED.
        # A redelivered task calls the same idempotency helper.
        second_result = execute_idempotently(
            job_id=job_id,
            operation_key=f"job:{job_id}:ingest",
            input_data={"document_id": "doc-123"},
            operation=operation,
        )

    assert first_result == second_result
    assert calls == ["executed"]
