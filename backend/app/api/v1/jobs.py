from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbDep, OwnedProject
from app.core.exceptions import NotFoundError
from app.modules.jobs.enums import JobStatus
from app.modules.jobs.models import Job
from app.modules.jobs.schemas import JobOut
from app.modules.projects.models import Project

router = APIRouter(prefix="/jobs", tags=["jobs"])
project_jobs_router = APIRouter(prefix="/projects", tags=["jobs"])

ACTIVE_JOB_STATUSES = (
    JobStatus.QUEUED.value,
    JobStatus.RUNNING.value,
    JobStatus.RETRYING.value,
)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: UUID, db: DbDep, user: CurrentUser) -> JobOut:
    job = db.execute(
        select(Job)
        .join(Project, Project.id == Job.project_id)
        .where(
            Job.id == job_id,
            Project.user_id == user.id,
            Project.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if job is None:
        raise NotFoundError("Job not found.")

    return JobOut.from_job(job)


@project_jobs_router.get("/{project_id}/jobs", response_model=list[JobOut])
def list_project_jobs(
    project: OwnedProject,
    db: DbDep,
    active: bool = False,
) -> list[JobOut]:
    statement = select(Job).where(Job.project_id == project.id)

    if active:
        statement = statement.where(Job.status.in_(ACTIVE_JOB_STATUSES))

    jobs = db.execute(statement.order_by(Job.created_at.desc())).scalars().all()

    return [JobOut.from_job(job) for job in jobs]
