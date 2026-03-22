#!/bin/bash

# ShieldSentinel - All Services Startup Script
# ==============================================
# This script starts all ShieldSentinel services with proper naming and status messages
#
# Optional: set SHIELD_COMPOSE_FILES (space-separated) before running, or use ./start.sh
# Example: SHIELD_COMPOSE_FILES="docker-compose.yml docker-compose.lowram.yml"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_service() {
    echo -e "${PURPLE}[SERVICE]${NC} $1"
}

# Function to check if a service is already running
is_running() {
    local pattern=$1
    # Check for local process using pgrep first
    if pgrep -f "$pattern" > /dev/null; then
        return 0
    fi
    # Fallback to ps aux | grep for more robust detection (especially on macOS)
    if ps aux | grep -v grep | grep -E "$pattern" > /dev/null; then
        return 0
    fi
    # Check for docker container
    if docker ps --format '{{.Names}}' | grep -E "$pattern|shieldssentinel-$pattern-1" > /dev/null; then
        return 0
    fi
    return 1
}

# Function to check if a container is running
is_container_running() {
    local name=$1
    if docker ps --format '{{.Names}}' | grep -E "shieldssentinel-$name-1|$name" > /dev/null; then
        return 0
    fi
    return 1
}

# Docker Compose v2 (plugin) with v1 fallback; merged -f files from SHIELD_COMPOSE_FILES
setup_compose() {
    if docker compose version &>/dev/null; then
        COMPOSE_BIN=(docker compose)
    else
        COMPOSE_BIN=(docker-compose)
    fi
    COMPOSE_FILE_ARGS=()
    local files="${SHIELD_COMPOSE_FILES:-docker-compose.yml}"
    for f in $files; do
        if [ -f "$f" ]; then
            COMPOSE_FILE_ARGS+=(-f "$f")
        else
            print_warning "Compose file not found (skipping): $f"
        fi
    done
    if [ ${#COMPOSE_FILE_ARGS[@]} -eq 0 ]; then
        print_error "No valid compose files. Default docker-compose.yml missing?"
        exit 1
    fi
}

dc() {
    "${COMPOSE_BIN[@]}" "${COMPOSE_FILE_ARGS[@]}" "$@"
}

compose_includes_lowram() {
    [[ " ${SHIELD_COMPOSE_FILES:-} " == *" docker-compose.lowram.yml "* ]] || \
    [[ " ${SHIELD_COMPOSE_FILES:-} " == *"docker-compose.lowram.yml "* ]]
}


# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            print_success "$service_name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Main startup sequence
main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                ShieldSentinel Services Startup               ║"
    echo "║                      Starting All Services                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check for virtual environment and activate if exists
    if [ -d "venv" ]; then
        print_status "Activating virtual environment (venv)..."
        source venv/bin/activate
    elif [ -d ".venv" ]; then
        print_status "Activating virtual environment (.venv)..."
        source .venv/bin/activate
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Using .env.example as template."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_status "Created .env from .env.example. Please update your API keys."
        else
            print_error "No .env.example file found. Please create .env file manually."
            exit 1
        fi
    fi
    
    # Export all variables from .env
    print_status "Exporting environment variables from .env..."
    set -a; source .env; set +a

    setup_compose
    print_status "Compose files: ${SHIELD_COMPOSE_FILES:-docker-compose.yml}"
    
    print_status "Checking for existing services..."
    
    # Stop any existing services
    if [ -f "stop-all-services.sh" ]; then
        print_status "Stopping existing services..."
        ./stop-all-services.sh
        sleep 3
    fi
    
    echo ""
    print_service "🐳 Starting Docker Infrastructure Services"
    echo "────────────────────────────────────────────────────"
    
    # Start Docker services (Infrastructure). ZAP is omitted when using docker-compose.lowram.yml
    if compose_includes_lowram; then
        print_status "Low-RAM mode: starting PostgreSQL + Redis (ZAP disabled — use profile 'zap' to enable)..."
        dc up -d postgres redis
    else
        print_status "Starting PostgreSQL, Redis, and OWASP ZAP in Docker..."
        dc up -d postgres redis zap
    fi
    
    # Host port from docker-compose.yml (postgres published as 5433)
    wait_for_service "PostgreSQL" 5433
    wait_for_service "Redis" 6379
    if ! compose_includes_lowram; then
        wait_for_service "OWASP ZAP" 8090
    else
        print_warning "Skipping ZAP health check (not started in low-RAM compose)."
    fi
    
    print_success "🐳 Docker Infrastructure Services Started Successfully"
    echo ""
    
    print_service "🔧 Starting Backend Application Services"
    echo "──────────────────────────────────────────────────"
    
    # Start Celery Worker in Docker (for Linux security tool compatibility)
    print_status "Starting Celery Worker In Docker (with TruffleHog support)..."
    dc up -d --build worker
    print_success "🔄 Celery Worker Started via Docker (Build Verified)"
    
    # Start Celery Beat Scheduler in Docker
    print_status "Starting Celery Beat Scheduler In Docker..."
    dc up -d --build beat
    print_success "⏰ Celery Beat Scheduler Started via Docker"
    
    # Start FastAPI Backend
    cd backend
    print_status "Starting FastAPI Backend Server..."
    if is_container_running "backend"; then
        print_success "🚀 FastAPI Backend is running in Docker"
    elif is_running "uvicorn.*main:app"; then
        print_warning "FastAPI Backend is already running locally"
    else
        if command -v uvicorn &> /dev/null; then
            # Export root .env explicitly so Celery/uvicorn get correct local Redis/DB URLs
            ROOT_ENV_FILE="$(cd .. && pwd)/../.env"
            if [ -f "../.env" ]; then
                ROOT_ENV_FILE="../.env"
            fi
            nohup env $(grep -v '^#' "$ROOT_ENV_FILE" | xargs) uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
            sleep 2
            print_success "🚀 FastAPI Backend Server Started locally"
        else
            print_warning "Uvicorn not found locally, and not running in Docker."
            print_status "Attempting to start FastAPI Backend in Docker..."
            dc up -d --build backend
            print_success "🚀 FastAPI Backend Started via Docker"
        fi
    fi
    
    # Wait for backend
    wait_for_service "FastAPI Backend" 8000
    
    # Return to root directory
    cd ..
    
    print_success "🔧 Backend Application Services Started Successfully"
    echo ""
    
    print_service "🔐 Starting Marketing / Auth Site (Login & Signup)"
    echo "──────────────────────────────────────────────────────"

    # Start Marketing site on port 4000 (Auth gateway — must be started first)
    if is_container_running "marketing"; then
        print_success "🔐 Marketing/Auth site is running in Docker"
    elif [ -d "marketing" ]; then
        cd marketing
        print_status "Starting Marketing/Auth site locally on port 4000..."
        if nc -z localhost 4000 2>/dev/null; then
            print_warning "Marketing/Auth site is already running on port 4000"
        else
            if [ -f "package.json" ]; then
                if command -v npm &> /dev/null; then
                    if grep -q '"dev":' package.json; then
                        nohup npm run dev < /dev/null > ../marketing.log 2>&1 &
                    else
                        nohup npm start < /dev/null > ../marketing.log 2>&1 &
                    fi
                elif command -v yarn &> /dev/null; then
                    if grep -q '"dev":' package.json; then
                        yarn dev > ../marketing.log 2>&1 &
                    else
                        yarn start > ../marketing.log 2>&1 &
                    fi
                else
                    print_error "Neither npm nor yarn found locally."
                    print_status "Attempting to start Marketing site via Docker..."
                    dc up -d --build marketing
                    print_success "🔐 Marketing/Auth site Started in Docker"
                fi
                sleep 5
                print_success "🔐 Marketing/Auth site Started on port 4000"
            else
                print_warning "No package.json found in marketing directory"
            fi
        fi
        cd ..
    else
        print_warning "Marketing directory not found locally. Attempting to start via Docker..."
        dc up -d --build marketing
    fi

    # Wait for marketing/auth site
    wait_for_service "Marketing/Auth Site" 4000

    print_success "🔐 Marketing/Auth Site Started Successfully (http://localhost:4000)"
    echo ""

    print_service "🌐 Starting Frontend Application (Protected — Requires Login)"
    echo "──────────────────────────────────────────────────────────────"

    # Start Frontend (if it exists)
    if is_container_running "frontend"; then
        print_success "🎨 Frontend is running in Docker"
    elif [ -d "frontend" ]; then
        cd frontend
        print_status "Starting React Frontend locally on port 3000..."
        if nc -z localhost 3000 2>/dev/null; then
            print_warning "Frontend is already running on port 3000"
        else
            if [ -f "package.json" ]; then
                if command -v npm &> /dev/null; then
                    if grep -q '"dev":' package.json; then
                        nohup npm run dev < /dev/null > ../frontend.log 2>&1 &
                    else
                        nohup npm start < /dev/null > ../frontend.log 2>&1 &
                    fi
                elif command -v yarn &> /dev/null; then
                    if grep -q '"dev":' package.json; then
                        yarn dev > ../frontend.log 2>&1 &
                    else
                        yarn start > ../frontend.log 2>&1 &
                    fi
                else
                    print_error "Neither npm nor yarn found locally."
                    print_status "Attempting to start Frontend in Docker..."
                    dc up -d --build frontend
                    print_success "🎨 React Frontend Started in Docker"
                fi
                sleep 5
                print_success "🎨 React Frontend Started on port 3000"
            else
                print_warning "No package.json found in frontend directory"
            fi
        fi
        cd ..
    else
        print_warning "Frontend directory not found locally. Attempting to start via Docker..."
        dc up -d --build frontend
    fi
    
    # Wait for frontend (port 3000)
    wait_for_service "React Frontend" 3000
    print_success "🌐 Frontend is accessible on port 3000 (login required from http://localhost:4000)"
    
    echo ""
    print_service "📊 Service Status Summary"
    echo "────────────────────────────────────"
    
    # Display service status
    echo -e "${CYAN}Infrastructure Services:${NC}"
    echo "  • PostgreSQL: $(docker ps --filter "name=postgres" --format "table {{.Status}}" | tail -n 1)"
    echo "  • Redis: $(docker ps --filter "name=redis" --format "table {{.Status}}" | tail -n 1)"
    if compose_includes_lowram; then
        echo "  • OWASP ZAP: (not started — low-RAM mode; use: docker compose --profile zap ...)"
    else
        echo "  • OWASP ZAP: $(docker ps --filter "name=zap" --format "table {{.Status}}" | tail -n 1)"
    fi
    echo ""
    echo -e "${CYAN}Application Services:${NC}"
    echo "  • FastAPI Backend:    $(is_running "uvicorn.*main:app" && echo "🟢 Running" || (is_container_running "backend" && echo "🟢 Running (Docker)" || echo "🔴 Stopped"))"
    echo "  • Celery Worker:      $(is_running "celery.*worker" && echo "🟢 Running" || (is_container_running "worker" && echo "🟢 Running (Docker)" || echo "🔴 Stopped"))"
    echo "  • Celery Beat:        $(is_running "celery.*beat" && echo "🟢 Running" || (is_container_running "beat" && echo "🟢 Running (Docker)" || echo "🔴 Stopped"))"
    echo "  • Marketing/Auth:     $(nc -z localhost 4000 2>/dev/null && echo "🟢 Running (http://localhost:4000)" || (is_container_running "marketing" && echo "🟢 Running (Docker)" || echo "🔴 Stopped"))"
    echo "  • Frontend (App):     $(nc -z localhost 3000 2>/dev/null && echo "🟢 Running (http://localhost:3000) — Login required" || (is_container_running "frontend" && echo "🟢 Running (Docker) — Login required" || echo "🔴 Stopped"))"
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🛡️  ALL SHIELDSSENTINEL SERVICES STARTED 🛡️         ║${NC}"
    echo -e "${GREEN}║            🚀 PHASE 16: ADVANCED ANALYTICS READY 🚀           ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🌐 Access Points:${NC}"
    echo -e "  • 🔐 Login / Signup:   ${YELLOW}http://localhost:4000${NC}  ← START HERE"
    echo -e "  • 🖥️  Main App:         ${GREEN}http://localhost:3000${NC}  ← Accessible only after login"
    echo "  • ⚙️  Backend API:       http://localhost:8000"
    echo "  • 📖 API Docs:          http://localhost:8000/docs"
    if compose_includes_lowram; then
        echo "  • 🔍 OWASP ZAP:         (disabled — add profile zap or drop lowram compose file)"
    else
        echo "  • 🔍 OWASP ZAP:         http://localhost:8090"
    fi
    echo ""
    echo -e "${YELLOW}⚠️  NOTE: http://localhost:3000 (Main App) requires authentication.${NC}"
    echo -e "${YELLOW}   Please login or sign up at http://localhost:4000 first.${NC}"
    echo ""
    echo -e "${CYAN}✨ NEW IN PHASE 16:${NC}"
    echo "  • Demo / Simulation Mode: Accessible via Frontend Scan Toggle"
    echo "  • Interactive Attack Timeline: View tool execution in Real-time"
    echo "  • Compliance Matrix: OWASP/PCI-DSS/GDPR gaps in PDF & UI"
    echo "  • Comparison Engine: Compare risks between any two scans"
    echo ""
    echo -e "${CYAN}📝 Logs:${NC}"
    echo "  • Backend:  backend.log"
    echo "  • Frontend: frontend.log"
    echo "  • Marketing: marketing.log"
    echo "  • Docker:   ${COMPOSE_BIN[*]} ${COMPOSE_FILE_ARGS[*]} logs -f"
    echo ""
    echo -e "${GREEN}✨ ShieldSentinel is ready to protect your applications! ✨${NC}"
}

# Handle script interruption
trap 'print_warning "Startup interrupted. Some services may not be running."; exit 1' INT TERM

# Run main function
main "$@"
