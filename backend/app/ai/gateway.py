"""The only door to model providers (CLAUDE.md §22). Routes by task class, stamps cost and duration on usage.
B-12 adds the Anthropic provider and the real embedding provider behind the same interface."""

import time

from pydantic import BaseModel

from app.ai.cost import estimate_cost_inr
from app.ai.providers.base import ChatProvider, EmbeddingProvider
from app.ai.providers.fake import FakeChatProvider, FakeEmbeddingProvider
from app.ai.routing import route
from app.ai.schemas import EmbeddingResult, EmbeddingTask, GenerationRequest, GenerationResult, StructuredResult, Usage
from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

MODEL_ALIASES: dict[str, dict[str, str]] = {  # provider -> alias -> concrete model id
    "fake": {"default": "fake"},
    "anthropic": {"default": "claude-opus-5"},
}


class LLMGateway:
    def __init__(self, chat: ChatProvider, embeddings: EmbeddingProvider) -> None:
        self.chat = chat
        self.embeddings = embeddings

    def _model(self, alias: str) -> str:
        return MODEL_ALIASES.get(self.chat.name, {}).get(alias, alias)

    def _finish(self, usage: Usage, started: float, req: GenerationRequest | None = None) -> Usage:
        usage.duration_ms = int((time.perf_counter() - started) * 1000)
        usage.estimated_cost_inr = estimate_cost_inr(usage.model, usage.input_tokens, usage.output_tokens)
        log.info(
            "llm_call",
            provider=usage.provider,
            model=usage.model,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            estimated_cost_inr=usage.estimated_cost_inr,
            duration_ms=usage.duration_ms,
            **(req.metadata if req else {}),
        )
        return usage

    def generate(self, req: GenerationRequest) -> GenerationResult:
        alias, effort = route(req.task_class)
        started = time.perf_counter()
        result = self.chat.generate(req, model=self._model(alias), effort=effort)
        result.usage = self._finish(result.usage, started, req)
        return result

    def generate_structured[T: BaseModel](self, req: GenerationRequest, schema: type[T]) -> StructuredResult[T]:
        alias, effort = route(req.task_class)
        started = time.perf_counter()
        result = self.chat.generate_structured(req, schema, model=self._model(alias), effort=effort)
        result.usage = self._finish(result.usage, started, req)
        return result

    def embed(self, texts: list[str], *, task: EmbeddingTask) -> EmbeddingResult:
        started = time.perf_counter()
        result = self.embeddings.embed(texts, task=task)
        result.usage = self._finish(result.usage, started)
        return result


def build_gateway() -> LLMGateway:
    s = get_settings()
    if s.llm_provider != "fake" or s.embedding_provider != "fake":
        raise NotImplementedError(
            "Real providers arrive in ticket B-12; set LLM_PROVIDER=fake and EMBEDDING_PROVIDER=fake"
        )
    return LLMGateway(FakeChatProvider(), FakeEmbeddingProvider(s.embedding_dim))
