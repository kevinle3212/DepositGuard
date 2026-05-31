---
id: setup
title: Setup & Development Guide
sidebar_position: 1
---

# Setup & Development Guide

This guide walks you through running DepositGuard locally from scratch.

## Prerequisites

| Tool           | Required version | Install                                                                             |
| -------------- | ---------------- | ----------------------------------------------------------------------------------- |
| Node.js        | ≥ 20             | [nodejs.org](https://nodejs.org)                                                    |
| Yarn           | ≥ 4              | `corepack enable`                                                                   |
| Rust           | stable           | [rustup.rs](https://rustup.rs)                                                      |
| Solana CLI     | ≥ 1.18           | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`                   |
| Anchor CLI     | ≥ 0.31           | `cargo install --git https://github.com/coral-xyz/anchor avm && avm install latest` |
| Docker Desktop | any recent       | [docker.com](https://www.docker.com/products/docker-desktop/)                       |

## Quick start

```bash
# 1. Clone the repo
git clone https://github.com/depositguard/depositguard.git
cd depositguard

# 2. Run the bootstrap script (installs deps, copies .env.example → .env, builds Anchor)
bash scripts/setup-dev.sh

# 3. Fill in required values in .env
#    See .env.example for all keys and inline instructions.

# 4. Start the Next.js frontend
yarn dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                        | Description                                              |
| ------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SOLANA_RPC_URL`    | Solana RPC endpoint (defaults to Devnet)                 |
| `NEXT_PUBLIC_PROGRAM_ID`        | Deployed Anchor program ID                               |
| `FIREBASE_PROJECT_ID`           | Firebase project ID                                      |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON (base64-encoded for local dev)      |
| `JWT_SECRET`                    | Secret for signing Firebase custom tokens                |
| `GEMINI_API_KEY`                | Google Gemini API key                                    |
| `ELEVENLABS_API_KEY`            | ElevenLabs API key (optional — TTS returns 204 if unset) |
| `SENDGRID_API_KEY`              | SendGrid API key for transactional email                 |
| `RELAYER_KEYPAIR`               | Base58 Solana keypair for on-chain relayer transactions  |

See `.env.example` for the full list including optional variables.

## Running Cloud Run services locally

Use Docker Compose to spin up all seven backend services:

```bash
docker compose -f docker/docker-compose.yml --env-file .env up --build
```

Each service maps to a local port — see `docker/README.md` for the port map.

## Running tests

```bash
# Anchor program tests (Solana)
yarn test-anchor

# Next.js / library unit tests
yarn test

# Watch mode
yarn test:watch
```

## Linting and formatting

```bash
yarn lint:all      # ESLint + Prettier check
yarn lint:fix      # Auto-fix
yarn typecheck     # TypeScript
yarn lint:rust     # Clippy
```

## Building for production

```bash
yarn build          # Next.js production build
bash scripts/deploy.sh staging     # Deploy all Cloud Run services to staging
bash scripts/deploy.sh production  # Deploy to production
```

## Anchor program (Solana)

```bash
anchor build        # Compile the Rust program
anchor test         # Run on-chain tests against a local validator
anchor deploy       # Deploy to Devnet (requires ANCHOR_WALLET set)
```

Program ID (Devnet): `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`
