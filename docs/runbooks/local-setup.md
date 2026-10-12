# Local setup

## Prerequisites
Docker Desktop, Node 22, `uv` (`brew install uv`). No local Postgres or Python install is needed; `uv` manages Python 3.12.

## First run
```bash
cp .env.example .env            # fill SECRET_KEY with any long random string
make up                         # postgres (pgvector), redis, localstack S3; creates databases and the bucket
cd backend && uv sync && cd ..  # installs Python 3.12 + dependencies into backend/.venv
make migrate                    # alembic upgrade head
make api                        # http://localhost:8000/api/v1/health ; docs at /docs
cd frontend && npm install && npm run dev   # http://localhost:5173 (mock API by default)
```
Switch the frontend to the real API with `VITE_API_MODE=real npm run dev`; Vite proxies `/api` to port 8000 so the session cookie is same-origin.

## Everyday
- `make test` runs backend (pytest, needs `make up`) and frontend (vitest) suites.
- `make lint` runs ruff, mypy, eslint and tsc.
- `make worker` starts a Celery worker on the three queues.
- `make openapi` regenerates `docs/api/openapi.json` and the frontend's generated types. Run it whenever a route or schema changes and commit both files.

## Troubleshooting
- `relation does not exist`: run `make migrate`.
- Tests fail connecting to the database: `make up`, then check `TEST_DATABASE_URL` in `.env`.
- Presigned PUT from the browser fails with CORS: the bucket CORS is set by `scripts/dev/localstack-init.sh`; `docker compose restart localstack` re-runs it.
- LocalStack is pinned to `4.13.1`, the last line that runs without an account. Newer `2026.x` images exit at start unless `LOCALSTACK_AUTH_TOKEN` is set (free account at app.localstack.cloud). Do not bump the tag without deciding that.
- Postgres is published on host port **5433** (5432 is commonly taken by other local databases); containers still talk to it on 5432.
- `uv` not found after install: open a new shell or `export PATH="/opt/homebrew/bin:$PATH"`.
