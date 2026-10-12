"""Task class → model alias + effort. One provider, effort as the cost lever (plan decision D-3).
Aliases resolve to concrete model ids per provider in providers/*.py so a model swap is one line here."""

from app.ai.schemas import TaskClass

ROUTES: dict[TaskClass, tuple[str, str]] = {
    TaskClass.METADATA_EXTRACTION: ("default", "low"),
    TaskClass.CLASSIFICATION: ("default", "low"),
    TaskClass.SUMMARY: ("default", "low"),
    TaskClass.SECTION_DRAFT: ("default", "medium"),
    TaskClass.PLANNING: ("default", "high"),
    TaskClass.CONSISTENCY: ("default", "high"),
    TaskClass.PROOFREAD: ("default", "low"),
}


def route(task: TaskClass) -> tuple[str, str]:
    return ROUTES[task]
