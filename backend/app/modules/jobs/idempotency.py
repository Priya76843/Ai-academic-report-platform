import hashlib
import json
from collections.abc import Callable
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.jobs.models import OperationReceipt


class IdempotencyConflictError(ValueError):
    """Raised when an operation key is reused with different input."""


def _hash_input(input_data: dict[str, Any]) -> str:
    """Return a stable SHA-256 hash for JSON-compatible input."""
    canonical = json.dumps(
        input_data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def execute_idempotently(
    *,
    job_id: UUID,
    operation_key: str,
    input_data: dict[str, Any],
    operation: Callable[[Session], dict[str, Any]],
) -> dict[str, Any]:
    """Execute an operation once and persist its receipt atomically.

    The callback must perform database writes only through the supplied
    session. It must not perform external side effects.
    """
    if not operation_key or len(operation_key) > 200:
        raise ValueError("operation_key must contain 1–200 characters")

    input_hash = _hash_input(input_data)

    with SessionLocal() as db, db.begin():
        receipt_id = db.execute(
            insert(OperationReceipt)
            .values(
                job_id=job_id,
                operation_key=operation_key,
                input_hash=input_hash,
                result={},
            )
            .on_conflict_do_nothing(
                constraint="uq_operation_receipts_operation_key",
            )
            .returning(OperationReceipt.id)
        ).scalar_one_or_none()

        if receipt_id is None:
            receipt = db.execute(
                select(OperationReceipt).where(
                    OperationReceipt.operation_key == operation_key,
                )
            ).scalar_one()

            if receipt.input_hash != input_hash:
                raise IdempotencyConflictError("Operation key was already used with different input")

            if receipt.job_id != job_id:
                raise IdempotencyConflictError("Operation key belongs to a different job")

            return receipt.result

        result = operation(db)

        created_receipt = db.get(OperationReceipt, receipt_id)
        if created_receipt is None:  # pragma: no cover
            raise RuntimeError("Operation receipt disappeared during execution")

        created_receipt.result = result
        return result
