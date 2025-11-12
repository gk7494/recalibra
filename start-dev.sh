#!/bin/bash

set -e  # Exit on error

echo "Starting Recalibra Platform (Development Mode - No Docker Required)"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Find Python 3.8+ (prefer 3.10+)
PYTHON_CMD=""

# Check pyenv first (if available)
if command -v pyenv &> /dev/null; then
    # Check for pyenv Python versions
    if [ -d "$HOME/.pyenv/versions/3.11.0/bin" ]; then
        PYTHON_CMD="$HOME/.pyenv/versions/3.11.0/bin/python3"
    elif [ -d "$HOME/.pyenv/versions/3.10" ]; then
        PYTHON_CMD="$HOME/.pyenv/versions/3.10/bin/python3"
    elif [ -d "$HOME/.pyenv/versions/3.9" ]; then
        PYTHON_CMD="$HOME/.pyenv/versions/3.9/bin/python3"
    elif [ -d "$HOME/.pyenv/versions/3.8" ]; then
        PYTHON_CMD="$HOME/.pyenv/versions/3.8/bin/python3"
    fi
    # Verify the Python exists and is the right version
    if [ -n "$PYTHON_CMD" ] && [ -f "$PYTHON_CMD" ]; then
        PYTHON_VER=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
        PYTHON_MAJOR=$(echo $PYTHON_VER | cut -d'.' -f1)
        PYTHON_MINOR=$(echo $PYTHON_VER | cut -d'.' -f2)
        if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
            PYTHON_CMD=""  # Version too old, try other options
        fi
    else
        PYTHON_CMD=""
    fi
fi

# Fall back to system Python
if [ -z "$PYTHON_CMD" ]; then
    if command -v python3.11 &> /dev/null; then
        PYTHON_CMD="python3.11"
    elif command -v python3.10 &> /dev/null; then
        PYTHON_CMD="python3.10"
    elif command -v python3.9 &> /dev/null; then
        PYTHON_CMD="python3.9"
    elif command -v python3.8 &> /dev/null; then
        PYTHON_CMD="python3.8"
    elif [ -f "/opt/homebrew/opt/python@3.11/bin/python3" ]; then
        PYTHON_CMD="/opt/homebrew/opt/python@3.11/bin/python3"
    elif [ -f "/opt/homebrew/opt/python@3.10/bin/python3" ]; then
        PYTHON_CMD="/opt/homebrew/opt/python@3.10/bin/python3"
    elif command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Error: Python 3.8+ is not installed."
    echo ""
    echo "To install Python 3.11, run:"
    echo "  pyenv install 3.11.0"
    echo "  pyenv global 3.11.0"
    echo ""
    echo "Or:"
    echo "  ./upgrade-python.sh"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

echo "Using Python: $PYTHON_CMD ($PYTHON_VERSION)"

# Check Python version (need 3.8+)
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo "❌ Error: Python 3.8+ is required. Found Python $PYTHON_VERSION"
    echo ""
    echo "To upgrade Python, run:"
    echo "  ./upgrade-python.sh"
    exit 1
fi

# Check if Node is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "Node version: $(node --version)"
echo ""

# Use SQLite for development (simpler)
export DATABASE_URL="sqlite:///${SCRIPT_DIR}/backend/recalibra.db"
echo "Using SQLite database: ${SCRIPT_DIR}/backend/recalibra.db"
echo ""

# Setup backend
echo "=== Setting up backend ==="
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment with $PYTHON_CMD..."
    $PYTHON_CMD -m venv venv || {
        echo "❌ Failed to create virtual environment"
        exit 1
    }
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo ""
echo "Installing Python dependencies (this may take a few minutes)..."
echo "This will install: FastAPI, SQLAlchemy, scikit-learn, PyTorch, and more..."
pip install -r requirements.txt || {
    echo ""
    echo "❌ Failed to install Python dependencies"
    echo "Try manually:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
}
echo "✅ Python dependencies installed successfully"

# Create database tables
echo "Creating database tables..."
$PYTHON_CMD -c "
import os
os.environ['DATABASE_URL'] = '${DATABASE_URL}'
from database import engine, Base
from models import *
Base.metadata.create_all(bind=engine)
print('✅ Database tables created')
" || {
    echo "⚠️  Warning: Database setup had issues, but continuing..."
}

# Get full path to uvicorn
UVICORN_PATH=$(which uvicorn)
if [ -z "$UVICORN_PATH" ]; then
    UVICORN_PATH="${SCRIPT_DIR}/backend/venv/bin/uvicorn"
fi

# Check if port 8000 is in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Warning: Port 8000 is already in use"
    echo "   Trying to start anyway..."
fi

# Start backend in background with proper environment
echo "Starting backend server on http://localhost:8000..."
cd "$SCRIPT_DIR/backend"
(
    source venv/bin/activate
    export DATABASE_URL="${DATABASE_URL}"
    cd "$SCRIPT_DIR/backend"
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1
) &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check backend.log for errors:"
    tail -20 ../backend.log
    exit 1
fi

cd "$SCRIPT_DIR/frontend"

# Setup frontend
echo ""
echo "=== Setting up frontend ==="
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (this may take a few minutes)..."
    npm install || {
        echo "❌ Failed to install frontend dependencies"
        echo "Try: cd frontend && npm install"
        exit 1
    }
fi

# Check if port 3000 is in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Warning: Port 3000 is already in use"
    echo "   Trying to start anyway..."
fi

# Start frontend
echo "Starting frontend server on http://localhost:3000..."
echo "   (This may take 30-60 seconds to compile...)"
cd "$SCRIPT_DIR/frontend"
BROWSER=none npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

cd "$SCRIPT_DIR"

# Save PIDs for stop script
echo "$BACKEND_PID $FRONTEND_PID" > .dev-pids

# Wait a bit for services to start
echo ""
echo "Waiting for services to initialize..."
sleep 8

# Check if services are running
if kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; then
    echo ""
    echo "✅ Recalibra is running in development mode!"
    echo ""
    echo "Access the platform at:"
    echo "  📊 Dashboard: http://localhost:3000"
    echo "  🔌 API: http://localhost:8000"
    echo "  📚 API Docs: http://localhost:8000/docs"
    echo ""
    echo "Logs:"
    echo "  - Backend: tail -f backend.log"
    echo "  - Frontend: tail -f frontend.log"
    echo ""
    echo "To stop the platform, run: ./stop-dev.sh"
    echo ""
else
    echo ""
    echo "⚠️  Some services may not have started properly"
    echo "Check the logs:"
    echo "  - Backend: tail -20 backend.log"
    echo "  - Frontend: tail -20 frontend.log"
    echo ""
fi
