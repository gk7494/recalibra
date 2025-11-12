#!/bin/bash
# Fix backend dependencies and setup

cd "$(dirname "$0")"

echo "🔧 Fixing backend dependencies..."

# Activate venv if it exists, create if it doesn't
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install all dependencies
echo "Installing dependencies..."
pip install -q fastapi uvicorn sqlalchemy pydantic httpx numpy pandas scikit-learn scipy python-dotenv requests joblib python-multipart

# Try to install benchling-sdk (optional)
pip install -q benchling-sdk 2>/dev/null || echo "⚠️  benchling-sdk not installed (optional)"

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "To run the backend:"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload"
echo ""
