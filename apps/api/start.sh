#!/bin/bash

# UC Platform Backend Startup Script
# ==================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default options
INIT_DB=false
INIT_AI=false
INIT_ADMIN=false
DEV_MODE=false
HOST="0.0.0.0"
PORT=8001

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --init-db)
            INIT_DB=true
            shift
            ;;
        --init-ai)
            INIT_AI=true
            shift
            ;;
        --init-admin)
            INIT_ADMIN=true
            shift
            ;;
        --init-all)
            INIT_DB=true
            INIT_AI=true
            INIT_ADMIN=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "UC Platform Backend Startup Script"
            echo ""
            echo "Usage: ./start.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --init-db      Initialize integrations database and seed data"
            echo "  --init-ai      Initialize AI agents database and seed data"
            echo "  --init-admin   Initialize admin (users) database and seed data"
            echo "  --init-all     Initialize all databases"
            echo "  --dev         Run in development mode with auto-reload"
            echo "  --host HOST   Host to bind to (default: 0.0.0.0)"
            echo "  --port PORT   Port to listen on (default: 8001)"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                    # Start server only"
            echo "  ./start.sh --init-all         # Initialize all DBs and start"
            echo "  ./start.sh --dev              # Development mode with reload"
            echo "  ./start.sh --init-admin --dev # Init admin DB and start in dev mode"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo ""
echo "========================================"
echo "  UC Platform Backend Startup"
echo "========================================"
echo ""

# Check for virtual environment
if [ -d "venv" ]; then
    print_status "Activating virtual environment..."
    source venv/bin/activate
    print_success "Virtual environment activated"
else
    print_warning "No virtual environment found. Using system Python."
    print_status "Consider creating one with: python -m venv venv"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_status "Please create .env file with required configuration"
    exit 1
fi
print_success ".env file found"

# Check Python dependencies
print_status "Checking dependencies..."
if ! python -c "import fastapi" 2>/dev/null; then
    print_warning "Dependencies not installed. Installing..."
    pip install -r requirements.txt
fi
print_success "Dependencies OK"

# Initialize integrations database if requested
if [ "$INIT_DB" = true ]; then
    print_status "Initializing integrations database..."
    python init_db.py
    print_success "Integrations database initialized"
fi

# Initialize AI database if requested
if [ "$INIT_AI" = true ]; then
    print_status "Initializing AI agents database..."
    python init_ai_db.py
    print_success "AI agents database initialized"
fi

# Initialize admin database if requested
if [ "$INIT_ADMIN" = true ]; then
    print_status "Initializing admin (users) database..."
    python init_admin_db.py
    print_success "Admin database initialized"
fi

# Build uvicorn command
UVICORN_CMD="uvicorn main:app --host $HOST --port $PORT"

if [ "$DEV_MODE" = true ]; then
    UVICORN_CMD="$UVICORN_CMD --reload"
    print_status "Development mode enabled (auto-reload)"
fi

echo ""
print_status "Starting server on http://$HOST:$PORT"
print_status "API docs available at http://$HOST:$PORT/docs"
echo ""
echo "----------------------------------------"
echo ""

# Start the server
exec $UVICORN_CMD
