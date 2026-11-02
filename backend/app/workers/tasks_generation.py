"""Generation queue tasks using the shared B-04 job lifecycle."""

from typing import Any

from app.workers.base_task import BaseJobTask
from app.workers.celery_app import celery_app


class GenerationTask(BaseJobTask):
    abstract = False
    name = "app.workers.tasks_generation.noop"

    def execute(
        self,
        job_id: str,
        *args: Any,
        **kwargs: Any,
    ) -> str:
        # Placeholder until the generation pipeline is implemented.
        return job_id


celery_app.register_task(GenerationTask())
