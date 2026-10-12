"""Export queue tasks. Each takes a job_id, runs under the job lifecycle (B-04 BaseJobTask), is idempotent."""

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks_export.noop")
def noop(job_id: str) -> str:
    return job_id
