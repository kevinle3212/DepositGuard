#!/usr/bin/env bash
# Local development environment bootstrap.
# Installs all dependencies, copies .env.example → .env, and verifies
# required tooling. Safe to re-run — existing .env is never overwritten.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }

# ── Tooling checks ────────────────────────────────────────────────────────────
check_tool() {
  command -v "$1" >/dev/null 2>&1 || error "Required tool not found: $1. Install it and re-run."
}

info "Checking required tools..."
check_tool node
check_tool yarn
check_tool cargo
check_tool solana
check_tool anchor

NODE_VERSION=$(node -e "process.exit(parseInt(process.versions.node) < 20 ? 1 : 0)" 2>&1 || true)
node -e "if(parseInt(process.versions.node) < 20) process.exit(1)" \
  || error "Node.js 20+ required (found $(node -v))."

info "All tools present."

# ── Dependencies ──────────────────────────────────────────────────────────────
info "Installing root JS dependencies..."
yarn install --frozen-lockfile

info "Installing Cloud Run service dependencies..."
for svc_dir in services/*/; do
  if [[ -f "$svc_dir/package.json" ]]; then
    info "  → $svc_dir"
    (cd "$svc_dir" && npm ci --quiet)
  fi
done

# ── Environment variables ─────────────────────────────────────────────────────
if [[ -f .env ]]; then
  warn ".env already exists — skipping copy. Verify it contains all values from .env.example."
else
  cp .env.example .env
  info "Copied .env.example → .env. Fill in the required values before starting."
fi

# ── Rust / Anchor ─────────────────────────────────────────────────────────────
info "Building Anchor program (first build may take a few minutes)..."
anchor build

info ""
info "Setup complete. Next steps:"
info "  1. Edit .env with your API keys and project IDs."
info "  2. Run 'yarn dev' to start the Next.js frontend."
info "  3. See docker/README.md to spin up local Cloud Run services via Docker Compose."
