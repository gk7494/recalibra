# Recalibra Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB of available RAM
- Ports 3000, 5432, and 8000 available

## Getting Started

1. **Start the platform:**
   ```bash
   ./start.sh
   ```
   
   Or manually:
   ```bash
   docker-compose up -d
   ```

2. **Access the services:**
   - **Dashboard**: http://localhost:3000
   - **API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs

3. **Stop the platform:**
   ```bash
   docker-compose down
   ```

## First Steps

1. **Create a Model:**
   - Go to the Models page
   - Use the API or dashboard to create a model
   - Example API call:
     ```bash
     curl -X POST http://localhost:8000/api/models \
       -H "Content-Type: application/json" \
       -d '{
         "name": "MOE Docking Model",
         "model_type": "closed",
         "source_system": "MOE",
         "version": "1.0"
       }'
     ```

2. **Sync Data:**
   - Go to the Sync page
   - Click "Sync Benchling" to fetch experimental results (mock data in sandbox mode)
   - Click "Sync" next to a model to fetch predictions from MOE (mock data)

3. **Check for Drift:**
   - Go to the Models page
   - Select a model
   - Click "Check for Drift" to run drift detection

4. **View Dashboard:**
   - The dashboard shows model accuracy over time
   - R² scores, RMSE, and drift detection results are visualized

## API Endpoints

### Models
- `GET /api/models` - List all models
- `POST /api/models` - Create a model
- `GET /api/models/{id}` - Get model details
- `GET /api/models/{id}/metrics` - Get model accuracy metrics
- `POST /api/models/{id}/retrain` - Retrain model

### Drift Detection
- `POST /api/drift/check/{model_id}` - Run drift detection
- `GET /api/drift/checks/{model_id}` - Get drift check history

### Data Sync
- `POST /api/sync/benchling` - Sync from Benchling
- `POST /api/sync/moe?model_id={id}` - Sync from MOE

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## Troubleshooting

- **Port already in use**: Stop other services using ports 3000, 5432, or 8000
- **Docker issues**: Ensure Docker Desktop is running
- **Database connection errors**: Wait a few seconds for PostgreSQL to initialize
- **Frontend not loading**: Check that the backend API is running on port 8000

## Next Steps

- Configure real Benchling API credentials in `.env`
- Set up MOE integration for your environment
- Add more models and experimental data
- Set up automated drift checks with Airflow (coming soon)

