"""Token prices in USD per million tokens, converted to INR with the configured rate. Re-verify quarterly."""

from app.core.config import get_settings

USD_PER_MTOK: dict[str, tuple[float, float]] = {  # model id -> (input, output)
    "claude-opus-5": (5.0, 25.0),
    "claude-sonnet-5": (2.0, 10.0),
    "claude-haiku-4-5": (1.0, 5.0),
    "fake": (0.0, 0.0),
}


def estimate_cost_inr(model: str, input_tokens: int, output_tokens: int) -> float:
    inp, out = USD_PER_MTOK.get(model, (0.0, 0.0))
    usd = (input_tokens * inp + output_tokens * out) / 1_000_000
    return round(usd * get_settings().usd_inr_rate, 4)
