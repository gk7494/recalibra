#!/bin/bash
# Simple startup script for Recalibra MVP

echo "🚀 Starting Recalibra MVP..."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Start backend in background
echo "📦 Starting backend..."
cd backend
chmod +x start_backend.sh
./start_backend.sh &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Recalibra MVP is starting!"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
