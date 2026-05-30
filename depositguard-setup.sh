#!/usr/bin/env bash
# =============================================================================
#  DepositGuard / Team Quack Quack  -  QuackHacks dev environment setup
# =============================================================================
#
#  PLEASE READ THIS WHOLE BLOCK BEFORE RUNNING. It is written for everyone on
#  the team, including those who do not use the terminal much. Follow the
#  section for your computer (Mac or Windows).
#
#  To open the terminal on a Mac, press Cmd+Space, type "Terminal", and press
#  Enter. On Windows, you will use Ubuntu (WSL); the Windows section below
#  explains how to install and open it.
#
#  Reading this takes about five minutes and saves a lot of confusion.
#
# -----------------------------------------------------------------------------
#  WHAT THIS SCRIPT DOES
# -----------------------------------------------------------------------------
#  This is a one-time setup helper. It does two things:
#
#    1. It installs the programming tools our project needs onto your computer.
#       You run it once, it installs everything, and then you are ready.
#    2. It downloads (clones) our project code from GitHub into the folder you
#       run the script from. See "WHERE THE PROJECT IS DOWNLOADED" below.
#
#  TOOLS IT INSTALLS:
#      - Build tools     the basic compiler tools the other tools rely on
#      - Git             version control, also used to download our code
#      - Node.js + npm   runs our website code
#      - Rust + Cargo    the language our Solana program is written in
#      - Solana CLI      the command-line tool that talks to the blockchain
#      - Anchor + AVM    the framework for our Solana smart contract
#      - Firebase CLI    Google's tool for login, database, and hosting
#      - Yarn            a helper Anchor uses for testing
#      - Claude Code     Anthropic's AI coding assistant
#      - rtk             token-optimized CLI proxy for Claude Code
#      - serena          semantic AI coding assistant (MCP server)
#
#  IT ALSO DOES (automatically, no action needed):
#      - Runs "npm install" inside the project folder
#      - Registers serena as a global MCP server in Claude Code
#      - Wires the rtk token-saving hook into Claude Code
#      - Adds all needed lines to your shell startup file
#
#  WHAT IT DOES NOT DO (stated plainly, so nobody is confused):
#      - It does NOT compile the Solana program. Run "anchor build" once you
#        are inside the project folder.
#      - It does NOT start the website. Run "npm run dev" when you are ready.
#      - It does NOT sign you in to Firebase or Claude Code. Those need a
#        browser window; see NEXT STEPS at the end.
#      - It does NOT install "devnet". Devnet is a free Solana test network
#        that already exists online. The script only points your tools at it.
#
# -----------------------------------------------------------------------------
#  WHERE THE PROJECT IS DOWNLOADED  -  THIS MATTERS, PLEASE READ
# -----------------------------------------------------------------------------
#  The script clones the project into whatever folder you are sitting in when
#  you run it. It does NOT use a fixed, hard-coded location. So before you run
#  it, move into the folder where you want the project to live.
#
#  Example: if you want the project on your Desktop, first run:
#         cd ~/Desktop
#  Then run the script. The code ends up in:
#         ~/Desktop/DepositGuard
#
#  The "cd" command means "change directory" (move into a folder). The exact
#  "cd" command for each operating system is shown in the steps below.
#
# -----------------------------------------------------------------------------
#  HOW TO RUN IT  -  IF YOU ARE ON A MAC
# -----------------------------------------------------------------------------
#  1. Put this file (depositguard-setup.sh) somewhere easy to find, like your
#     Desktop.
#  2. Open the "Terminal" app. (Press Cmd+Space, type "Terminal", press Enter.)
#  3. Move into the folder where you want the project downloaded. To use the
#     Desktop, type this and press Enter:
#         cd ~/Desktop
#     (If you want it elsewhere, use that folder's path instead.)
#  4. Run the script by typing this and pressing Enter:
#         bash depositguard-setup.sh
#  5. When it asks "Continue? [y/N]", type the letter  y  and press Enter.
#  6. Wait. See the "WHAT TO EXPECT" section below.
#
# -----------------------------------------------------------------------------
#  HOW TO RUN IT  -  IF YOU ARE ON WINDOWS
# -----------------------------------------------------------------------------
#  A ".sh" file cannot run directly on Windows. You need WSL, which is a free
#  Linux environment built into Windows. You install it once.
#
#  STEP A  -  Install WSL (only needed the first time):
#  1. Click the Start menu and type "PowerShell".
#  2. Right-click "Windows PowerShell" and choose "Run as administrator".
#  3. In that window, type this and press Enter:
#         wsl --install
#  4. Let it finish, then RESTART your computer.
#  5. After the restart, an "Ubuntu" window opens by itself and asks you to
#     create a username and password. Pick simple ones and remember them.
#     (The password is invisible as you type it. That is normal.)
#
#  STEP B  -  Run the script inside Ubuntu (WSL):
#  1. Open the "Ubuntu" app from your Start menu.
#  2. Copy this file into your Ubuntu home folder. The easy way: in the Ubuntu
#     window, type  explorer.exe .  and press Enter. A normal Windows folder
#     window opens. Drag depositguard-setup.sh into it.
#  3. Back in the Ubuntu window, decide where the project should go. To put it
#     in your Ubuntu home folder (recommended), you are already there, so you
#     can skip ahead. To use a specific folder, "cd" into it first, e.g.:
#         cd ~/projects
#     (Create that folder first with  mkdir -p ~/projects  if it does not
#     exist yet.)
#  4. Run the script by typing this and pressing Enter:
#         bash depositguard-setup.sh
#  5. When it asks "Continue? [y/N]", type the letter  y  and press Enter.
#  6. Wait. See the "WHAT TO EXPECT" section below.
#
# -----------------------------------------------------------------------------
#  WHAT TO EXPECT WHILE IT RUNS
# -----------------------------------------------------------------------------
#  - It takes about 15 to 30 minutes. This is normal. Do not close the window
#    or shut down the device. Rust and Anchor take the longest because they
#    build from source. If it looks "stuck" on Anchor, it is not stuck; it is
#    working.
#  - You will see lines marked [ok], [warn], or [FAIL] as it goes.
#  - On a Mac, a popup may appear asking to install developer tools. Click to
#    allow it, let it finish, then run  ./depositguard-setup.sh  again.
#  - If your computer asks for your password, that is the normal login password
#    for your computer. Type it and press Enter (it stays hidden as you type).
#
# -----------------------------------------------------------------------------
#  WHEN IT FINISHES
# -----------------------------------------------------------------------------
#  - It prints a summary. If it says "All tools installed and verified", you
#    are done.
#  - If it lists items "needing attention", do not panic. Just run
#    ./depositguard-setup.sh  one more time. It is safe to re-run and will
#    retry only what failed. If something still fails after two tries, send
#    Kevin the red [FAIL] lines.
#  - IMPORTANT: close the Terminal or Ubuntu window and open a NEW one before
#    you do anything else. The new tools only become usable in a fresh window.
#    The script reminds you of this at the end.
#
# -----------------------------------------------------------------------------
#  ONE NOTE ON CLAUDE CODE
# -----------------------------------------------------------------------------
#  Installing Claude Code is free, but actually using it needs a paid Anthropic
#  plan (Pro, Max, Team, Enterprise, or Console API credits). If you do not
#  have one, the tool still installs fine; you just cannot sign in to it. Tell
#  Kevin if this applies to you.
#
#  Advanced note for whoever wants it: to skip the "Continue?" question, run
#  bash depositguard-setup.sh -y  instead.
# =============================================================================

# We deliberately do NOT use 'set -e'. If one step fails, we want to keep going,
# install everything else we can, and report all failures together at the end
# rather than stopping at the first problem.
# 'set -o pipefail' makes a piped command (a | b) report failure if ANY part of
# the pipe fails, not just the last one. That gives us more honest error checks.
set -o pipefail

# ---------- pretty output --------------------------------------------------
# These set up colored labels for the messages. We only turn colors on when the
# output is a real terminal ([ -t 1 ]); when output is piped to a file, we leave
# them empty so the file does not fill with unreadable color codes.
if [ -t 1 ]; then
    BOLD="$(printf '\033[1m')"; RESET="$(printf '\033[0m')"
    GREEN="$(printf '\033[32m')"; YELLOW="$(printf '\033[33m')"
    RED="$(printf '\033[31m')"; BLUE="$(printf '\033[34m')"
else
    BOLD=""; RESET=""; GREEN=""; YELLOW=""; RED=""; BLUE=""
fi

# FAILURES collects a human-readable message for every step that did not work,
# so we can print them all together in the final summary.
FAILURES=()

# SKIP_PROMPT controls whether we ask "Continue?" before starting. Passing -y
# on the command line skips the question (useful for automated runs).
SKIP_PROMPT="no"
[ "${1:-}" = "-y" ] && SKIP_PROMPT="yes"

# The repository to clone, and the folder name it will be cloned into. We use
# the HTTPS URL (not SSH) because it works for everyone without first setting
# up SSH keys.
REPO_URL="https://github.com/kevinle3212/DepositGuard.git"
REPO_NAME="DepositGuard"

# ---------- small helper functions -----------------------------------------
# step()  prints a bold blue heading for each numbered stage.
# ok()    prints a green success line.
# warn()  prints a yellow "heads up" line (not necessarily a problem).
# fail()  prints a red failure line AND records it in FAILURES for the summary.
# have()  silently checks whether a command exists on this computer.
step()  { printf "\n%s>> %s%s\n" "$BLUE$BOLD" "$1" "$RESET"; }
ok()    { printf "   %s[ok]%s   %s\n" "$GREEN" "$RESET" "$1"; }
warn()  { printf "   %s[warn]%s %s\n" "$YELLOW" "$RESET" "$1"; }
fail()  { printf "   %s[FAIL]%s %s\n" "$RED" "$RESET" "$1"; FAILURES+=("$1"); }
have()  { command -v "$1" >/dev/null 2>&1; }

# ---------- OS detection ---------------------------------------------------
# We figure out which operating system we are on, because the install commands
# differ. If we detect a bare Windows shell (not WSL), we stop and explain how
# to run this correctly, because a .sh file cannot set up Windows directly.
OS="unknown"
case "$(uname -s)" in
    Darwin) OS="mac" ;;
    Linux)  OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*)
        printf "%s\n" "${RED}This is a Windows shell. A .sh file will not set things up correctly here."
        printf "%s\n" "Please install WSL and run this script inside the Ubuntu terminal."
        printf "%s\n" "See the 'HOW TO RUN IT - IF YOU ARE ON WINDOWS' note at the top of this file.${RESET}"
        exit 1 ;;
esac

# ---------- basic requirement check ----------------------------------------
# Almost every install step below downloads something with 'curl'. If curl is
# missing we try to install it; if we cannot, we stop early with a clear message
# rather than letting many later steps fail in confusing ways.
if ! have curl; then
    if [ "$OS" = "linux" ] && have apt-get; then
        sudo apt-get update -y >/dev/null 2>&1
        sudo apt-get install -y curl >/dev/null 2>&1
    elif [ "$OS" = "linux" ] && have dnf; then
        sudo dnf install -y curl >/dev/null 2>&1
    fi
    if ! have curl; then
        printf "%s\n" "${RED}'curl' is required but is not installed, and it could not be installed"
        printf "%s\n" "automatically. Please install curl, then run this script again.${RESET}"
        exit 1
    fi
fi

# ---------- intro ----------------------------------------------------------
printf "%s\n" "${BOLD}=============================================================${RESET}"
printf "%s\n" "${BOLD}  DepositGuard dev setup  -  Team Quack Quack${RESET}"
printf "%s\n" "${BOLD}=============================================================${RESET}"
printf "Detected OS: %s\n" "$OS"
printf "This installs: build tools, Git, Node.js, Rust, Solana CLI,\n"
printf "Anchor, Firebase CLI, Yarn, Claude Code CLI, rtk, and serena.\n"
printf "It then clones the project into this folder:\n"
printf "   %s\n" "$PWD/$REPO_NAME"
printf "Estimated time: 15 to 30 minutes. npm does not need sudo here.\n"

if [ "$SKIP_PROMPT" != "yes" ]; then
    printf "\n%sContinue? [y/N] %s" "$BOLD" "$RESET"
    read -r REPLY
    case "$REPLY" in
        y|Y|yes|YES) ;;
        *) printf "Cancelled. No changes made.\n"; exit 0 ;;
    esac
fi

# ---------- shell rc file (for PATH updates) -------------------------------
# When we install tools, some of them live in folders that are not on your PATH
# yet (the list of places your shell looks for commands). We add the needed
# lines to your shell's startup file (.zshrc or .bashrc) so the tools keep
# working in every future terminal window, not just this one.
RC_FILE="$HOME/.bashrc"
if [ "$(basename "${SHELL:-}")" = "zsh" ] || [ -n "${ZSH_VERSION:-}" ]; then
    RC_FILE="$HOME/.zshrc"
fi
touch "$RC_FILE" 2>/dev/null

# Ensure ~/.local/bin exists early. Several installers (Claude Code, uv, rtk)
# drop binaries there and assume it already exists.
mkdir -p "$HOME/.local/bin"

# add_to_rc() appends one line to the startup file, but only if that exact line
# is not already there. This keeps the file from filling with duplicates when
# the script is run more than once.
add_to_rc() {
    local line="$1"
    if ! grep -qsF -- "$line" "$RC_FILE"; then
        printf "%s\n" "$line" >> "$RC_FILE"
    fi
}
# Mark the start of our managed block once, so it is easy to find later.
if ! grep -qsF "# >>> quackhacks setup >>>" "$RC_FILE"; then
    printf "\n# >>> quackhacks setup >>>\n" >> "$RC_FILE"
fi

# =============================================================================
#  STEP 1  -  Build prerequisites
# =============================================================================
# Many of the tools below are compiled from source, which needs a C compiler and
# a few development libraries. This step installs those basic building blocks.
step "Step 1/12  Build prerequisites (compiler tools)"
if [ "$OS" = "mac" ]; then
    # On a Mac these come from Apple's Xcode command line tools.
    if xcode-select -p >/dev/null 2>&1; then
        ok "Xcode command line tools already installed"
    else
        warn "Installing Xcode command line tools (a system popup may appear)"
        xcode-select --install >/dev/null 2>&1
        warn "If a popup appeared, finish it, then re-run this script."
    fi
elif [ "$OS" = "linux" ]; then
    # On Linux we use the system package manager (apt-get on Debian/Ubuntu,
    # dnf on Fedora/RHEL). 'sudo' may ask for your computer password.
    if have apt-get; then
        sudo apt-get update -y >/dev/null 2>&1
        if sudo apt-get install -y build-essential pkg-config libssl-dev curl python3 >/dev/null 2>&1; then
            ok "build-essential and dependencies installed"
        else
            fail "apt-get could not install build-essential"
        fi
    elif have dnf; then
        if sudo dnf groupinstall -y "Development Tools" >/dev/null 2>&1 \
              && sudo dnf install -y openssl-devel pkgconfig curl python3 >/dev/null 2>&1; then
            ok "Development Tools installed"
        else
            fail "dnf could not install development tools"
        fi
    else
        warn "Unknown Linux package manager. Install a C compiler, curl, and"
        warn "OpenSSL development headers manually if later steps fail."
    fi
fi

# =============================================================================
#  STEP 2  -  Homebrew (macOS only, used as a fallback installer)
# =============================================================================
# Homebrew is the standard package manager for macOS. We use it as a convenient
# way to install Git on a Mac. It is not used on Linux.
step "Step 2/12  Homebrew (macOS package manager)"
if [ "$OS" = "mac" ]; then
    if have brew; then
        ok "Homebrew already installed"
    elif have git; then
        # Homebrew is only needed here to install Git. If Git is already available
        # (Xcode Command Line Tools provide it on most Macs), skip Homebrew entirely.
        ok "Homebrew skipped — Git already available ($(git --version)), which is all we need it for"
    else
        warn "Installing Homebrew (needed to provide Git)"
        if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/null; then
            ok "Homebrew installed"
        else
            fail "Homebrew install failed"
            warn "  The installer output above shows the reason. Common causes:"
            warn ""
            warn "  IF IT SAYS 'needs to be an Administrator' or 'sudo access':"
            warn "    Your Mac account does not have admin rights. You have two options:"
            warn "    OPTION A — Ask whoever manages this Mac to do ONE of the following:"
            warn "      a) Make your account an Administrator:"
            warn "           System Settings → Users & Groups → select your name → enable Admin"
            warn "         Then open a new terminal and re-run this script."
            warn "      b) Install Git for you by running (as an admin):"
            warn "           xcode-select --install"
            warn "         Once that finishes, you re-run this script — Homebrew will be skipped"
            warn "         automatically because Git will already be present."
            warn "    OPTION B — Use a different Mac where you are an Administrator."
            warn ""
            warn "  IF IT SAYS something about internet / network:"
            warn "    Check your connection and re-run this script."
            warn ""
            warn "  IF NONE OF THE ABOVE:"
            warn "    Install Homebrew manually from https://brew.sh, then re-run this script."
        fi
    fi
    # Apple Silicon Macs keep brew in /opt/homebrew; Intel Macs use /usr/local.
    # We load whichever exists into this session and add it to the startup file.
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        add_to_rc 'eval "$(/opt/homebrew/bin/brew shellenv)"'
    elif [ -x /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
        add_to_rc 'eval "$(/usr/local/bin/brew shellenv)"'
    fi
else
    ok "Skipped (Linux does not use Homebrew here)"
fi

# =============================================================================
#  STEP 3  -  Git
# =============================================================================
# Git is version control. We also use it later to download (clone) the project.
step "Step 3/12  Git"
if have git; then
    ok "Git already installed ($(git --version))"
else
    if [ "$OS" = "mac" ] && have brew; then
        brew install git >/dev/null 2>&1 && ok "Git installed" || fail "Git install failed"
    elif have apt-get; then
        sudo apt-get install -y git >/dev/null 2>&1 && ok "Git installed" || fail "Git install failed"
    elif have dnf; then
        sudo dnf install -y git >/dev/null 2>&1 && ok "Git installed" || fail "Git install failed"
    else
        fail "Could not install Git automatically. Please install it manually."
    fi
fi

# Git requires a name and email to record who made each commit. Without these,
# every 'git commit' fails with a confusing "Author identity unknown" error.
# We only prompt when stdin is a real terminal and -y was not passed.
if have git; then
    GIT_NAME="$(git config --global user.name 2>/dev/null)"
    GIT_EMAIL="$(git config --global user.email 2>/dev/null)"
    if [ -n "$GIT_NAME" ] && [ -n "$GIT_EMAIL" ]; then
        ok "Git identity already set ($GIT_NAME <$GIT_EMAIL>)"
    elif [ "$SKIP_PROMPT" = "yes" ] || [ ! -t 0 ]; then
        warn "Git identity not set. After setup, run:"
        warn "  git config --global user.name  \"Your Name\""
        warn "  git config --global user.email \"you@example.com\""
    else
        printf "\n   %sGit needs your name and email to record who made each change.%s\n" "$BOLD" "$RESET"
        if [ -z "$GIT_NAME" ]; then
            printf "   Your full name (e.g. Jane Smith): "
            read -r GIT_NAME
            if [ -n "$GIT_NAME" ]; then
                git config --global user.name "$GIT_NAME" && ok "Git name set to: $GIT_NAME" \
                    || fail "Could not set git user.name"
            else
                warn "No name entered; skipped. Run 'git config --global user.name \"Your Name\"' later."
            fi
        fi
        if [ -z "$GIT_EMAIL" ]; then
            printf "   Your email address: "
            read -r GIT_EMAIL
            if [ -n "$GIT_EMAIL" ]; then
                git config --global user.email "$GIT_EMAIL" && ok "Git email set to: $GIT_EMAIL" \
                    || fail "Could not set git user.email"
            else
                warn "No email entered; skipped. Run 'git config --global user.email \"you@example.com\"' later."
            fi
        fi
    fi
fi

# =============================================================================
#  STEP 4  -  Node.js 20 LTS via nvm
# =============================================================================
# Node.js runs our website code, and npm (bundled with Node) installs packages.
# We use nvm (Node Version Manager) so everyone ends up on the same version
# without needing admin rights.
step "Step 4/12  Node.js 20 LTS (via nvm)"
NODE_OK="no"
if have node; then
    # If Node is already here and recent enough (version 18 or newer), keep it.
    NODE_MAJOR="$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)"
    if [ "${NODE_MAJOR:-0}" -ge 18 ] 2>/dev/null; then
        ok "Node.js already installed ($(node -v))"
        NODE_OK="yes"
    else
        warn "Node.js is too old ($(node -v)). Installing a current version via nvm."
    fi
fi

if [ "$NODE_OK" != "yes" ]; then
    export NVM_DIR="$HOME/.nvm"
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
        warn "Installing nvm (Node Version Manager)"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash >/dev/null 2>&1
    fi
    # Load nvm into this session so we can use it right away.
    # shellcheck disable=SC1090
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    if have nvm; then
        nvm install 20 >/dev/null 2>&1
        nvm alias default 20 >/dev/null 2>&1
        nvm use 20 >/dev/null 2>&1
        if have node; then
            ok "Node.js installed ($(node -v))"
        else
            fail "Node.js install via nvm did not complete"
        fi
    else
        fail "nvm did not install. Please install Node.js 20+ manually from nodejs.org."
    fi
    # Make sure nvm and Node load in every future terminal window.
    add_to_rc 'export NVM_DIR="$HOME/.nvm"'
    add_to_rc '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
fi

# Ensure npm global installs don't require sudo. If npm's prefix points to a
# system directory the current user cannot write to, redirect it to a
# user-owned folder. This fixes the EACCES error on system Node installs.
if have npm; then
    NPM_PREFIX="$(npm config get prefix 2>/dev/null)"
    if [ -n "$NPM_PREFIX" ] && [ ! -w "$NPM_PREFIX" ]; then
        warn "npm global prefix ($NPM_PREFIX) is not writable. Redirecting to ~/.npm-global"
        mkdir -p "$HOME/.npm-global"
        npm config set prefix "$HOME/.npm-global"
        export PATH="$HOME/.npm-global/bin:$PATH"
        add_to_rc 'export PATH="$HOME/.npm-global/bin:$PATH"'
        ok "npm global prefix set to ~/.npm-global (no sudo needed)"
    fi
fi

# =============================================================================
#  STEP 5  -  Rust + Cargo
# =============================================================================
# Rust is the language our Solana program is written in; Cargo is its build tool
# and package manager. We install both with rustup, the official installer.
step "Step 5/12  Rust and Cargo (needed to build the Solana program)"
if have rustc && have cargo; then
    ok "Rust already installed ($(rustc --version))"
else
    warn "Installing Rust via rustup (this can take a few minutes)"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y >/dev/null 2>&1
    # Load cargo into this session so the next step can use it immediately.
    # shellcheck disable=SC1090
    [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
    if have cargo; then
        ok "Rust installed ($(rustc --version))"
    else
        fail "Rust install did not complete"
    fi
fi
# Ensure cargo is on PATH for this session and for future terminal windows.
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
add_to_rc '. "$HOME/.cargo/env"'

# =============================================================================
#  STEP 6  -  Solana CLI
# =============================================================================
# The Solana CLI is the command-line tool that talks to the Solana blockchain.
step "Step 6/12  Solana CLI"
SOLANA_BIN="$HOME/.local/share/solana/install/active_release/bin"
if have solana; then
    ok "Solana CLI already installed ($(solana --version))"
else
    warn "Installing Solana CLI"
    # The current installer is hosted by Anza. If this URL ever stops working,
    # check the latest install command at:
    #   https://solana.com/docs/intro/installation
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)" >/dev/null 2>&1
    export PATH="$SOLANA_BIN:$PATH"
    if have solana; then
        ok "Solana CLI installed ($(solana --version))"
    else
        fail "Solana CLI install did not complete. See solana.com/docs/intro/installation"
    fi
fi
# Add Solana to PATH for this session and future windows.
export PATH="$SOLANA_BIN:$PATH"
add_to_rc "export PATH=\"$SOLANA_BIN:\$PATH\""

# Point the CLI at devnet (the free test network) so nobody spends real money.
if have solana; then
    solana config set --url devnet >/dev/null 2>&1 \
        && ok "Solana CLI pointed at devnet (free test network)" \
        || warn "Could not set the Solana cluster to devnet automatically"
fi


# =============================================================================
#  STEP 7  -  Anchor (via AVM, the Anchor Version Manager)
# =============================================================================
# Anchor is the framework our Solana smart contract is built with. We install it
# through AVM so the version can be managed cleanly. This step compiles from
# source and is the slowest part of the whole setup.
step "Step 7/12  Anchor framework (via AVM) - this is the slowest step"
if have anchor; then
    ok "Anchor already installed ($(anchor --version 2>/dev/null))"
else
    if have cargo; then
        warn "Installing AVM, then the latest Anchor. This compiles from source."
        warn "Expect several minutes here. This is normal, not a hang."
        cargo install --git https://github.com/coral-xyz/anchor avm --force >/dev/null 2>&1
        if have avm; then
            avm install latest >/dev/null 2>&1
            avm use latest >/dev/null 2>&1
            if have anchor; then
                ok "Anchor installed ($(anchor --version 2>/dev/null))"
                warn "Pin this exact version in your project's Anchor.toml to avoid mismatches."
            else
                fail "AVM installed but Anchor did not. Run 'avm install latest' manually."
            fi
        else
            fail "AVM did not install. See anchor-lang.com for manual steps."
        fi
    else
        fail "Cargo is missing, so Anchor cannot be installed. Fix Step 5 first."
    fi
fi

# =============================================================================
#  STEP 8  -  Firebase CLI and Yarn (npm global packages)
# =============================================================================
# Firebase handles our login, database, and photo storage. Yarn is the test
# runner Anchor uses by default. Both are installed through npm.
step "Step 8/12  Firebase CLI and Yarn"
if have npm; then
    # Bring any newly-configured npm-global/bin into PATH for this session so
    # freshly-installed binaries are immediately visible to 'have' checks below.
    export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"

    # ---- Firebase CLI ---------------------------------------------------------
    # Also check well-known bin paths directly in case PATH isn't updated yet.
    FIREBASE_BIN=""
    have firebase && FIREBASE_BIN="$(command -v firebase)"
    [ -z "$FIREBASE_BIN" ] && [ -x "$HOME/.npm-global/bin/firebase" ] && FIREBASE_BIN="$HOME/.npm-global/bin/firebase"
    [ -z "$FIREBASE_BIN" ] && [ -x "$HOME/.local/bin/firebase"      ] && FIREBASE_BIN="$HOME/.local/bin/firebase"

    if [ -n "$FIREBASE_BIN" ]; then
        ok "Firebase CLI already installed ($("$FIREBASE_BIN" --version 2>/dev/null))"
    else
        warn "Installing Firebase CLI via npm"
        NPM_FIREBASE_LOG="$(npm install -g firebase-tools 2>&1)"
        NPM_FIREBASE_RC=$?

        # Re-check PATH after install.
        export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"
        have firebase && FIREBASE_BIN="$(command -v firebase)"
        [ -z "$FIREBASE_BIN" ] && [ -x "$HOME/.npm-global/bin/firebase" ] && FIREBASE_BIN="$HOME/.npm-global/bin/firebase"

        if [ -n "$FIREBASE_BIN" ]; then
            ok "Firebase CLI installed ($("$FIREBASE_BIN" --version 2>/dev/null))"
        else
            # npm failed — figure out why and offer the right fix.
            if echo "$NPM_FIREBASE_LOG" | grep -q "EACCES"; then
                warn "npm permission error; trying Firebase standalone installer as fallback"
                if curl -fsSL https://firebase.tools | bash >/dev/null 2>&1; then
                    export PATH="$HOME/.local/bin:$PATH"
                    if have firebase; then
                        ok "Firebase CLI installed via standalone installer"
                    else
                        fail "Firebase CLI install failed (standalone installer ran but binary not found)"
                        warn "  Open a NEW terminal and try: firebase --version"
                        warn "  If still missing, run manually: curl -fsSL https://firebase.tools | bash"
                    fi
                else
                    fail "Firebase CLI install failed (npm: permission error; standalone: also failed)"
                    warn "  Manual fixes — try in order, then re-run this script:"
                    warn "    1. npm config set prefix ~/.npm-global"
                    warn "       npm install -g firebase-tools"
                    warn "    2. curl -fsSL https://firebase.tools | bash"
                    warn "    3. sudo npm install -g firebase-tools   (last resort)"
                fi
            else
                fail "Firebase CLI install failed (exit $NPM_FIREBASE_RC)"
                warn "  Manual fix: npm install -g firebase-tools"
                warn "  If you see a permissions error, first run:"
                warn "    npm config set prefix ~/.npm-global"
                warn "  Then retry: npm install -g firebase-tools"
            fi
        fi
    fi

    # ---- Yarn -----------------------------------------------------------------
    YARN_BIN=""
    have yarn && YARN_BIN="$(command -v yarn)"
    [ -z "$YARN_BIN" ] && [ -x "$HOME/.npm-global/bin/yarn" ] && YARN_BIN="$HOME/.npm-global/bin/yarn"

    if [ -n "$YARN_BIN" ]; then
        ok "Yarn already installed ($("$YARN_BIN" --version 2>/dev/null))"
    else
        warn "Installing Yarn (Anchor's default test runner)"
        NPM_YARN_LOG="$(npm install -g yarn 2>&1)"
        NPM_YARN_RC=$?

        export PATH="$HOME/.npm-global/bin:$PATH"
        have yarn && YARN_BIN="$(command -v yarn)"
        [ -z "$YARN_BIN" ] && [ -x "$HOME/.npm-global/bin/yarn" ] && YARN_BIN="$HOME/.npm-global/bin/yarn"

        if [ -n "$YARN_BIN" ]; then
            ok "Yarn installed ($("$YARN_BIN" --version 2>/dev/null))"
        else
            if echo "$NPM_YARN_LOG" | grep -q "EACCES"; then
                fail "Yarn install failed (npm permission error)"
                warn "  Manual fix:"
                warn "    npm config set prefix ~/.npm-global"
                warn "    npm install -g yarn"
            else
                fail "Yarn install failed (exit $NPM_YARN_RC)"
                warn "  Manual fix: npm install -g yarn"
            fi
        fi
    fi
else
    fail "npm is missing, so Firebase CLI and Yarn were skipped. Fix Step 4 first."
fi

# =============================================================================
#  STEP 9  -  Claude Code CLI
# =============================================================================
# Claude Code is Anthropic's AI coding assistant. We use Anthropic's native
# installer (the recommended method); it needs no Node.js and sets up its own
# location. An npm fallback is noted below in case the native installer fails.
step "Step 9/12  Claude Code CLI"
if have claude; then
    ok "Claude Code already installed ($(claude --version 2>/dev/null))"
else
    warn "Installing Claude Code via the official native installer"
    curl -fsSL https://claude.ai/install.sh | bash >/dev/null 2>&1
    # The native installer usually places the binary in ~/.local/bin.
    export PATH="$HOME/.local/bin:$PATH"
    if have claude; then
        ok "Claude Code installed ($(claude --version 2>/dev/null))"
    else
        warn "Claude Code installed but 'claude' is not on PATH in this session."
        warn "Open a new terminal and run 'claude --version' to confirm."
        warn "npm fallback if needed: npm install -g @anthropic-ai/claude-code"
    fi
fi
add_to_rc 'export PATH="$HOME/.local/bin:$PATH"'

# =============================================================================
#  STEP 10  -  rtk (token-optimized Claude Code CLI proxy)
# =============================================================================
# rtk transparently rewrites shell commands so Claude Code reads far less
# output per call, cutting 60-90 % of token usage. After the binary is
# installed, 'rtk init -g' wires the Claude Code hook and writes RTK.md.
step "Step 10/12  rtk (Claude Code token-saver)"
if have rtk; then
    ok "rtk already installed ($(rtk --version 2>/dev/null | head -n1))"
else
    warn "Installing rtk via the official install script"
    curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh \
        | sh >/dev/null 2>&1
    # The installer usually drops the binary in ~/.local/bin (already on PATH).
    export PATH="$HOME/.local/bin:$PATH"

    # Homebrew fallback on Mac.
    if ! have rtk && [ "$OS" = "mac" ] && have brew; then
        warn "Curl installer did not place rtk on PATH; trying Homebrew"
        brew install rtk >/dev/null 2>&1
    fi

    # Cargo fallback (last resort; requires Rust from Step 5).
    if ! have rtk && have cargo; then
        warn "Trying cargo install as last resort"
        cargo install --git https://github.com/rtk-ai/rtk --locked >/dev/null 2>&1
        [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
    fi

    if have rtk; then
        ok "rtk installed ($(rtk --version 2>/dev/null | head -n1))"
    else
        fail "rtk install did not complete. After setup, run the install script manually:"
        fail "  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh"
    fi
fi

# Wire the Claude Code hook and create RTK.md (idempotent; safe to re-run).
if have rtk; then
    if rtk init -g >/dev/null 2>&1; then
        ok "rtk init -g complete  (Claude Code hook active; restart claude if it is open)"
    else
        warn "rtk init -g returned non-zero (may already be initialised). No action needed."
    fi
fi

# =============================================================================
#  STEP 11  -  serena (semantic AI coding assistant / MCP server)
# =============================================================================
# serena is an MCP server that gives Claude Code semantic code intelligence
# (go-to-definition, symbol search, references, etc.).
# Install order: uv → serena binary → MCP registration → hooks in settings.json.
step "Step 11/12  serena (semantic MCP server)"

# -- uv (fast Python package / tool manager) --------------------------------
if have uv; then
    ok "uv already installed ($(uv --version 2>/dev/null | head -n1))"
else
    warn "Installing uv (Python tool manager, required by serena)"
    curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
    export PATH="$HOME/.local/bin:$PATH"
    if have uv; then
        ok "uv installed ($(uv --version 2>/dev/null | head -n1))"
    else
        fail "uv install did not complete. Install from https://docs.astral.sh/uv/ then re-run."
    fi
fi

# -- serena binary ----------------------------------------------------------
if have uv; then
    if uv tool list 2>/dev/null | grep -q "^serena"; then
        ok "serena already installed"
    else
        warn "Installing serena via uv (downloads from GitHub)"
        uv tool install git+https://github.com/oraios/serena >/dev/null 2>&1
        if uv tool list 2>/dev/null | grep -q "^serena"; then
            ok "serena installed"
        else
            fail "serena install did not complete. After setup, run:"
            fail "  uv tool install git+https://github.com/oraios/serena"
        fi
    fi
    # uv tool binaries land in ~/.local/bin, already on PATH from Step 9.
    add_to_rc 'export PATH="$HOME/.local/bin:$PATH"'
else
    fail "uv is not available; serena was skipped. Fix uv install above first."
fi

# -- Register serena as a global MCP server in Claude Code -----------------
# 'serena setup claude-code' runs:
#   claude mcp add --scope user serena -- serena start-mcp-server \
#     --context claude-code --project-from-cwd
# It is idempotent; running it again just overwrites the same entry.
if have uv && uv tool list 2>/dev/null | grep -q "^serena"; then
    export PATH="$HOME/.local/bin:$PATH"
    if have serena && have claude; then
        warn "Registering serena as a global MCP server in Claude Code"
        if serena setup claude-code >/dev/null 2>&1; then
            ok "serena registered with Claude Code (verify with: claude /mcp)"
        else
            warn "serena setup claude-code returned non-zero; trying the manual command"
            claude mcp add --scope user serena -- \
                serena start-mcp-server --context claude-code --project-from-cwd \
                >/dev/null 2>&1 \
                && ok "serena registered with Claude Code (manual)" \
                || warn "MCP registration failed. After setup, run:"$'\n'"        serena setup claude-code"
        fi
    else
        warn "claude or serena not on PATH yet; MCP registration skipped."
        warn "After opening a new terminal, run: serena setup claude-code"
    fi
fi

# -- Serena hooks in ~/.claude/settings.json (strongly recommended) ---------
# These hooks address "agent drift": they remind Claude to use serena tools,
# auto-approve serena MCP calls, and activate/clean up the project each session.
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"

if grep -qsF "serena-hooks" "$CLAUDE_SETTINGS" 2>/dev/null; then
    ok "serena hooks already present in $CLAUDE_SETTINGS"
elif ! (have uv && uv tool list 2>/dev/null | grep -q "^serena" 2>/dev/null); then
    warn "serena did not install; skipping hooks so Claude Code does not log errors."
    warn "After serena is installed, run: serena setup claude-code"
elif have python3; then
    warn "Writing serena hooks to $CLAUDE_SETTINGS"
    python3 - <<'PYEOF'
import json, os

path = os.path.expanduser("~/.claude/settings.json")
new_hooks = {
        "PreToolUse": [
                {"matcher": "", "hooks": [{"type": "command", "command": "serena-hooks remind --client=claude-code"}]},
                {"matcher": "mcp__serena__*", "hooks": [{"type": "command", "command": "serena-hooks auto-approve --client=claude-code"}]}
        ],
        "SessionStart": [{"matcher": "", "hooks": [{"type": "command", "command": "serena-hooks activate --client=claude-code"}]}],
        "SessionEnd":   [{"matcher": "", "hooks": [{"type": "command", "command": "serena-hooks cleanup --client=claude-code"}]}]
}

try:
        with open(path) as f:
                cfg = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
        cfg = {}

hooks = cfg.setdefault("hooks", {})
for event, entries in new_hooks.items():
        existing = hooks.setdefault(event, [])
        for entry in entries:
                cmd = (entry.get("hooks") or [{}])[0].get("command", "")
                already = any(
                        any(h.get("command", "") == cmd for h in e.get("hooks", []))
                        for e in existing
                )
                if not already:
                        existing.append(entry)

with open(path, "w") as f:
        json.dump(cfg, f, indent=4)
        f.write("\n")
PYEOF
    ok "serena hooks written to $CLAUDE_SETTINGS"
else
    warn "python3 not found; add serena hooks to $CLAUDE_SETTINGS manually."
    warn "See: https://oraios.github.io/serena/02-usage/030_clients.html#claude-code"
fi

# serena can be slow to start on first use; a higher MCP timeout prevents
# Claude Code from giving up before serena has finished initialising.
add_to_rc 'export MCP_TIMEOUT=60000'

# Close the managed block in the startup file.
if ! grep -qsF "# <<< quackhacks setup <<<" "$RC_FILE"; then
    printf "# <<< quackhacks setup <<<\n" >> "$RC_FILE"
fi

# =============================================================================
#  STEP 12  -  Clone the DepositGuard project
# =============================================================================
# This downloads the project code into the folder you ran the script from. It
# is safe to run more than once: if the project is already here, we leave it
# alone (and try a quick update) instead of overwriting your work.
step "Step 12/12  Download the DepositGuard project code"
TARGET_DIR="$PWD/$REPO_NAME"
if ! have git; then
    fail "Git is not available, so the project could not be downloaded. Fix Step 3 first."
elif [ -d "$TARGET_DIR/.git" ]; then
    # The project is already a Git clone here. Try a gentle update, but never
    # discard local changes; just report it if the update cannot run cleanly.
    ok "Project already downloaded at $TARGET_DIR"
    if git -C "$TARGET_DIR" pull --ff-only >/dev/null 2>&1; then
        ok "Pulled the latest changes"
    else
        warn "Could not auto-update (you may have local changes). That is fine."
        warn "You can update later with: cd $REPO_NAME && git pull"
    fi
elif [ -e "$TARGET_DIR" ]; then
    # Something named DepositGuard is already here but is not a Git clone. We do
    # NOT touch it, to avoid overwriting anything the user might care about.
    fail "A folder named '$REPO_NAME' already exists here but is not a Git clone."
    warn "Move or rename it, then re-run this script to download the project."
else
    warn "Cloning the project from $REPO_URL"
    if git clone "$REPO_URL" "$TARGET_DIR" >/dev/null 2>&1; then
        ok "Project downloaded to $TARGET_DIR"
    else
        # The most common reasons a clone fails: no network, or the repository is
        # private and this person has not been added as a collaborator yet.
        fail "Could not download the project from $REPO_URL"
        warn "Check your internet connection. If the repository is private, ask"
        warn "Kevin to add you as a collaborator on GitHub, then re-run this script."
    fi
fi

# Run npm install inside the project so the frontend is ready without an extra
# manual step. Guard on package.json existing in case the clone failed above.
if [ -f "$TARGET_DIR/package.json" ] && have npm; then
    warn "Installing frontend dependencies (npm install in project)"
    if npm install --prefix "$TARGET_DIR" >/dev/null 2>&1; then
        ok "Frontend dependencies installed"
    else
        warn "npm install reported errors. Run 'npm install' from inside the project folder."
    fi
fi

# =============================================================================
#  VERIFICATION
# =============================================================================
# Here we confirm each tool is actually reachable and print its version. Anything
# missing is added to the failure list so it shows up in the final summary.
step "Verification  -  installed tool versions"
check() {
    if have "$1"; then
        printf "   %s[ok]%s   %-14s %s\n" "$GREEN" "$RESET" "$1" "$($2 2>/dev/null | head -n1)"
    else
        printf "   %s[MISSING]%s %s\n" "$RED" "$RESET" "$1"
        FAILURES+=("$1 is not available on PATH")
    fi
}
check git      "git --version"
check node     "node --version"
check npm      "npm --version"
check rustc    "rustc --version"
check cargo    "cargo --version"
check solana   "solana --version"
check anchor   "anchor --version"
check firebase "firebase --version"
check yarn     "yarn --version"
check claude   "claude --version"
check rtk      "rtk --version"
check uv       "uv --version"
# serena is a uv tool, not a standalone binary; report via uv tool list.
if uv tool list 2>/dev/null | grep -q "serena"; then
    printf "   %s[ok]%s   %-14s %s\n" "$GREEN" "$RESET" "serena" "installed"
else
    printf "   %s[MISSING]%s %s\n" "$RED" "$RESET" "serena"
    FAILURES+=("serena is not installed")
fi

# Confirm the project folder actually landed where we expect it.
if [ -d "$TARGET_DIR/.git" ]; then
    printf "   %s[ok]%s   %-14s %s\n" "$GREEN" "$RESET" "project" "$TARGET_DIR"
else
    printf "   %s[MISSING]%s %s\n" "$RED" "$RESET" "project (was not downloaded to $TARGET_DIR)"
fi

# =============================================================================
#  SUMMARY
# =============================================================================
printf "\n%s\n" "${BOLD}=============================================================${RESET}"
if [ "${#FAILURES[@]}" -eq 0 ]; then
    printf "%s\n" "${GREEN}${BOLD}  All tools installed and the project downloaded.${RESET}"
else
    printf "%s\n" "${YELLOW}${BOLD}  Setup finished with ${#FAILURES[@]} item(s) needing attention:${RESET}"
    for f in "${FAILURES[@]}"; do
        printf "   %s- %s%s\n" "$RED" "$f" "$RESET"
    done
    printf "\n   Re-running this script is safe and will retry the failed items.\n"
fi
printf "%s\n" "${BOLD}=============================================================${RESET}"

cat <<NEXT

${BOLD}NEXT STEPS  -  what you must do manually (everything else was automated)${RESET}

    -----------------------------------------------------------------------
    STEP A  Open a brand new terminal window
    -----------------------------------------------------------------------
    This is required so all the PATH changes take effect. Do this before
    anything else below.

    -----------------------------------------------------------------------
    STEP B  Sign in to Firebase  (needs a browser)
    -----------------------------------------------------------------------
    In the new terminal window, run:
                firebase login
    Your browser will open. Sign in with your Google account. Come back to
    the terminal when the browser says "Firebase CLI Login Successful".

    -----------------------------------------------------------------------
    STEP C  Sign in to Claude Code  (needs a browser)
    -----------------------------------------------------------------------
    In the terminal, run:
                claude
    The first time, it will ask you to open a browser and log in with your
    Anthropic account. Follow the prompts. Once signed in, close claude
    with Ctrl+C and continue below.

    Note: Claude Code needs a paid Anthropic plan (Pro, Max, Team,
    Enterprise, or Console API credits) to use. The install is free but
    you cannot sign in without a paid plan. Tell Kevin if this applies
    to you.

    -----------------------------------------------------------------------
    STEP D  Verify everything is working
    -----------------------------------------------------------------------
    In the new terminal, run each of these. Each should print a version:
                node -v
                solana --version
                anchor --version
                claude --version
                rtk --version
                firebase --version

    Check rtk is wired up (should show token savings):
                rtk gain

    Check serena is connected. Open Claude Code and type /mcp — you should
    see "serena" in the list. If it is not there, run this in the terminal:
                serena setup claude-code
    Then restart Claude Code.

    If any 'not found' errors appear, close the window, open a new one,
    and try again. If they persist, re-run this script and send Kevin the
    red [FAIL] lines.

    -----------------------------------------------------------------------
    STEP E  Create your Solana devnet wallet and get test tokens
    -----------------------------------------------------------------------
    Move into the project folder first:
                cd "$TARGET_DIR"

    Create a wallet (you will be asked for an optional passphrase; just
    press Enter twice to skip it for devnet):
                solana-keygen new

    Get 2 free test tokens (not real money — devnet only):
                solana airdrop 2

    -----------------------------------------------------------------------
    STEP F  Build and run the project
    -----------------------------------------------------------------------
    Compile the Solana escrow program (slow the first time; normal):
                anchor build

    Start the frontend:
                npm run dev

    -----------------------------------------------------------------------
    What the script already did for you (no action needed):
    -----------------------------------------------------------------------
        - Installed all dev tools (Git, Node, Rust, Solana CLI, Anchor, etc.)
        - Ran npm install in the project folder
        - Registered serena as a global Claude Code MCP server
        - Wired the rtk token-saving hook into Claude Code
        - Added all PATH and config lines to $RC_FILE

NEXT
