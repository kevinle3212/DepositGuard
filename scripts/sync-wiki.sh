#!/usr/bin/env bash
# Syncs docs/docs/**/*.md to the GitHub Wiki.
#
# - Strips YAML frontmatter from every file.
# - Flattens the directory structure into wiki-compatible page names.
# - Generates Home.md with a navigation table.
#
# Run locally (requires a GITHUB_TOKEN with repo write scope):
#   GITHUB_TOKEN=<token> bash scripts/sync-wiki.sh
#
# In CI, GITHUB_TOKEN is provided automatically by GitHub Actions.
set -euo pipefail

REPO="kevinle3212/DepositGuard"
WIKI_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.wiki.git"
DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docs/docs" && pwd)"
WORK_DIR="$(mktemp -d)"

trap 'rm -rf "$WORK_DIR"' EXIT

# ── Clone wiki ────────────────────────────────────────────────────────────────
git clone --depth 1 "$WIKI_URL" "$WORK_DIR/wiki" 2>/dev/null \
  || { mkdir -p "$WORK_DIR/wiki"; git -C "$WORK_DIR/wiki" init; }

cd "$WORK_DIR/wiki"
git config user.name  "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# ── Helper: strip YAML frontmatter ───────────────────────────────────────────
strip_frontmatter() {
  local file="$1"
  # If file starts with ---, remove up to and including the closing ---
  if head -1 "$file" | grep -q '^---$'; then
    awk 'BEGIN{fm=1} /^---$/ && fm==2{fm=0; next} fm==1 && NR>1{fm=2} fm==0{print}' "$file"
  else
    cat "$file"
  fi
}

# ── Helper: derive wiki page name from relative path ─────────────────────────
# e.g. "api/verify-wallet.md"      → "API-verify-wallet"
# e.g. "smart-contracts/pdas.md"   → "Smart-Contracts-PDAs"
page_name() {
  local rel="$1"   # relative to docs/docs/, e.g. "api/verify-wallet.md"
  # Strip trailing /index.md or .md, replace / with -, then title-case each segment
  local slug
  slug="$(echo "$rel" | sed -e 's|/index\.md$||' -e 's|\.md$||' -e 's|/|-|g')"
  # Title-case each dash-separated word using awk
  echo "$slug" | awk -F'-' '{
    for(i=1;i<=NF;i++) {
      w=$i
      if (length(w) > 0)
        w = toupper(substr(w,1,1)) substr(w,2)
      printf "%s%s", (i>1?"-":""), w
    }
    print ""
  }'
}

# ── Copy and transform docs ───────────────────────────────────────────────────
declare -A PAGE_MAP   # rel_path → wiki page name (without .md)

while IFS= read -r -d '' src; do
  rel="${src#$DOCS_DIR/}"
  name="$(page_name "$rel")"
  dest="$WORK_DIR/wiki/${name}.md"
  strip_frontmatter "$src" > "$dest"
  PAGE_MAP["$rel"]="$name"
done < <(find "$DOCS_DIR" -name "*.md" -print0 | sort -z)

# ── Generate Home.md ──────────────────────────────────────────────────────────
cat > "$WORK_DIR/wiki/Home.md" <<'HOMEOF'
# DepositGuard — Documentation

On-chain rental deposit escrow powered by Solana and Gemini AI.

> **Live app:** https://nestcrow.tech/
> **Docs site:** https://kevinle3212.github.io/DepositGuard/

---

## Navigation

| Section | Wiki page |
|---------|-----------|
| Setup Guide | [[Setup-Guide]] |
| **API Reference** | |
| → Overview | [[API-Reference]] |
| → verify-wallet | [[API-verify-wallet]] |
| → upload-contract | [[API-upload-contract]] |
| → send-signing-link | [[API-send-signing-link]] |
| → assess-damage | [[API-assess-damage]] |
| → tts | [[API-tts]] |
| → notify | [[API-notify]] |
| → webhook-deadline | [[API-webhook-deadline]] |
| Architecture | [[Architecture]] |
| **Smart Contracts** | |
| → Overview | [[Smart-Contracts]] |
| → PDAs | [[Smart-Contracts-PDAs]] |
| → Instructions | [[Smart-Contracts-Instructions]] |
| → State Machine | [[Smart-Contracts-State-Machine]] |
| **Tutorials** | |
| → Landlord Creates Lease | [[Tutorial-Landlord-Creates-Lease]] |
| → Tenant Funds Escrow | [[Tutorial-Tenant-Funds-Escrow]] |
| → Dispute Flow | [[Tutorial-Dispute-Flow]] |
| → Arbitration Panel | [[Tutorial-Arbitration-Panel]] |
| FAQ & Troubleshooting | [[FAQ]] |
| Glossary | [[Glossary]] |
| Roadmap | [[Roadmap]] |
| Changelog | [[Changelog]] |
HOMEOF

# ── Commit and push ───────────────────────────────────────────────────────────
git add -A
if git diff --cached --quiet; then
  echo "[sync-wiki] No changes to wiki."
  exit 0
fi

git commit -m "docs: sync from main"
git push "$WIKI_URL" HEAD:master 2>/dev/null \
  || git push "$WIKI_URL" HEAD:main
echo "[sync-wiki] Wiki updated."
