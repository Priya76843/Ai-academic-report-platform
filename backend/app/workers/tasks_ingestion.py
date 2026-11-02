"""Ingestion queue tasks using the shared B-04 job lifecycle."""

from typing import Any

from app.workers.base_task import BaseJobTask
from app.workers.celery_app import celery_app


class IngestionTask(BaseJobTask):
    abstract = False
    name = "app.workers.tasks_ingestion.noop"

    def execute(
        self,
        job_id: str,
        *args: Any,
        **kwargs: Any,
    ) -> str:
        # Placeholder until the ingestion pipeline is implemented.
        return job_id


celery_app.register_task(IngestionTask())
