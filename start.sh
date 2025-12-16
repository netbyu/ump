#!/bin/bash

# Asterisk Management UI - Quick Start Script

set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "  Asterisk Management UI - Starting..."
echo "=========================================="

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
fi

# Start the stack
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 5

# Check service health
echo ""
echo "Service Status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "=========================================="
echo "  Stack is running!"
echo "=========================================="
echo ""
echo "  UI:      http://localhost:3000"
echo "  API:     http://localhost:3001"
echo "  DB:      localhost:5432"
echo "  Asterisk: localhost:5060 (SIP)"
echo ""
echo "  Login:   admin / changeme"
echo ""
echo "Commands:"
echo "  ./start.sh          - Start stack"
echo "  ./stop.sh           - Stop stack"
echo "  make dev-logs       - View logs"
echo "  make ast-cli        - Asterisk CLI"
echo "  make db-shell       - Database shell"
echo ""
