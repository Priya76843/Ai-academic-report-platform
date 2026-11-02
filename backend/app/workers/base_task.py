from __future__ import annotations

import random
from typing import Any
from uuid import UUID

from celery import Task
from celery.exceptions import Retry
from sqlalchemy import select
from structlog.contextvars import bind_contextvars, clear_contextvars

from app.core.exceptions import ProviderError
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.modules.jobs.enums import ErrorCategory, JobStatus
from app.modules.jobs.models import Job
from app.modules.jobs.service import classify, transition

log = get_logger(__name__)

MAX_PROVIDER_RETRIES = 3
RETRY_BACKOFF_BASE_SECONDS = 2
RETRY_BACKOFF_MAX_SECONDS = 60


class BaseJobTask(Task):
    abstract = True
    max_retries = MAX_PROVIDER_RETRIES
    acks_late = True
    reject_on_worker_lost = True

    @staticmethod
    def _parse_job_id(job_id: str) -> UUID:
        return UUID(str(job_id))

    def _get_job(self, db: Any, job_id: str) -> Job:
        job_uuid = self._parse_job_id(job_id)
        job = db.execute(select(Job).where(Job.id == job_uuid).with_for_update()).scalar_one_or_none()

        if job is None:
            raise RuntimeError(f"Job {job_id} does not exist")

        return job

    def _start_job(self, job_id: str) -> bool:
        with SessionLocal() as db:
            job = self._get_job(db, job_id)
            status = JobStatus(job.status)

            # Terminal jobs must never execute their operation again.
            if status in (JobStatus.SUCCEEDED, JobStatus.FAILED):
                return False

            if status in (JobStatus.QUEUED, JobStatus.RETRYING):
                transition(db, job, JobStatus.RUNNING)
            elif status == JobStatus.RUNNING:
                # A worker may have crashed after starting the operation.
                # The operation must use job_id as an idempotency key for
                # any externally visible side effects.
                log.warning(
                    "job_redelivered_while_running",
                    job_id=job_id,
                )

            return True

    def _mark_succeeded(self, job_id: str) -> None:
        with SessionLocal() as db:
            job = self._get_job(db, job_id)

            if JobStatus(job.status) in (
                JobStatus.SUCCEEDED,
                JobStatus.FAILED,
            ):
                return

            transition(
                db,
                job,
                JobStatus.SUCCEEDED,
                error_category=None,
                error_message=None,
            )

    def _mark_failed(self, job_id: str, exc: Exception) -> None:
        with SessionLocal() as db:
            job = self._get_job(db, job_id)

            if JobStatus(job.status) in (
                JobStatus.SUCCEEDED,
                JobStatus.FAILED,
            ):
                return

            category = classify(exc)

            transition(
                db,
                job,
                JobStatus.FAILED,
                error_category=category.value,
                error_message=str(exc)[:1000],
            )

    @staticmethod
    def _retry_category(
        exc: Exception,
    ) -> ErrorCategory | None:
        if isinstance(exc, ProviderError) and not exc.retryable:
            return None

        category = classify(exc)

        if category in {
            ErrorCategory.PROVIDER_TIMEOUT,
            ErrorCategory.PROVIDER_RATE_LIMIT,
        }:
            return category

        return None

    @staticmethod
    def _retry_delay(retries: int) -> float:
        ceiling = min(
            RETRY_BACKOFF_MAX_SECONDS,
            RETRY_BACKOFF_BASE_SECONDS * (2**retries),
        )
        return random.uniform(ceiling / 2, ceiling)

    def run(
        self,
        job_id: str,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        job_id = str(job_id)
        clear_contextvars()
        bind_contextvars(job_id=job_id)

        try:
            if not self._start_job(job_id):
                log.info("job_already_terminal", job_id=job_id)
                return None

            try:
                result = self.execute(job_id, *args, **kwargs)
            except Retry:
                # Preserve Celery's retry signal.
                raise
            except Exception as exc:
                category = self._retry_category(exc)

                if category is not None and self.request.retries < self.max_retries:
                    with SessionLocal() as db:
                        job = self._get_job(db, job_id)

                        if JobStatus(job.status) == JobStatus.RUNNING:
                            transition(
                                db,
                                job,
                                JobStatus.RETRYING,
                                error_category=category.value,
                                error_message=str(exc)[:1000],
                            )

                    # Celery raises Retry to schedule the next attempt.

                    try:
                        raise self.retry(
                            exc=exc,
                            countdown=self._retry_delay(self.request.retries),
                            max_retries=self.max_retries,
                        ) from exc
                    except Retry:
                        raise
                    except Exception as scheduling_exc:
                        log.exception(
                            "job_retry_scheduling_failed",
                            job_id=job_id,
                            error_category=category.value,
                        )
                        self._mark_failed(job_id, scheduling_exc)
                        raise

                self._mark_failed(job_id, exc)
                raise

            self._mark_succeeded(job_id)
            return result
        finally:
            clear_contextvars()

    def execute(
        self,
        job_id: str,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        raise NotImplementedError("Subclasses must implement execute()")
