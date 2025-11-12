#!/bin/bash
# Simple startup script that kills port 8000 first

cd "$(dirname "$0")"

# Kill port 8000 if in use
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 1

# Activate venv and start
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

