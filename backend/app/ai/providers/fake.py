"""Deterministic provider for tests and local development. Never calls a network.

generate_structured returns a canned payload registered per schema name, so tests control exactly what the
"model" says (including an invalid citation, to exercise the citation gate)."""

import hashlib
import math
from typing import Any

from pydantic import BaseModel

from app.ai.schemas import EmbeddingResult, EmbeddingTask, GenerationRequest, GenerationResult, StructuredResult, Usage
from app.core.exceptions import ProviderError


class FakeChatProvider:
    name = "fake"

    def __init__(self, canned: dict[str, dict[str, Any]] | None = None) -> None:
        self.canned = canned or {}
        self.calls: list[GenerationRequest] = []

    def _usage(self, model: str, req: GenerationRequest, out_len: int) -> Usage:
        return Usage(
            provider=self.name, model=model, input_tokens=len(req.system + req.user) // 4, output_tokens=out_len // 4
        )

    def generate(self, req: GenerationRequest, *, model: str, effort: str) -> GenerationResult:
        self.calls.append(req)
        digest = hashlib.sha256(req.user.encode()).hexdigest()[:12]
        text = f"[fake:{req.task_class}:{effort}:{digest}]"
        return GenerationResult(text=text, usage=self._usage(model, req, len(text)))

    def generate_structured[T: BaseModel](
        self, req: GenerationRequest, schema: type[T], *, model: str, effort: str
    ) -> StructuredResult[T]:
        self.calls.append(req)
        payload = self.canned.get(schema.__name__)
        if payload is None:
            raise ProviderError(f"FakeChatProvider has no canned output for {schema.__name__}", category="internal")
        data = schema.model_validate(payload)
        return StructuredResult[T](data=data, usage=self._usage(model, req, len(str(payload))))


class FakeEmbeddingProvider:
    """Hash-seeded unit vectors: identical text → identical vector; different text → different vector."""

    name = "fake"

    def __init__(self, dim: int) -> None:
        self.dim = dim
        self.calls = 0

    def embed(self, texts: list[str], *, task: EmbeddingTask) -> EmbeddingResult:
        self.calls += 1
        vectors: list[list[float]] = []
        for t in texts:
            seed = hashlib.sha256(t.encode()).digest()
            raw = [((seed[i % 32] * (i + 1)) % 251) / 251.0 - 0.5 for i in range(self.dim)]
            norm = math.sqrt(sum(x * x for x in raw)) or 1.0
            vectors.append([x / norm for x in raw])
        return EmbeddingResult(
            vectors=vectors, usage=Usage(provider=self.name, model="fake", input_tokens=sum(len(t) for t in texts) // 4)
        )
