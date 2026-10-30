from typing import Annotated

from fastapi import APIRouter, Header, Query, status

from app.api.deps import CurrentUser, DbDep, OwnedProject
from app.modules.projects.schemas import ProjectCreate, ProjectListOut, ProjectOut, ProjectPatch
from app.modules.projects.service import (
    build_project_response,
    create_project,
    delete_project,
    list_projects,
    update_project,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectOut)
def create_project_endpoint(
    data: ProjectCreate,
    db: DbDep,
    user: CurrentUser,
    idempotency_key: Annotated[
        str,
        Header(alias="Idempotency-Key", min_length=1, max_length=255),
    ],
):
    project = create_project(
        db,
        user_id=user.id,
        data=data,
        idempotency_key=idempotency_key,
    )
    return build_project_response(project)


@router.get("", response_model=ProjectListOut)
def list_projects_endpoint(
    db: DbDep,
    user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    items, total = list_projects(
        db,
        user_id=user.id,
        page=page,
        page_size=page_size,
    )

    return {
        "items": [build_project_response(project) for project in items],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


@router.get("/{project_id}", response_model=ProjectOut)
def get_project_endpoint(
    project: OwnedProject,
):
    return build_project_response(project)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project_endpoint(
    project: OwnedProject,
    data: ProjectPatch,
    db: DbDep,
):
    updated_project = update_project(
        db,
        project=project,
        data=data,
    )
    return build_project_response(updated_project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_endpoint(
    project: OwnedProject,
    db: DbDep,
):
    delete_project(
        db=db,
        project=project,
    )
    return None
