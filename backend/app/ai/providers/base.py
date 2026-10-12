from typing import Protocol

from pydantic import BaseModel

from app.ai.schemas import EmbeddingResult, EmbeddingTask, GenerationRequest, GenerationResult, StructuredResult


class ChatProvider(Protocol):
    name: str

    def generate(self, req: GenerationRequest, *, model: str, effort: str) -> GenerationResult: ...

    def generate_structured[T: BaseModel](
        self, req: GenerationRequest, schema: type[T], *, model: str, effort: str
    ) -> StructuredResult[T]: ...


class EmbeddingProvider(Protocol):
    name: str
    dim: int

    def embed(self, texts: list[str], *, task: EmbeddingTask) -> EmbeddingResult: ...
