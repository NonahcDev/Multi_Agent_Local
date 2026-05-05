#!/usr/bin/env bash
# run.sh — Start LocalAI Mesh (backend + frontend)
# Usage: bash run.sh
# Requires: Python 3.12+, Node.js 18+

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
CYAN="\033[36m"
PURPLE="\033[35m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
DIM="\033[2m"

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/back-end"
FRONTEND_DIR="$ROOT_DIR/font-end"
VENV_DIR="$BACKEND_DIR/.venv"

# ── PIDs for cleanup ──────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

# ── Banner ────────────────────────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ██╗      ██████╗  ██████╗ █████╗ ██╗      █████╗ ██╗"
  echo "  ██║     ██╔═══██╗██╔════╝██╔══██╗██║     ██╔══██╗██║"
  echo "  ██║     ██║   ██║██║     ███████║██║     ███████║██║"
  echo "  ██║     ██║   ██║██║     ██╔══██║██║     ██╔══██║██║"
  echo "  ███████╗╚██████╔╝╚██████╗██║  ██║███████╗██║  ██║██║"
  echo "  ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝"
  echo -e "${RESET}${PURPLE}${BOLD}          Multi-Agent Orchestration Dashboard${RESET}"
  echo ""
}

# ── Log helpers ───────────────────────────────────────────────────────────────
log_step()    { echo -e "${CYAN}${BOLD}[MESH]${RESET} $*"; }
log_backend() { echo -e "${PURPLE}${BOLD}[BACK]${RESET} $*"; }
log_frontend(){ echo -e "${CYAN}${BOLD}[FRONT]${RESET} $*"; }
log_ok()      { echo -e "${GREEN}${BOLD}[ OK ]${RESET} $*"; }
log_warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET} $*"; }
log_error()   { echo -e "${RED}${BOLD}[ERR ]${RESET} $*"; }

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo ""
  log_step "Shutting down..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null && log_backend  "Stopped (PID $BACKEND_PID)"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null && log_frontend "Stopped (PID $FRONTEND_PID)"
  echo ""
  echo -e "${DIM}Goodbye.${RESET}"
}
trap cleanup EXIT INT TERM

# ── Dependency checks ─────────────────────────────────────────────────────────
check_deps() {
  log_step "Checking dependencies..."

  if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
    log_error "Python 3 not found. Install from https://python.org"
    exit 1
  fi

  PYTHON=$(command -v python3 || command -v python)
  PY_VER=$("$PYTHON" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
  log_ok "Python $PY_VER ($PYTHON)"

  if ! command -v node &>/dev/null; then
    log_error "Node.js not found. Install from https://nodejs.org"
    exit 1
  fi
  log_ok "Node.js $(node --version)"

  if ! command -v npm &>/dev/null; then
    log_error "npm not found."
    exit 1
  fi
  log_ok "npm $(npm --version)"
}

# ── Backend setup ─────────────────────────────────────────────────────────────
setup_backend() {
  log_backend "Setting up backend..."

  if [[ ! -d "$VENV_DIR" ]]; then
    log_backend "Creating virtual environment..."
    "$PYTHON" -m venv "$VENV_DIR"
    log_ok "Virtual environment created at .venv"
  fi

  # Activate
  if [[ -f "$VENV_DIR/bin/activate" ]]; then
    # shellcheck disable=SC1090
    source "$VENV_DIR/bin/activate"
  elif [[ -f "$VENV_DIR/Scripts/activate" ]]; then
    # shellcheck disable=SC1090
    source "$VENV_DIR/Scripts/activate"
  else
    log_error "Could not find venv activate script"
    exit 1
  fi

  log_backend "Installing Python dependencies..."
  pip install -q -r "$BACKEND_DIR/requirements.txt"
  log_ok "Python dependencies ready"

  # Copy .env.example → .env if .env missing
  if [[ ! -f "$BACKEND_DIR/.env" ]]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    log_warn ".env created from .env.example — review settings if needed"
  fi
}

# ── Frontend setup ────────────────────────────────────────────────────────────
setup_frontend() {
  log_frontend "Setting up frontend..."

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    log_frontend "Installing Node.js dependencies (first run may take a while)..."
    npm install --prefix "$FRONTEND_DIR" --silent
    log_ok "Node.js dependencies installed"
  else
    log_ok "node_modules present — skipping install"
  fi
}

# ── Start backend ─────────────────────────────────────────────────────────────
start_backend() {
  log_backend "Starting FastAPI server on http://localhost:8000 ..."

  # Prefix each line of backend output
  (
    cd "$BACKEND_DIR"
    python main.py 2>&1 | while IFS= read -r line; do
      echo -e "${PURPLE}${BOLD}[BACK]${RESET} ${DIM}${line}${RESET}"
    done
  ) &
  BACKEND_PID=$!
  log_ok "Backend started (PID $BACKEND_PID)"
}

# ── Start frontend ────────────────────────────────────────────────────────────
start_frontend() {
  log_frontend "Starting Next.js dev server on http://localhost:3000 ..."

  (
    cd "$FRONTEND_DIR"
    npm run dev 2>&1 | while IFS= read -r line; do
      echo -e "${CYAN}${BOLD}[FRONT]${RESET} ${DIM}${line}${RESET}"
    done
  ) &
  FRONTEND_PID=$!
  log_ok "Frontend started (PID $FRONTEND_PID)"
}

# ── Wait for services ─────────────────────────────────────────────────────────
wait_for_backend() {
  log_step "Waiting for backend to be ready..."
  local max=20 i=0
  while (( i < max )); do
    if curl -sf http://localhost:8000/health &>/dev/null; then
      log_ok "Backend is ready — http://localhost:8000"
      return 0
    fi
    sleep 1
    (( i++ ))
  done
  log_warn "Backend did not respond in ${max}s — check logs above"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  print_banner

  check_deps
  echo ""

  setup_backend
  setup_frontend
  echo ""

  start_backend
  sleep 2   # give uvicorn a moment before frontend tries to connect
  start_frontend
  echo ""

  wait_for_backend

  echo ""
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${RESET}"
  echo -e "${GREEN}${BOLD}║  LocalAI Mesh is running                     ║${RESET}"
  echo -e "${GREEN}${BOLD}║                                              ║${RESET}"
  echo -e "${GREEN}${BOLD}║  Frontend  →  http://localhost:3000          ║${RESET}"
  echo -e "${GREEN}${BOLD}║  Backend   →  http://localhost:8000          ║${RESET}"
  echo -e "${GREEN}${BOLD}║  API Docs  →  http://localhost:8000/docs     ║${RESET}"
  echo -e "${GREEN}${BOLD}║                                              ║${RESET}"
  echo -e "${GREEN}${BOLD}║  Press Ctrl+C to stop all services           ║${RESET}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${RESET}"
  echo ""

  # Keep script alive and stream both logs
  wait "$BACKEND_PID" "$FRONTEND_PID"
}

main "$@"
