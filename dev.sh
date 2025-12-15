#!/bin/bash

# UMP Development Server Startup Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting UMP Development Servers...${NC}"

# Kill any existing processes on our ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

# Start RBAC service (port 8000)
echo -e "${GREEN}Starting RBAC service on port 8000...${NC}"
cd services/rbac
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
uvicorn app.main:app --reload --port 8000 &
RBAC_PID=$!
cd ../..

# Start API backend (port 8001)
echo -e "${GREEN}Starting API backend on port 8001...${NC}"
cd apps/api
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
uvicorn main:app --reload --port 8001 &
API_PID=$!
cd ../..

# Start Next.js frontend
echo -e "${GREEN}Starting Next.js frontend on port 3000...${NC}"
cd apps/web
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev &
WEB_PID=$!
cd ../..

echo -e "${GREEN}All services started!${NC}"
echo -e "  Frontend: http://localhost:3000"
echo -e "  RBAC:     http://localhost:8000/docs"
echo -e "  API:      http://localhost:8001/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait and cleanup on exit
trap "kill $API_PID $RBAC_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
