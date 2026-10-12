from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbDep
from app.core.exceptions import NotFoundError
from app.modules.jobs.models import Job
from app.modules.jobs.schemas import JobOut
from app.modules.projects.models import Project

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: UUID, db: DbDep, user: CurrentUser) -> JobOut:
    job = db.execute(
        select(Job).join(Project, Project.id == Job.project_id).where(Job.id == job_id, Project.user_id == user.id)
    ).scalar_one_or_none()
    if job is None:
        raise NotFoundError("Job not found.")
    return JobOut.from_job(job)
