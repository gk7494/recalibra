#!/bin/bash
# Start Recalibra with Docker

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          🐳 STARTING RECALIBRA WITH DOCKER               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not installed."
    exit 1
fi

# Use docker compose (newer) or docker-compose (older)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "📦 Building and starting containers..."
echo ""

# Build and start
$COMPOSE_CMD up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Wait for backend to be healthy
echo "Checking backend health..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        echo "⚠️  Backend is taking longer than expected..."
    fi
done

# Create demo data
echo ""
echo "📊 Creating demo data..."
sleep 3
docker-compose exec -T backend python3 /app/create_demo_data.py 2>/dev/null || docker-compose exec -T backend python3 create_demo_data.py 2>/dev/null || echo "⚠️  Demo data creation skipped (may already exist)"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          ✅ RECALIBRA IS RUNNING IN DOCKER!              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Access your application:"
echo "   🌐 Dashboard:  http://localhost:3000"
echo "   🔌 API:        http://localhost:8000"
echo "   📚 API Docs:   http://localhost:8000/docs"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop:          docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""

