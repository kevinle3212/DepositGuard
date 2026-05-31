# Scripts

Utility scripts for development, testing, and deployment. Run all commands from the **repo root** unless noted otherwise.

---

## `pre-render-tts.ts`

Pre-renders all static (variable-free) voice scripts to `.mp3` and uploads them to Firebase Cloud Storage at `tts-cache/{voiceRole}/{scriptKey}.mp3`. Run after creating or updating voice scripts, or as part of the deploy pipeline.

```bash
yarn tsx scripts/pre-render-tts.ts
```

**Required env vars:** `ELEVENLABS_API_KEY`, `FIREBASE_STORAGE_BUCKET`, and optionally `ELEVENLABS_VOICE_ID_PLATFORM_GUIDE` / `ELEVENLABS_VOICE_ID_DISPUTE_ADVISOR`.

---

## `reset-leases.mjs`

Deletes all documents in the `leases` and `signingTokens` Firestore collections. **Dev / staging only** — never run against production.

```bash
node scripts/reset-leases.mjs
```

**Prerequisites:** Firebase CLI logged in and project set to the target project ID.

---

## `test-gemini-summary.mjs`

Standalone smoke test for the Gemini lease-summary path. Mirrors `app/api/leases/[id]/summarize/route.ts` — same model, same prompt, same JSON-extraction logic. Useful for verifying the Gemini API key and model are working without starting the full server.

```bash
node --env-file=.env scripts/test-gemini-summary.mjs
```

**Required env vars:** `GOOGLE_API_KEY` (Gemini API key).

---

## `setup-dev.sh`

One-shot local development environment bootstrap. Installs all dependencies, copies `.env.example` to `.env`, and verifies required tooling (Node.js, Yarn, Rust, Solana CLI, Anchor CLI).

```bash
bash scripts/setup-dev.sh
```

**Idempotent** — safe to re-run. Does not overwrite an existing `.env`.

---

## `sync-wiki.sh`

Strips YAML frontmatter from every file in `docs/docs/`, converts subdirectory paths to wiki-compatible flat page names, and pushes the result to the GitHub Wiki repo along with a generated `Home.md` navigation table. Called automatically by the `docs` GitHub Actions workflow on push to `main`.

```bash
GITHUB_TOKEN=<personal-access-token-with-repo-scope> bash scripts/sync-wiki.sh
```

---

## `deploy.sh`

Builds Docker images for each Cloud Run service and deploys them to Google Cloud Run in the target environment (`staging` or `production`).

```bash
bash scripts/deploy.sh [staging|production]
```

**Required:** `gcloud` CLI authenticated, `GOOGLE_CLOUD_PROJECT` set in the environment or via `gcloud config set project <PROJECT_ID>`.
