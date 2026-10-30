from app.modules.projects.enums import ProjectStatus
from app.modules.projects.models import Project


class ProjectStatusService:
    @staticmethod
    def recompute(project: Project) -> ProjectStatus:
        project.status = ProjectStatus.DRAFT.value
        return ProjectStatus.DRAFT
