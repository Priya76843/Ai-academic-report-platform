.PHONY: up down logs migrate api worker web test test-backend test-frontend lint fmt openapi
up:            ## start postgres, redis, localstack
	docker compose up -d postgres redis localstack
up-all:        ## also build and run api + worker in containers
	docker compose --profile app up -d --build
down:
	docker compose --profile app down
logs:
	docker compose logs -f --tail=100
migrate:
	cd backend && uv run alembic upgrade head
api:           ## run the API locally with reload
	cd backend && uv run uvicorn app.main:app --reload --port 8000
worker:
	cd backend && uv run celery -A app.workers.celery_app:celery_app worker -Q ingestion,generation,export -l INFO
web:
	cd frontend && npm run dev
test: test-backend test-frontend
test-backend:
	cd backend && uv run pytest -q
test-frontend:
	cd frontend && npm test -- --run
lint:
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app
	cd frontend && npm run lint && npm run typecheck
fmt:
	cd backend && uv run ruff format . && uv run ruff check --fix .
openapi:       ## export the OpenAPI snapshot the frontend types are generated from
	cd backend && uv run python ../scripts/dev/export_openapi.py ../docs/api/openapi.json
	cd frontend && npm run gen:api
