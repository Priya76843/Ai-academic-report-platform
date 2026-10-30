import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.modules.projects.enums import CitationStyle, ProjectStatus, ReportType
from app.modules.projects.idempotency_models import ProjectIdempotencyKey
from app.modules.projects.models import Project
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectOut,
    ProjectPatch,
    SourceCounts,
)
from app.modules.projects.status_service import ProjectStatusService


def _request_hash(data: ProjectCreate) -> str:
    payload = json.dumps(
        data.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def create_project(
    db: Session,
    *,
    user_id: uuid.UUID,
    data: ProjectCreate,
    idempotency_key: str,
) -> Project:
    if not idempotency_key.strip():
        raise ConflictError(
            "Idempotency-Key must contain 1 to 255 characters.",
            code="INVALID_IDEMPOTENCY_KEY",
            status_code=400,
        )

    now = datetime.now(UTC)
    request_hash = _request_hash(data)

    try:
        with db.begin_nested():
            statement = (
                insert(ProjectIdempotencyKey)
                .values(
                    user_id=user_id,
                    key=idempotency_key,
                    request_hash=request_hash,
                    response={},
                    expires_at=now + timedelta(hours=24),
                )
                .on_conflict_do_nothing(constraint="uq_project_idempotency_keys_user_key")
                .returning(ProjectIdempotencyKey.id)
            )
            key_id = db.execute(statement).scalar_one_or_none()

            if key_id is None:
                existing = db.execute(
                    select(ProjectIdempotencyKey).where(
                        ProjectIdempotencyKey.user_id == user_id,
                        ProjectIdempotencyKey.key == idempotency_key,
                    )
                ).scalar_one()

                if existing.expires_at <= now:
                    db.delete(existing)
                    db.flush()
                    db.add(
                        ProjectIdempotencyKey(
                            user_id=user_id,
                            key=idempotency_key,
                            request_hash=request_hash,
                            response={},
                            expires_at=now + timedelta(hours=24),
                        )
                    )
                    db.flush()
                    key_id = db.execute(
                        select(ProjectIdempotencyKey.id).where(
                            ProjectIdempotencyKey.user_id == user_id,
                            ProjectIdempotencyKey.key == idempotency_key,
                        )
                    ).scalar_one()

                elif existing.request_hash != request_hash:
                    raise ConflictError(
                        "This Idempotency-Key was already used with a different request.",
                        code="IDEMPOTENCY_KEY_REUSED",
                    )

                else:
                    project_id = existing.response.get("project_id")

                    if not project_id:
                        raise ConflictError(
                            "A request with this Idempotency-Key is already being processed.",
                            code="IDEMPOTENCY_REQUEST_IN_PROGRESS",
                        )

                    project = db.execute(
                        select(Project).where(
                            Project.id == uuid.UUID(project_id),
                            Project.user_id == user_id,
                            Project.deleted_at.is_(None),
                        )
                    ).scalar_one_or_none()

                    if project is None:
                        raise ConflictError(
                            "The original project for this Idempotency-Key is unavailable.",
                            code="IDEMPOTENCY_RESULT_UNAVAILABLE",
                        )

                    return project

            project = Project(
                user_id=user_id,
                report_type=data.report_type.value,
                title=data.title,
                topic=data.topic,
                description=data.description,
                target_pages=data.target_pages,
                citation_style=(data.citation_style.value if data.citation_style else None),
                details={},
            )

            ProjectStatusService.recompute(project)

            db.add(project)
            db.flush()

            key_record = db.execute(
                select(ProjectIdempotencyKey).where(
                    ProjectIdempotencyKey.user_id == user_id,
                    ProjectIdempotencyKey.key == idempotency_key,
                )
            ).scalar_one()

            key_record.response = {"project_id": str(project.id)}
            key_record.expires_at = now + timedelta(hours=24)

        db.commit()
        db.refresh(project)
        return project

    except Exception:
        db.rollback()
        raise


def list_projects(
    db: Session,
    *,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Project], int]:
    filters = (
        Project.user_id == user_id,
        Project.deleted_at.is_(None),
    )

    total = db.scalar(select(func.count()).select_from(Project).where(*filters)) or 0

    items = db.scalars(
        select(Project)
        .where(*filters)
        .order_by(Project.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return list(items), total


def build_project_response(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        report_type=ReportType(project.report_type),
        title=project.title,
        topic=project.topic,
        description=project.description,
        target_pages=project.target_pages,
        citation_style=(CitationStyle(project.citation_style) if project.citation_style else None),
        status=ProjectStatus(project.status),
        template_name=None,
        source_counts=SourceCounts(),
        sections_approved=0,
        sections_total=0,
        details=project.details,
        logo_asset_id=project.logo_asset_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def update_project(
    db: Session,
    *,
    project: Project,
    data: ProjectPatch,
) -> Project:
    update = data.model_dump(exclude_unset=True)

    for field, value in update.items():
        if field == "details":
            if data.details is None:
                continue
            value = data.details.model_dump(mode="json")

        elif field == "citation_style" and value is not None:
            value = value.value

        setattr(project, field, value)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def delete_project(
    db: Session,
    *,
    project: Project,
) -> None:
    project.deleted_at = datetime.now(UTC)
    db.add(project)
    db.commit()
