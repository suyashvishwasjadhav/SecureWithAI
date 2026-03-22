#!/bin/bash

# ShieldSentinel - All Services Stop Script
# ===========================================
# This script stops all ShieldSentinel services gracefully

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

# Function to stop process by pattern
stop_process() {
    local pattern=$1
    local service_name=$2
    local timeout=10
    
    print_status "Stopping $service_name..."
    
    # Find PIDs matching the pattern
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    # Fallback for macOS if pgrep -f is unreliable
    if [ -z "$pids" ]; then
        pids=$(ps aux | grep -v grep | grep -E "$pattern" | awk '{print $2}' || true)
    fi
    
    if [ -z "$pids" ]; then
        print_warning "$service_name is not running"
        return 0
    fi
    
    # Send SIGTERM for graceful shutdown
    for pid in $pids; do
        if kill -TERM "$pid" 2>/dev/null; then
            print_status "Sent SIGTERM to $service_name (PID: $pid)"
        fi
    done
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt $timeout ]; do
        if ! pgrep -f "$pattern" > /dev/null 2>&1 && ! ps aux | grep -v grep | grep -E "$pattern" > /dev/null 2>&1; then
            print_success "$service_name stopped gracefully"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo ""
    print_warning "$service_name did not stop gracefully, forcing shutdown..."
    
    # Force kill if still running
    for pid in $pids; do
        if kill -KILL "$pid" 2>/dev/null; then
            print_status "Force killed $service_name (PID: $pid)"
        fi
    done
    
    # Final check
    if ! pgrep -f "$pattern" > /dev/null 2>&1; then
        print_success "$service_name stopped forcefully"
    else
        print_error "Failed to stop $service_name"
    fi
}

# Same compose file list as start.sh / start-all-services.sh
setup_compose_stop() {
    if docker compose version &>/dev/null; then
        COMPOSE_BIN=(docker compose)
    else
        COMPOSE_BIN=(docker-compose)
    fi
    COMPOSE_FILE_ARGS=()
    local files="${SHIELD_COMPOSE_FILES:-docker-compose.yml}"
    for f in $files; do
        [ -f "$f" ] && COMPOSE_FILE_ARGS+=(-f "$f")
    done
    if [ ${#COMPOSE_FILE_ARGS[@]} -eq 0 ] && [ -f "docker-compose.yml" ]; then
        COMPOSE_FILE_ARGS=(-f docker-compose.yml)
    fi
}

dc_down() {
    if [ ${#COMPOSE_FILE_ARGS[@]} -gt 0 ]; then
        "${COMPOSE_BIN[@]}" "${COMPOSE_FILE_ARGS[@]}" down "$@"
    fi
}

# Function to stop Docker services
stop_docker_services() {
    print_service "🐳 Stopping Docker Infrastructure Services"
    echo "────────────────────────────────────────────────────"
    
    if [ -f "docker-compose.yml" ]; then
        setup_compose_stop
        print_status "Stopping Docker containers (${SHIELD_COMPOSE_FILES:-docker-compose.yml})..."
        dc_down
        
        print_status "Cleaning up any remaining containers..."
        dc_down --remove-orphans 2>/dev/null || true
        
        print_success "🐳 Docker Infrastructure Services Stopped"
    else
        print_warning "docker-compose.yml not found. Skipping Docker services."
    fi
}

# Function to clean up log files
cleanup_logs() {
    print_status "Cleaning up log files..."
    
    # Remove log files if they exist
    [ -f "backend.log" ] && rm -f backend.log && print_status "Removed backend.log"
    [ -f "frontend.log" ] && rm -f frontend.log && print_status "Removed frontend.log"
    [ -f "celery.log" ] && rm -f celery.log && print_status "Removed celery.log"
    
    print_success "Log files cleaned up"
}

# Function to show final status
show_final_status() {
    echo ""
    print_service "📊 Final Service Status"
    echo "──────────────────────────────────"
    
    # Check for any remaining processes
    local remaining_processes=""
    
    if pgrep -f "uvicorn.*main:app" > /dev/null 2>&1; then
        remaining_processes="$remaining_processes\n  • FastAPI Backend: 🟡 Still Running"
    fi
    
    if pgrep -f "celery worker" > /dev/null 2>&1; then
        remaining_processes="$remaining_processes\n  • Celery Worker: 🟡 Still Running"
    fi
    
    if pgrep -f "celery beat" > /dev/null 2>&1; then
        remaining_processes="$remaining_processes\n  • Celery Beat: 🟡 Still Running"
    fi
    
    if nc -z localhost 3000 2>/dev/null; then
        remaining_processes="$remaining_processes\n  • Frontend: 🟡 Still Running"
    fi
    
    # Check Docker containers
    local docker_containers=$(docker ps --filter "name=postgres|redis|zap" --format "table {{.Names}}" 2>/dev/null | tail -n +2 || true)
    if [ ! -z "$docker_containers" ]; then
        remaining_processes="$remaining_processes\n  • Docker Containers: 🟡 Still Running"
    fi
    
    if [ -z "$remaining_processes" ]; then
        print_success "All services have been stopped successfully"
    else
        print_warning "Some services may still be running:"
        echo -e "$remaining_processes"
        echo ""
        print_status "You may need to manually stop these services or run the script again."
    fi
}

# Main stop sequence
main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 ShieldSentinel Services Stop                 ║"
    echo "║                     Stopping All Services                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_status "Initiating graceful shutdown of all ShieldSentinel services..."
    echo ""
    
    # Stop application services in reverse order of startup
    print_service "🌐 Stopping Frontend Application"
    echo "──────────────────────────────────────────"
    
    # Stop frontend processes
    stop_process "npm.*start\|yarn.*start\|vite" "Frontend"
    stop_process "node.*react-scripts\|next\|vite" "Frontend Node Process"
    
    echo ""
    print_service "🔧 Stopping Backend Application Services"
    echo "──────────────────────────────────────────────────"
    
    # Stop backend services
    stop_process "uvicorn.*main:app" "FastAPI Backend"
    stop_process "celery.*worker" "Celery Worker"
    stop_process "celery.*beat" "Celery Beat"
    
    echo ""
    
    # Stop Docker infrastructure
    stop_docker_services
    
    echo ""
    print_service "🧹 Cleanup Operations"
    echo "──────────────────────────────"
    
    # Clean up PID files (if any)
    print_status "Cleaning up PID files..."
    find . -name "*.pid" -delete 2>/dev/null || true
    
    # Clean up log files (optional - comment out if you want to keep logs)
    if [ "$1" = "--clean-logs" ]; then
        cleanup_logs
    else
        print_status "Preserving log files (use --clean-logs to remove them)"
    fi
    
    # Show final status
    show_final_status
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            🛡️  SHIELDSSENTINEL SERVICES STOPPED 🛡️            ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📝 Additional Options:${NC}"
    echo "  • Run with --clean-logs to remove log files: ./stop-all-services.sh --clean-logs"
    echo "  • Check Docker status: docker ps -a"
    echo "  • Remove all Docker data: docker system prune -a"
    echo ""
    echo -e "${GREEN}✨ All ShieldSentinel services have been stopped! ✨${NC}"
}

# Handle script interruption
trap 'print_warning "Stop script interrupted. Some services may still be running."; exit 1' INT TERM

# Run main function with all arguments
main "$@"
