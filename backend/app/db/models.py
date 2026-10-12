"""Single import point for all ORM models (used by Alembic and tests)."""

from app.modules.auth.models import Session  # noqa: F401
from app.modules.jobs.models import Job  # noqa: F401
from app.modules.projects.models import Project  # noqa: F401
from app.modules.users.models import User  # noqa: F401
