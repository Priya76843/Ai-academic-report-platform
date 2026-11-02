import importlib
from unittest.mock import Mock, patch

import pytest
from celery.exceptions import Retry
from celery.utils.threads import LocalStack
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ProviderError, ValidationFailedError
from app.modules.jobs.enums import ErrorCategory, JobStatus, JobType
from app.modules.jobs.models import Job
from app.modules.jobs.service import create_job, transition
from app.workers.base_task import BaseJobTask
from app.workers.celery_app import celery_app


class DummyJobTask(BaseJobTask):
    abstract = False
    app = celery_app

    def execute(self, job_id, *args, **kwargs):
        return {"job_id": job_id, "ok": True}


def prepare_task(task, retries=0):

    task.request_stack = LocalStack()
    task.push_request(retries=retries)
    return task


def make_session_factory(db):

    connection = db.connection()

    def factory():
        return Session(
            bind=connection,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        )

    return factory


def run_with_test_db(db, operation):

    with patch(
        "app.workers.base_task.SessionLocal",
        side_effect=make_session_factory(db),
    ):
        return operation()


def reload_job(db, job_id):
    db.expire_all()
    return db.execute(select(Job).where(Job.id == job_id)).scalar_one()


def test_successful_execution_marks_job_succeeded(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id
    task = prepare_task(DummyJobTask())

    result = run_with_test_db(
        db,
        lambda: task.run(str(job_id)),
    )

    persisted_job = reload_job(db, job_id)
    assert result == {"job_id": str(job_id), "ok": True}
    assert persisted_job.status == JobStatus.SUCCEEDED.value
    assert persisted_job.completed_at is not None


def test_completed_job_does_not_execute_again(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id
    transition(db, job, JobStatus.RUNNING)
    transition(db, job, JobStatus.SUCCEEDED)

    task = prepare_task(DummyJobTask())
    task.execute = Mock()

    result = run_with_test_db(
        db,
        lambda: task.run(str(job_id)),
    )

    assert result is None
    task.execute.assert_not_called()


def test_validation_error_does_not_retry(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    class ValidationTask(DummyJobTask):
        def execute(self, job_id, *args, **kwargs):
            raise ValidationFailedError("Invalid input")

    task = prepare_task(ValidationTask())

    with pytest.raises(ValidationFailedError):
        run_with_test_db(
            db,
            lambda: task.run(str(job_id)),
        )

    persisted_job = reload_job(db, job_id)
    assert persisted_job.status == JobStatus.FAILED.value
    assert persisted_job.error_category == ErrorCategory.VALIDATION.value


def test_non_retryable_provider_error_does_not_retry(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    class NonRetryableProviderTask(DummyJobTask):
        def execute(self, job_id, *args, **kwargs):
            raise ProviderError(
                "Permanent provider failure",
                category=ErrorCategory.PROVIDER_TIMEOUT.value,
                retryable=False,
            )

    task = prepare_task(NonRetryableProviderTask())
    task.retry = Mock()

    with pytest.raises(ProviderError):
        run_with_test_db(
            db,
            lambda: task.run(str(job_id)),
        )

    persisted_job = reload_job(db, job_id)
    assert persisted_job.status == JobStatus.FAILED.value
    assert persisted_job.error_category == ErrorCategory.PROVIDER_TIMEOUT.value
    task.retry.assert_not_called()


@pytest.mark.parametrize(
    "category",
    [
        ErrorCategory.PROVIDER_TIMEOUT,
        ErrorCategory.PROVIDER_RATE_LIMIT,
    ],
)
def test_provider_errors_schedule_retry(db, category):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    class ProviderTask(DummyJobTask):
        def execute(self, job_id, *args, **kwargs):
            raise ProviderError(
                "Temporary provider failure",
                category=category.value,
                retryable=True,
            )

    task = prepare_task(ProviderTask(), retries=0)
    retry_signal = Retry("retry scheduled")

    with patch.object(task, "retry", side_effect=retry_signal), pytest.raises(Retry):
        run_with_test_db(
            db,
            lambda: task.run(str(job_id)),
        )

    persisted_job = reload_job(db, job_id)
    assert persisted_job.status == JobStatus.RETRYING.value
    assert persisted_job.attempt == 2
    assert persisted_job.error_category == category.value


def test_retry_scheduling_failure_marks_job_failed(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    class ProviderTask(DummyJobTask):
        def execute(self, job_id, *args, **kwargs):
            raise ProviderError(
                "Temporary provider failure",
                category=ErrorCategory.PROVIDER_TIMEOUT.value,
                retryable=True,
            )

    task = prepare_task(ProviderTask())
    task.retry = Mock(side_effect=RuntimeError("Broker unavailable"))

    with pytest.raises(RuntimeError, match="Broker unavailable"):
        run_with_test_db(db, lambda: task.run(str(job_id)))

    persisted_job = reload_job(db, job_id)
    assert persisted_job.status == JobStatus.FAILED.value
    assert persisted_job.error_category == ErrorCategory.INTERNAL.value
    assert persisted_job.error_message == "Broker unavailable"


def test_retry_exhaustion_marks_job_failed(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    class ProviderTask(DummyJobTask):
        def execute(self, job_id, *args, **kwargs):
            raise ProviderError(
                "Provider timed out",
                category=ErrorCategory.PROVIDER_TIMEOUT.value,
                retryable=True,
            )

    task = prepare_task(
        ProviderTask(),
        retries=DummyJobTask.max_retries,
    )

    with pytest.raises(ProviderError):
        run_with_test_db(
            db,
            lambda: task.run(str(job_id)),
        )

    persisted_job = reload_job(db, job_id)
    assert persisted_job.status == JobStatus.FAILED.value
    assert persisted_job.error_category == ErrorCategory.PROVIDER_TIMEOUT.value


def test_running_job_redelivery_logs_warning_and_recovers(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id
    transition(db, job, JobStatus.RUNNING)

    task = prepare_task(DummyJobTask())

    with (
        patch("app.workers.base_task.log.warning") as warning,
        patch(
            "app.workers.base_task.SessionLocal",
            side_effect=make_session_factory(db),
        ),
    ):
        result = task.run(str(job_id))

    persisted_job = reload_job(db, job_id)

    assert result == {"job_id": str(job_id), "ok": True}
    assert persisted_job.status == JobStatus.SUCCEEDED.value
    warning.assert_called_once_with(
        "job_redelivered_while_running",
        job_id=str(job_id),
    )


def test_running_job_redelivery_uses_same_job_id_as_operation_key(db):
    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = str(job.id)
    transition(db, job, JobStatus.RUNNING)

    task = prepare_task(DummyJobTask())
    task.execute = Mock(return_value={"job_id": job_id, "ok": True})

    result = run_with_test_db(db, lambda: task.run(job_id))

    assert result == {"job_id": job_id, "ok": True}
    task.execute.assert_called_once_with(job_id)
    assert task.execute.call_args.args[0] == job_id
    assert reload_job(db, job.id).status == JobStatus.SUCCEEDED.value


def test_worker_redelivery_does_not_repeat_committed_operation(db):
    from app.modules.jobs.idempotency import execute_idempotently

    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = str(job.id)
    operation_calls = []

    class SimulatedWorkerCrash(BaseException):
        pass

    class IdempotentTask(DummyJobTask):
        deliveries = 0

        def execute(self, current_job_id, *args, **kwargs):
            self.deliveries += 1

            def operation(session):
                operation_calls.append("executed")
                return {"document_id": "doc-123"}

            result = execute_idempotently(
                job_id=job.id,
                operation_key=f"job:{current_job_id}:ingest",
                input_data={"document_id": "doc-123"},
                operation=operation,
            )

            if self.deliveries == 1:
                # The database operation and receipt have committed,
                # but the worker crashes before BaseJobTask can mark
                # the job as SUCCEEDED.
                raise SimulatedWorkerCrash()

            return result

    task = prepare_task(IdempotentTask())

    with (
        patch(
            "app.modules.jobs.idempotency.SessionLocal",
            side_effect=make_session_factory(db),
        ),
        patch(
            "app.workers.base_task.SessionLocal",
            side_effect=make_session_factory(db),
        ),
    ):
        with pytest.raises(SimulatedWorkerCrash):
            task.run(job_id)

        assert reload_job(db, job.id).status == JobStatus.RUNNING.value

        # Simulate Celery redelivering the same job.
        result = task.run(job_id)

    assert result == {"document_id": "doc-123"}
    assert operation_calls == ["executed"]
    assert reload_job(db, job.id).status == JobStatus.SUCCEEDED.value


def assert_registered_task_succeeds(db, module_name, task_name):
    # Importing the module registers its task with Celery.
    importlib.import_module(module_name)

    job = create_job(db, job_type=JobType.INGEST_PDF, project_id=None)
    job_id = job.id

    task = celery_app.tasks[task_name]

    result = run_with_test_db(
        db,
        lambda: task.apply(args=[str(job_id)]),
    )

    persisted_job = reload_job(db, job_id)

    assert result.successful()
    assert result.result == str(job_id)
    assert persisted_job.status == JobStatus.SUCCEEDED.value
    assert persisted_job.completed_at is not None


def test_registered_ingestion_task_executes_lifecycle(db):
    assert_registered_task_succeeds(
        db,
        "app.workers.tasks_ingestion",
        "app.workers.tasks_ingestion.noop",
    )


def test_registered_generation_task_executes_lifecycle(db):
    assert_registered_task_succeeds(
        db,
        "app.workers.tasks_generation",
        "app.workers.tasks_generation.noop",
    )


def test_registered_export_task_executes_lifecycle(db):
    assert_registered_task_succeeds(
        db,
        "app.workers.tasks_export",
        "app.workers.tasks_export.noop",
    )
