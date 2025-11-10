## Recalibra Architecture Overview

### Goals
- Continuously monitor computational biology model performance across heterogeneous lab ecosystems.
- Detect drift with respect to reagents, instruments, and operator changes.
- Automate recalibration via retraining or correction layers.
- Provide auditable history for compliance.

### High-Level Components
- **Ingestion Connectors**: Pull predictions (MOE, Benchling exports, custom pipelines) and experimental outcomes (Benchling, LIMS, ELN). Normalize into a shared schema keyed by molecule, assay, and context metadata (reagent batch, instrument, operator, protocol version).
- **Data Lake & Feature Store**: Persist normalized prediction/outcome pairs (e.g., Postgres + Parquet in object storage). Maintain features for drift diagnostics and retraining.
- **Monitoring Service**: Computes accuracy KPIs (RMSE, R², MAE) and distributional drift metrics (KS test, PSI, rolling means). Generates alerts and root-cause analysis.
- **Recalibration Engine**: Orchestrates retraining for open models, builds correction models for closed systems, and version-controls resulting artifacts.
- **Orchestrator / Scheduler**: Coordinates periodic ingestion, monitoring, and update pipelines (e.g., Celery/Redis or temporal workflow).
- **Dashboard & SDK**: Real-time UI for accuracy, drift, recalibration history. SDK for integrations and automation (Python package).
- **Audit & Compliance Layer**: Immutable log of data sources, training runs, model versions, decision trace.

### Data Flow
1. Connectors load predictions and experimental results via APIs, webhooks, or batch.
2. A normalization pipeline enriches with metadata, writes to storage, and publishes events.
3. Monitoring service consumes new data, updates metrics, raises alerts if thresholds breached.
4. Recalibration engine reacts to alerts; selects strategy (retrain vs correction). Schedules pipeline.
5. Updated models/corrections deployed via SDK endpoints. Dashboard displays lineage and metrics.

### Technology Choices (initial)
- **Backend**: FastAPI + SQLModel for REST and background jobs.
- **Tasks**: Celery with Redis backend (pluggable to cloud alternatives).
- **Storage**: Postgres (metadata), Parquet (historical data). Local setup uses SQLite for ease.
- **Data Processing**: Pandas, SciPy, NumPy, scikit-learn.
- **Drift Detection**: SciPy (KS), sklearn (PSI), custom analyzers.
- **Model Registry**: Lightweight file storage with versioning; later integrate MLflow.
- **Frontend**: React + Vite + Tailwind (initial stub); real-time via websockets/polling.
- **SDK**: Python package `recalibra_sdk` for programmatic ingestion, querying, triggering recalibration.

### Module Breakdown
- `services/api`: REST endpoints for integrations, metrics, alerts.
- `services/worker`: Background task runner (Celery) for ingestion, drift checks, retraining.
- `connectors/`: Source-specific adapters (Benchling, MOE, CSV).
- `pipelines/`: Data normalization, drift detection, retraining strategies.
- `sdk/`: Python client library and CLI commands.
- `dashboard/`: Frontend application consuming API.
- `infra/`: Configuration, docker-compose for local dev.
- `tests/`: Unit/integration tests with realistic fixtures.

### Next Steps
1. Scaffold repository structure with pyproject-based monorepo (Poetry) and shared config.
2. Implement core domain models (PredictionRecord, OutcomeRecord, AssayContext).
3. Build ingestion pipeline skeleton + mock connectors.
4. Implement monitoring service with metric computation stubs and thresholds.
5. Create recalibration strategy interfaces (retrain, correction) with placeholders.
6. Scaffold dashboard and SDK packages.
7. Add CI workflows, linting, typing, tests.

