---
id: changelog
title: Changelog
---

# Changelog

All notable changes to DepositGuard are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Planned

- Mainnet-Beta deployment.
- Next.js 15 migration.
- Full Playwright E2E test suite.
- Third-party smart contract security audit.

---

## [0.1.0] — 2026-05-31

Initial Devnet release. All core features implemented and deployed.

### Added

**Solana program (`nest-crow`)**

- `EscrowState`, `LeaseConfig`, `ClaimRecord`, `ArbitrationEscrow`, `ArbitrationPanel` PDA account structs.
- Full instruction set: `initialize_escrow`, `fund_escrow`, `record_contract_hash`, `record_photo_hash`, `propose_release`, `approve_release`, `claim_timeout`, `close_escrow`.
- Dispute instructions: `open_dispute`, `submit_estimate`, `reveal_estimates`, `resolve_dispute`.
- Arbitration fee instructions: `open_arbitration`, `pay_arbitration_fee`, `pay_panel_upgrade_fee`, `refund_arbitration_fees`, `consume_arbitration_fees`.
- Panel instructions: `open_panel`, `submit_panel_ruling`, `resolve_dispute_panel`.
- `post_oracle_fine` for Gemini fine relay.
- Full `EscrowStatus` state machine with on-chain transition enforcement.
- Anchor unit tests for all instructions and state transitions.
- Deployed to Devnet: `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`.

**Backend (Cloud Run services)**

- `verify-wallet`: Ed25519 signature verification → Firebase custom JWT.
- `upload-contract`: PDF/DOCX upload, SHA-256 hash, Firebase Storage, on-chain `record_contract_hash`.
- `send-signing-link`: Magic-link JWT email for contract signing.
- `assess-damage`: Gemini 2.0 Flash multimodal damage assessment with Zod schema validation.
- `tts`: ElevenLabs voice script rendering with Firebase Storage cache.
- `notify`: Transactional email (SendGrid) for all lifecycle events.
- `webhook-deadline`: Cloud Scheduler cron job for `claim_timeout` enforcement.

**Frontend (Next.js 14.2)**

- `/connect` — Unified wallet modal (Phantom, Solflare, EVM via RainbowKit).
- `/dashboard` — Role-aware lease list.
- `/lease/[id]/setup` — Lease creation and contract upload.
- `/lease/[id]/sign` — Magic-link contract signing with PDF preview.
- `/lease/[id]/assessment` — Gemini damage estimate with DamageCapturePanel.
- `/lease/[id]/dispute` — Sealed estimate submission, negotiation tiers, arbitration fee payment.
- `/lease/[id]/arbitration` — Panel composition, sealed rulings, outcome display.

**Infrastructure**

- Terraform HCL for all GCP resources (Cloud Run, Load Balancer, DNS, Armor, Scheduler, Secret Manager, Artifact Registry, Cloud Build).
- Google Cloud Build CI/CD pipeline triggered on `main` push.
- Firestore security rules with wallet-verified write enforcement and write-once policies.
- Firebase Cloud Storage WORM object policies.

**Tooling**

- ESLint flat config, Prettier, TypeScript strict mode.
- Clippy config for Rust.
- Husky Git hooks + commitlint (Conventional Commits).
- GitHub Actions CI (Anchor tests, TypeScript lint, Playwright E2E stub).
- Dependabot for npm and Cargo.
- CodeRabbit and CodeQL on all PRs.
- Docusaurus documentation site (`docs/`).
