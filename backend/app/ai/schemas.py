"""Gateway contracts (api-contracts-v1 §5). Providers implement these; application code never sees SDK types."""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class TaskClass(StrEnum):
    """Routing key. Maps to a model alias and an effort level in routing.py."""

    METADATA_EXTRACTION = "metadata_extraction"
    CLASSIFICATION = "classification"
    SUMMARY = "summary"
    SECTION_DRAFT = "section_draft"
    PLANNING = "planning"
    CONSISTENCY = "consistency"
    PROOFREAD = "proofread"


class EmbeddingTask(StrEnum):
    DOCUMENT = "document"
    QUERY = "query"


class Usage(BaseModel):
    provider: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_inr: float = 0.0
    duration_ms: int = 0


class GenerationRequest(BaseModel):
    task_class: TaskClass
    system: str
    user: str
    max_tokens: int = 4096
    metadata: dict[str, Any] = Field(default_factory=dict)  # project_id, job_id, prompt_name, prompt_version


class GenerationResult(BaseModel):
    text: str
    usage: Usage


class StructuredResult[T: BaseModel](BaseModel):
    data: T
    usage: Usage
    repaired: bool = False


class EmbeddingResult(BaseModel):
    vectors: list[list[float]]
    usage: Usage
