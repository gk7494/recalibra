# Recalibra Setup Guide

## Quick Start (Recommended)

Run the development startup script:

```bash
cd recalibra
./start-dev.sh
```

This will automatically:
- Set up Python virtual environment
- Install all dependencies
- Create SQLite database
- Start backend (port 8000) and frontend (port 3000)

## Manual Setup (If script fails)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set database URL (SQLite for development)
export DATABASE_URL="sqlite:///./recalibra.db"

# Create database tables
python -c "from database import engine, Base; from models import *; Base.metadata.create_all(bind=engine)"

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
BROWSER=none npm start
```

## Troubleshooting

### Port Already in Use

If port 8000 or 3000 is already in use:

```bash
# Find what's using the port
lsof -i :8000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Python Version Issues

Requires Python 3.8+. Check your version:
```bash
python3 --version
```

If you have an older version, install Python 3.8+ or use pyenv.

### Node Version Issues

Requires Node.js 18+. Check your version:
```bash
node --version
```

If you have an older version, install Node.js 18+ or use nvm.

### Virtual Environment Issues

If the venv doesn't activate properly:
```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database Issues

If you get database errors, delete the SQLite file and recreate:
```bash
cd backend
rm recalibra.db
python -c "from database import engine, Base; from models import *; Base.metadata.create_all(bind=engine)"
```

## Access the Platform

Once running:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Stop the Platform

```bash
./stop-dev.sh
```

Or manually:
```bash
pkill -f "uvicorn main:app"
pkill -f "react-scripts start"
```

