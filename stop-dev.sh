#!/bin/bash

echo "Stopping Recalibra Platform (Development Mode)..."

if [ -f .dev-pids ]; then
    PIDS=$(cat .dev-pids)
    kill $PIDS 2>/dev/null
    rm .dev-pids
    echo "✅ Stopped development servers"
else
    echo "No running processes found"
    # Try to kill by port
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "✅ Cleaned up processes on ports 8000 and 3000"
fi

