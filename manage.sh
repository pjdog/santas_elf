#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_TEMPLATE="$SCRIPT_DIR/.env.template"

# Prefer modern Docker Compose plugin; fallback to legacy docker-compose
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# Explicitly set API version to satisfy newer daemons when old clients are present
export DOCKER_API_VERSION=${DOCKER_API_VERSION:-1.44}

# Check for required tools
check_tools() {
    for tool in docker lsof; do
        if ! command -v "$tool" &> /dev/null; then
            echo "Error: $tool is not installed. Please install '$tool'." >&2
            exit 1
        fi
    done
}

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]];
  then
    if [[ ! -f "$ENV_TEMPLATE" ]];
    then
      echo "Environment template $ENV_TEMPLATE is missing." >&2
      exit 1
    fi
    cp "$ENV_TEMPLATE" "$ENV_FILE"
    echo "Created .env from template. Update $ENV_FILE if you need custom values."
  fi
}

usage() {
  echo "Usage: $0 {up|down|restart|clean|logs|fix-ports|test|status}" >&2
  echo "  up         : Start the application"
  echo "  down       : Stop the application (removes orphans)"
  echo "  restart    : Restart the application"
  echo "  clean      : Stop app, remove volumes (resets DB)"
  echo "  logs       : Follow container logs"
  echo "  fix-ports  : Force kill processes hogging ports 3000 or 5000 (Use if 'up' fails)"
  echo "  test       : Run server and client test suites in Docker (non-interactive)"
  echo "  status     : Show container status and log file locations"
  echo ""
  echo "Options for 'up':"
  echo "  --no-cache : Rebuild without cache"
  exit 1
}

# Parse args
ACTION="${1:-}" || true
shift || true

# Ensure we have tools before running potentially destructive commands
if [[ "$ACTION" == "fix-ports" ]]; then
    check_tools
fi

case "$ACTION" in
  up)
    ensure_env
    
    if [[ "${1:-}" == "--no-cache" ]]; then
        echo "Rebuilding without cache..."
        (cd "$SCRIPT_DIR" && ${COMPOSE} build --no-cache)
        shift
    fi
    
    echo "Starting application..."
    (cd "$SCRIPT_DIR" && ${COMPOSE} up -d --build --remove-orphans)
    cat <<'EOF'
      /\\_/\\
     ( o.o )  Santa's Elf is awake!
      > ^ <
EOF
    echo "✅ Application started at http://localhost:8080"
    ;;
  down)
    echo "Stopping application..."
    (cd "$SCRIPT_DIR" && ${COMPOSE} down --remove-orphans)
    echo "✅ Application stopped."
    ;;
  restart)
    echo "Restarting application..."
    (cd "$SCRIPT_DIR" && ${COMPOSE} down --remove-orphans)
    ensure_env
    (cd "$SCRIPT_DIR" && ${COMPOSE} up -d --build --remove-orphans)
    cat <<'EOF'
      /\\_/\\
     ( o.o )  Santa's Elf is awake!
      > ^ <
EOF
    echo "✅ Application restarted."
    ;;
  clean)
    echo "Cleaning application state..."
    (cd "$SCRIPT_DIR" && ${COMPOSE} down -v --remove-orphans)
    echo "✅ Application cleaned (volumes removed)."
    ;;
  logs)
    (cd "$SCRIPT_DIR" && ${COMPOSE} logs -f)
    ;;
  fix-ports)
    echo "🔍 Checking for stuck processes on ports 3000, 5000..."
    # Find PIDs listening on these ports
    PIDS=$(lsof -ti :3000,5000 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "⚠️  Found processes occupying ports: $PIDS"
        echo "💥 Killing them..."
        # We use sudo implicitly if needed, or expect user to run as sudo if simple kill fails
        kill -9 $PIDS || sudo kill -9 $PIDS
        echo "✅ Ports cleared."
    else
        echo "✅ No blocking processes found."
    fi
    ;;
  test)
    ensure_env
    echo "Running test suites in Docker..."
    (cd "$SCRIPT_DIR" && docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit)
    echo "✅ Tests completed."
    ;;
  status)
    echo "Container status:"
    ${COMPOSE} ps
    echo ""
    echo "Log files (if present):"
    echo "  server: $SCRIPT_DIR/server.log"
    echo "  client: $SCRIPT_DIR/client.log"
    echo "  nginx : $SCRIPT_DIR/nginx/error.log"
    ;;
  *)
    usage
    ;;
esac
