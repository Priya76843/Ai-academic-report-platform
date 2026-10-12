"""FastAPI dependencies shared by every router. Ownership failures return 404, never 403 (contract §1)."""

import uuid
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, UnauthenticatedError
from app.db.session import get_db
from app.modules.auth.service import get_user_for_token
from app.modules.projects.models import Project
from app.modules.users.models import User

DbDep = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: DbDep) -> User:
    token = request.cookies.get(get_settings().session_cookie_name)
    if not token:
        raise UnauthenticatedError("Sign in to continue.")
    user = get_user_for_token(db, token)
    if user is None:
        raise UnauthenticatedError("Your session has expired. Sign in again.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_owned_project(project_id: uuid.UUID, db: DbDep, user: CurrentUser) -> Project:
    project = db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id, Project.deleted_at.is_(None))
    ).scalar_one_or_none()
    if project is None:
        raise NotFoundError("Project not found.")
    return project


OwnedProject = Annotated[Project, Depends(get_owned_project)]
