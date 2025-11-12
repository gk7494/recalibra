#!/bin/bash
# Start the Recalibra backend API

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found in $SCRIPT_DIR"
    echo "   Creating virtual environment..."
    python3 -m venv venv
    if [ ! -d "venv" ]; then
        echo "❌ Failed to create virtual environment. Run ./fix_backend.sh first"
        exit 1
    fi
    echo "✅ Created virtual environment"
fi

source venv/bin/activate

# Ensure dependencies are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Dependencies not installed. Installing..."
    pip install --upgrade pip -q
    pip install -q fastapi uvicorn sqlalchemy pydantic httpx numpy pandas scikit-learn scipy python-dotenv requests joblib python-multipart
    pip install -q benchling-sdk 2>/dev/null || echo "⚠️  benchling-sdk optional"
    echo "✅ Dependencies installed"
fi

# Check if port 8000 is in use and kill the process
PORT=8000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port $PORT is already in use. Killing existing process..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
    echo "✅ Port $PORT freed"
fi

# Create corrections directory if it doesn't exist
mkdir -p corrections

# Create database tables
echo "📦 Creating database tables..."
python3 -c "
import sys
sys.path.insert(0, '.')
try:
    from app.db.session import engine
    from app.db.models import Base
    Base.metadata.create_all(bind=engine)
    print('✅ Database ready')
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
" || {
    echo "❌ Failed to create database tables"
    echo "   Trying to install missing dependencies..."
    pip install -q sqlalchemy pydantic python-dotenv
    # Try again
    python3 -c "
import sys
sys.path.insert(0, '.')
from app.db.session import engine
from app.db.models import Base
Base.metadata.create_all(bind=engine)
print('✅ Database ready')
" || {
        echo "❌ Still failed. Check error above."
        exit 1
    }
}

# Start the API
echo ""
echo "🚀 Starting Recalibra API..."
echo "   API will be available at: http://localhost:$PORT"
echo "   Host: 0.0.0.0 (accessible from all interfaces)"
echo ""
echo "   API docs at: http://localhost:$PORT/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port $PORT

