#!/bin/bash
# Stop Recalibra Docker containers

if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "🛑 Stopping Recalibra Docker containers..."
$COMPOSE_CMD down
echo "✅ Stopped"

