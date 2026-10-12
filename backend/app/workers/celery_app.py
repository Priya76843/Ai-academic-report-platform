"""Celery application. Three queues (contract/arch doc §11). Tasks live in tasks_*.py and use jobs.service."""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()
celery_app = Celery("acamedia", broker=settings.celery_broker_url, backend=settings.celery_result_backend)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,  # redelivered on worker crash; tasks must be idempotent
    worker_prefetch_multiplier=1,
    task_default_queue="ingestion",
    task_routes={
        "app.workers.tasks_ingestion.*": {"queue": "ingestion"},
        "app.workers.tasks_generation.*": {"queue": "generation"},
        "app.workers.tasks_export.*": {"queue": "export"},
    },
    include=["app.workers.tasks_ingestion", "app.workers.tasks_generation", "app.workers.tasks_export"],
)


@celery_app.task(name="app.workers.ping")
def ping() -> str:
    return "pong"
