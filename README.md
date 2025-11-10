# Recalibra

Recalibra keeps computational biology models calibrated as lab conditions evolve. It connects to modeling tools (e.g. MOE) and experimental systems (e.g. Benchling, LIMS), aligns predictions with outcomes, watches for drift, and automatically retrains or applies correction layers.

## Repository Layout

- `src/recalibra/`: Shared domain layer, pipelines, and strategies.
- `services/api/`: FastAPI service exposing ingestion, monitoring, and recalibration endpoints.
- `services/worker/`: Celery worker for scheduled background jobs.
- `docs/`: Architecture and design notes.
- `tests/`: Pytest-based unit tests.
- `infra/`: Deployment aids (e.g., Docker Compose) — to be populated.

## Getting Started

```bash
poetry install
poetry run uvicorn services.api.main:app --reload
```

Visit `http://localhost:8000/docs` for the OpenAPI interface.

Run the Celery worker in another shell:

```bash
poetry run celery -A services.worker.worker.celery_app worker --loglevel=info
```

Execute unit tests:

```bash
poetry run pytest
```

## Next Steps

- Implement real Benchling, MOE, and LIMS connectors.
- Persist data in Postgres instead of the in-memory store.
- Build the dashboard frontend (React) to stream metrics.
- Expand compliance logging (dataset lineage, model registry auditing).
