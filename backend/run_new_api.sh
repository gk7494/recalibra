#!/bin/bash
# Run the new structured API

cd "$(dirname "$0")"

# Activate venv if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install/update dependencies
pip install -q -r requirements.txt

# Run the new API
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
