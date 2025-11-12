#!/bin/bash
# Kill any process using port 8000
PORT=8000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Killing process on port $PORT..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 1
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "❌ Failed to kill process on port $PORT"
        exit 1
    else
        echo "✅ Port $PORT is now free"
    fi
else
    echo "✅ Port $PORT is already free"
fi
