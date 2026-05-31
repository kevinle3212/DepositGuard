#!/usr/bin/env bash
# =============================================================================
#  DepositGuard / NestCrow  —  Local development setup
# =============================================================================
#
#  Run this once to get the project running on your machine:
#
#    chmod +x setup.sh && ./setup.sh
#
#  What it installs:
#    - Homebrew (macOS only, if missing)
#    - nvm  →  Node.js 22
#    - Corepack / Yarn
#    - All npm / node_modules dependencies
#
#  Optional (prompted):
#    - Rust + Cargo
#    - Solana CLI
#    - Anchor CLI (AVM)
#    → Only needed if you want to build / deploy the Solana program.
#      Skip these if you just want to run the Next.js web app.
#
#  After this script finishes:
#    1. Fill in .env with your API keys (see .env.example for instructions)
#    2. Run:  yarn dev
#    3. Open: http://localhost:3000
#
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[info]${RESET}  $*"; }
success() { echo -e "${GREEN}[ok]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
error()   { echo -e "${RED}[error]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}━━  $*${RESET}"; }

# ── Helpers ───────────────────────────────────────────────────────────────────
have() { command -v "$1" &>/dev/null; }

confirm() {
  local prompt="$1"
  local response
  read -r -p "$(echo -e "${YELLOW}[?]${RESET}    $prompt [y/N] ")" response
  [[ "$response" =~ ^[Yy]$ ]]
}

# Reload PATH changes made by installers in this session
reload_path() {
  # shellcheck source=/dev/null
  [ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
  export PATH="$HOME/.avm/bin:$PATH"
}

# ── OS detection ──────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="macos" ;;
  Linux)  PLATFORM="linux" ;;
  *)      error "Unsupported OS: $OS. This script supports macOS and Linux."; exit 1 ;;
esac

echo -e "\n${BOLD}  DepositGuard — Local Setup${RESET}"
echo    "  Platform : $OS ($ARCH)"
echo    "  Date     : $(date)"
echo

# ── 1. Homebrew (macOS only) ──────────────────────────────────────────────────
if [[ "$PLATFORM" == "macos" ]]; then
  step "Homebrew"
  if have brew; then
    success "Homebrew already installed"
  else
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add Homebrew to PATH for Apple Silicon
    if [[ "$ARCH" == "arm64" ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    success "Homebrew installed"
  fi
fi

# ── 2. Git ────────────────────────────────────────────────────────────────────
step "Git"
if have git; then
  success "git $(git --version | awk '{print $3}')"
else
  if [[ "$PLATFORM" == "macos" ]]; then
    info "Installing git via Homebrew..."
    brew install git
  else
    info "Installing git via apt..."
    sudo apt-get update -qq && sudo apt-get install -y git
  fi
  success "Git installed"
fi

# ── 3. nvm + Node.js 22 ───────────────────────────────────────────────────────
step "nvm + Node.js"

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NODE_VERSION="22"

# Install nvm if missing
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  info "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  success "nvm installed"
else
  success "nvm already installed"
fi

# Load nvm into this shell session
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

# Install and use Node 22
if nvm ls "$NODE_VERSION" &>/dev/null; then
  success "Node.js $NODE_VERSION already installed"
else
  info "Installing Node.js $NODE_VERSION..."
  nvm install "$NODE_VERSION"
  success "Node.js $NODE_VERSION installed"
fi

nvm use "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
success "Using Node.js $(node --version)"

# ── 4. Corepack / Yarn ────────────────────────────────────────────────────────
step "Yarn"

if have yarn; then
  success "yarn $(yarn --version) already available"
else
  info "Enabling corepack and installing Yarn..."
  corepack enable
  corepack prepare yarn@stable --activate
  success "yarn $(yarn --version) installed"
fi

# ── 5. Project dependencies ───────────────────────────────────────────────────
step "Project dependencies"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

info "Running yarn install (this may take a minute)..."
yarn install
success "Dependencies installed"

# ── 6. Environment file ───────────────────────────────────────────────────────
step "Environment (.env)"

if [ -f ".env" ]; then
  success ".env already exists — skipping copy"
else
  cp .env.example .env
  success ".env created from .env.example"
  warn "You must fill in the required values in .env before running the app."
  warn "Open .env and follow the HOW TO GET instructions for each variable."
fi

# ── 7. Optional: Rust + Cargo ─────────────────────────────────────────────────
step "Rust (optional — for Solana program development)"

if have rustc; then
  success "Rust $(rustc --version | awk '{print $2}') already installed"
  RUST_INSTALLED=true
else
  if confirm "Install Rust + Cargo? (needed only for Solana program dev)"; then
    info "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    reload_path
    success "Rust $(rustc --version | awk '{print $2}') installed"
    RUST_INSTALLED=true
  else
    info "Skipping Rust"
    RUST_INSTALLED=false
  fi
fi

# ── 8. Optional: Solana CLI ───────────────────────────────────────────────────
step "Solana CLI (optional)"

if have solana; then
  success "Solana CLI $(solana --version | awk '{print $2}') already installed"
  SOLANA_INSTALLED=true
elif [[ "$RUST_INSTALLED" == true ]] && confirm "Install Solana CLI?"; then
  info "Installing Solana CLI..."
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
  reload_path
  if have solana; then
    success "Solana CLI $(solana --version | awk '{print $2}') installed"
    # Configure for devnet
    solana config set --url devnet &>/dev/null
    info "Configured Solana CLI to use devnet"
    # Generate a local wallet if none exists
    if [ ! -f "$HOME/.config/solana/id.json" ]; then
      solana-keygen new --no-bip39-passphrase --silent
      success "Generated local Solana wallet at ~/.config/solana/id.json"
    fi
    SOLANA_INSTALLED=true
  else
    warn "Solana CLI installed but not yet on PATH. Restart your terminal and run 'solana --version' to verify."
    SOLANA_INSTALLED=false
  fi
else
  info "Skipping Solana CLI"
  SOLANA_INSTALLED=false
fi

# ── 9. Optional: Anchor / AVM ─────────────────────────────────────────────────
step "Anchor CLI / AVM (optional)"

ANCHOR_VERSION="1.0.2"   # must match Anchor.toml

if have anchor; then
  success "Anchor $(anchor --version | awk '{print $2}') already installed"
elif [[ "$SOLANA_INSTALLED" == true ]] && confirm "Install Anchor CLI $ANCHOR_VERSION (via AVM)?"; then
  info "Installing AVM..."
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  reload_path
  info "Installing Anchor $ANCHOR_VERSION..."
  avm install "$ANCHOR_VERSION"
  avm use "$ANCHOR_VERSION"
  success "Anchor $(anchor --version | awk '{print $2}') installed"
else
  info "Skipping Anchor"
fi

# ── 10. Shell profile update ──────────────────────────────────────────────────
step "Shell profile"

# Detect the user's shell config file
if [[ "$SHELL" == */zsh ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == */bash ]]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.profile"
fi

# nvm init block
NVM_INIT_BLOCK='
# nvm (added by DepositGuard setup)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"'

if grep -q 'NVM_DIR' "$SHELL_RC" 2>/dev/null; then
  success "nvm already in $SHELL_RC"
else
  printf '%s\n' "$NVM_INIT_BLOCK" >> "$SHELL_RC"
  success "Added nvm init to $SHELL_RC"
fi

# Solana PATH
if [[ "$SOLANA_INSTALLED" == true ]]; then
  SOLANA_PATH_LINE='export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'
  if grep -q 'solana/install/active_release' "$SHELL_RC" 2>/dev/null; then
    success "Solana already in PATH ($SHELL_RC)"
  else
    echo "$SOLANA_PATH_LINE" >> "$SHELL_RC"
    success "Added Solana to PATH in $SHELL_RC"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  Setup complete!${RESET}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo
echo -e "${BOLD}  Next steps:${RESET}"
echo
echo    "  1. Fill in .env with your credentials:"
echo -e "       ${CYAN}open .env${RESET}   (or use any text editor)"
echo    "     Required keys for the web app:"
echo    "       GEMINI_API_KEY         → https://aistudio.google.com/app/apikey"
echo    "       JWT_SIGNING_SECRET     → node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo    "       GCP_PROJECT_ID         → your Firebase / GCP project ID"
echo    "       FIREBASE_STORAGE_BUCKET → your Firebase Storage bucket name"
echo    "     (See .env.example for full instructions on each variable)"
echo
echo    "  2. Start the dev server:"
echo -e "       ${CYAN}yarn dev${RESET}"
echo
echo    "  3. Open the app:"
echo -e "       ${CYAN}http://localhost:3000${RESET}"
echo
if [[ "$SOLANA_INSTALLED" == true ]]; then
  echo    "  Solana / Anchor (smart contract dev):"
  echo -e "       ${CYAN}anchor build${RESET}    — compile the Rust program"
  echo -e "       ${CYAN}anchor deploy${RESET}   — deploy to devnet"
  echo -e "       ${CYAN}yarn test-anchor${RESET} — run on-chain tests"
  echo
fi
echo -e "  ${YELLOW}Note:${RESET} Restart your terminal (or run ${CYAN}source $SHELL_RC${RESET}) to"
echo    "        pick up PATH changes from this session."
echo
