#!/bin/bash
# Check Recalibra Docker status

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          🔍 RECALIBRA DOCKER STATUS CHECK                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop"
    exit 1
fi
echo "✅ Docker is running"

# Check containers
echo ""
echo "📦 Container Status:"
docker-compose ps

# Check backend
echo ""
echo "🔌 Backend API (port 8000):"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
    MODELS=$(curl -s http://localhost:8000/api/models | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    echo "   ✅ Found $MODELS models"
else
    echo "   ❌ Backend is not responding"
fi

# Check frontend
echo ""
echo "🎨 Frontend (port 3000):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>&1 | grep -q "200"; then
    echo "   ✅ Frontend is responding"
else
    echo "   ⏳ Frontend is starting (may take 30-60 seconds)"
fi

# Check database
echo ""
echo "🗄️  Database (PostgreSQL):"
if docker-compose ps postgres | grep -q "healthy"; then
    echo "   ✅ Database is healthy"
else
    echo "   ❌ Database is not healthy"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Access URLs:"
echo "   🌐 Dashboard:  http://localhost:3000"
echo "   🔌 API:        http://localhost:8000"
echo "   📚 API Docs:   http://localhost:8000/docs"
echo ""
echo "📋 Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart:       docker-compose restart"
echo "   Stop:          docker-compose down"
echo ""

