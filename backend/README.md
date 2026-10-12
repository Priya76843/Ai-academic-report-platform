# backend
FastAPI modular monolith + Celery workers. See `docs/runbooks/local-setup.md` at the repo root.
```
app/core        config, logging, errors, security      app/ai        gateway, routing, cost, providers, prompts
app/db          base, session, model registry          app/workers   celery app + one tasks module per queue
app/api/v1      thin routers only                      alembic/      migrations (never edit the DB by hand)
app/modules/*   one package per bounded module         tests/        unit (no DB) · api (needs make up)
```
Rules: routers call module services; prompts live in `app/ai/prompts`; provider SDKs only under `app/ai/providers`;
no `utils.py` dumping ground; every schema change is an Alembic migration; uploaded code is never executed.
