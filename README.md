# Recalibra - Model Drift Detection Platform

Recalibra is a platform for tracking and fixing model drift in biotech labs. It integrates with Benchling and MOE to monitor ML model performance and automatically detect when models need retraining.

## Features (Simplified MVP)

- 🔍 **Drift Detection**: Statistical tests (KS, PSI) to detect model drift
- 🔄 **API Integration**: Connect to Benchling (experimental results) and MOE (predictions)
- 🤖 **Model Retraining**: Retrain models with correction layers
- 📊 **Dashboard**: Monitor model performance and drift metrics
- 🎨 **Simple UI**: Clean interface for managing models and data

**Note**: This is a simplified version for local development. Complex features (WebSocket, background tasks, MLflow, AWS) have been removed.

## API Integration

### Benchling Integration

To connect to the real Benchling API:

1. Get your API key from [Benchling Settings](https://benchling.com/settings/api)
2. Set environment variable:
   ```bash
   export BENCHLING_API_KEY=your_api_key_here
   ```
3. Optionally set custom API URL:
   ```bash
   export BENCHLING_API_URL=https://api.benchling.com/v2
   ```

Without an API key, the system uses realistic mock data for demo purposes.

### MOE Integration

MOE typically doesn't have a REST API. The system supports:

1. **Custom API Endpoint**: If you have a MOE API wrapper:
   ```bash
   export MOE_API_URL=http://your-moe-api:8080
   export MOE_API_KEY=your_api_key_here
   ```

2. **Mock Data**: By default, uses realistic mock predictions based on docking scores

3. **File/Database Integration**: Can be extended to read from MOE exports or database connections

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 14+
- SQLite (included with Python)

### Installation

1. Backend setup:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Frontend setup:
   ```bash
   cd frontend
   npm install
   ```

### Running

**Option 1: Use the startup script (easiest)**
```bash
./start.sh
```

**Option 2: Manual start**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
./start_backend.sh

# Terminal 2 - Frontend
cd frontend
npm start
```

Access:
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Demo Data

Seed sandbox data with drift:
```bash
# Via API
curl -X POST http://localhost:8000/api/sandbox/seed

# Or use the frontend - click "Seed Sandbox Data" on the home page
```

## API Endpoints

### Core Endpoints
- `GET /api/labs` - List all labs
- `POST /api/labs` - Create a lab
- `GET /api/models` - List all models
- `POST /api/models` - Create a model
- `GET /api/models/{model_id}` - Get model details
- `GET /api/models/{model_id}/metrics` - Get metrics (RMSE, MAE, R²) grouped by time buckets
- `GET /api/models/{model_id}/drift` - Check for drift (baseline vs recent window)
- `GET /api/datasets` - List all datasets
- `POST /api/datasets` - Create a dataset
- `POST /api/datasets/{dataset_id}/upload` - Upload CSV file of records
- `GET /api/datasets/{dataset_id}/records` - Get records for a dataset
- `POST /api/sandbox/seed` - Seed sandbox data with drift

See full API documentation at http://localhost:8000/docs

## Demo Data

To populate the database with realistic demo data:

```bash
cd backend
source venv/bin/activate
python populate_complete_demo.py
```

This creates models, predictions, assay results, and drift checks.

## API Endpoints

Core endpoints:
- `GET /api/models` - List all models
- `POST /api/ingest/moe` - Upload MOE predictions CSV
- `POST /api/sync/benchling` - Sync Benchling assay results
- `GET /api/models/{id}/metrics` - Get model metrics
- `POST /api/models/{id}/check_drift` - Run drift detection
- `POST /api/models/{id}/retrain` - Retrain model
- `GET /api/drift-checks` - View drift check history

See full API documentation at http://localhost:8000/docs

## Architecture

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Drift Detection**: scipy, sklearn
- **Visualization**: Plotly

## License

MIT

# Recalibra

Recalibra automatically keeps computational biology models accurate as lab conditions change.

## Overview

Recalibra connects to biotech systems (MOE, Benchling, LIMS) to track model predictions against experimental results, detect drift using statistical tests, and automatically update models when accuracy degrades.

## Tech Stack

- **Backend**: FastAPI, PostgreSQL/SQLite, SQLAlchemy
- **Frontend**: React, Plotly, TypeScript
- **ML/Analytics**: scikit-learn, statsmodels, PyTorch, pandas
- **Infrastructure**: Docker (optional), AWS S3 (planned), Airflow (planned)

## Quick Start

### Option 1: Docker (Recommended for Production)

1. **Start Docker Desktop** (if not already running)

2. **Start the platform:**
   ```bash
   ./start.sh
   ```

3. **Access:**
   - API: http://localhost:8000
   - Dashboard: http://localhost:3000
   - API Docs: http://localhost:8000/docs

4. **Stop:**
   ```bash
   docker-compose down
   ```

### Option 2: Development Mode (No Docker Required)

1. **Start in development mode:**
   ```bash
   ./start-dev.sh
   ```

   This will:
   - Use SQLite instead of PostgreSQL (no database setup needed)
   - Run backend and frontend directly on your machine
   - Auto-reload on code changes

2. **Access:**
   - API: http://localhost:8000
   - Dashboard: http://localhost:3000
   - API Docs: http://localhost:8000/docs

3. **Stop:**
   ```bash
   ./stop-dev.sh
   ```

## Features

- ✅ API integrations with Benchling and MOE (sandbox/mock)
- ✅ Drift detection (KS tests, PSI, KL divergence)
- ✅ Model accuracy tracking (RMSE, MAE, R²)
- ✅ Automatic model retraining/correction
- ✅ Real-time dashboard with visualizations
- ✅ Data versioning and audit trails

## Project Structure

```
recalibra/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── api/             # API routers
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic (metrics, drift)
│   │   └── core/            # Config, database
│   ├── tests/               # Pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   └── services/        # API client
│   └── package.json
├── docker-compose.yml
├── start.sh                 # Docker startup
├── start-dev.sh             # Development startup (no Docker)
└── README.md
```

## Troubleshooting

- **Docker not running**: Use `./start-dev.sh` instead
- **Port already in use**: Stop other services using ports 3000, 5432, or 8000
- **Database connection errors**: Development mode uses SQLite automatically
- **Frontend not loading**: Check that the backend API is running on port 8000

## Next Steps

See [QUICKSTART.md](QUICKSTART.md) for detailed usage instructions.
