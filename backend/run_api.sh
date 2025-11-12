#!/bin/bash
# Script to run the Recalibra API with proper virtual environment

cd "$(dirname "$0")"

# Kill any existing process on port 8000
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8000 is in use. Killing existing process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    # Activate virtual environment
    source venv/bin/activate
fi

# Verify FastAPI is installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "❌ FastAPI not found. Installing dependencies..."
    pip install -r requirements.txt
fi

# Verify uvicorn is installed
if ! python -c "import uvicorn" 2>/dev/null; then
    echo "❌ Uvicorn not found. Installing..."
    pip install "uvicorn[standard]"
fi

# Run the API
echo ""
echo "🚀 Starting Recalibra API..."
echo "📍 API will be available at: http://localhost:8000"
echo "📚 API docs at: http://localhost:8000/docs"
echo "🔍 Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
