# Recalibra Setup Instructions

## Quick Start

### Prerequisites
- Python 3.8+ (Python 3.11 recommended)
- Node.js 18+
- npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd recalibra
   ```

2. **Set up Python environment:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up frontend:**
   ```bash
   cd ../frontend
   npm install --legacy-peer-deps
   ```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
BROWSER=none npm start
```

### Access the Application

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

### Using the Startup Script

Alternatively, use the automated startup script:
```bash
./start-dev.sh
```

## Project Structure

```
recalibra/
├── backend/          # FastAPI backend
│   ├── main.py      # API endpoints
│   ├── models.py    # Database models
│   ├── schemas.py   # Pydantic schemas
│   └── ...
├── frontend/         # React frontend
│   ├── src/
│   └── ...
└── README.md
```

## Features

- ✅ Model drift detection (KS tests, PSI, KL divergence)
- ✅ Model accuracy tracking (RMSE, MAE, R²)
- ✅ API integrations (Benchling, MOE - mock data)
- ✅ Real-time dashboard
- ✅ SQLite database (development)

## Troubleshooting

**Backend won't start:**
- Make sure Python 3.8+ is installed
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

**Frontend won't start:**
- Make sure Node.js 18+ is installed
- Install dependencies: `npm install --legacy-peer-deps`
- Check port 3000 is available

**Database errors:**
- Delete `backend/recalibra.db` and restart
- The database will be recreated automatically

