# Nestcrow

**Live app: [nestcrow.tech](https://nestcrow.tech/)**

**Trustless rental security deposit escrow on Solana, with AI-assisted damage assessment.**

DepositGuard replaces the traditional landlord-holds-deposit model with a smart-contract escrow that neither the landlord, the tenant, nor the developers can override unilaterally. At move-out, Google Gemini compares move-in and move-out photos and produces an itemized damage estimate — strictly advisory — to inform negotiation. If the parties cannot agree, a structured dispute and arbitration system resolves the outcome on-chain.

Built at [QuackHacks 2025](https://quackhacks.com) by team Quack Quack.

---

## The Problem

Security deposits are one of the most friction-filled parts of renting. A landlord holds the money in a personal account, decides unilaterally what to deduct at move-out, and the tenant's only recourse is to argue or take the matter to small claims court. There is no neutral record of the property's condition, no transparent process, and no guarantee of return — even when the law requires it.

## The Solution

DepositGuard locks the deposit in a Solana program-derived account the moment the lease is signed. Neither party can withdraw funds without the other's agreement, a verified dispute resolution outcome, or the automatic timeout enforced on-chain. Every step — contract signing, photo uploads, damage estimates, and fund movements — is recorded immutably.

## How It Works

1. **Lease setup.** The landlord initializes the escrow on-chain, uploads the lease PDF (SHA-256 hash committed to Solana), and sends a magic-link signing email to the tenant.
2. **Both parties sign.** Each party signs the lease in-browser with their Solana wallet. `fund_escrow` is blocked until both signatures are recorded on-chain.
3. **Tenant funds the escrow.** The tenant transfers USDC into the PDA-owned token account. The funds are now under contract control.
4. **Move-in photos.** Both parties upload photo sets. The SHA-256 hash of each set is committed on-chain. The lease activates only after both uploads.
5. **Move-out assessment.** At move-out, both parties upload move-out photos. Gemini 2.0 Flash compares the two sets and produces an itemized estimate with severity ratings. The estimate is labeled **"Estimate Only — Not Legally Binding"** and is never used to move funds directly.
6. **Agree or dispute.** The landlord proposes a deduction. The tenant can agree (funds released immediately) or open a dispute. If disputed, both parties submit sealed damage estimates independently — neither sees the other's figure until both are submitted. The maximum fine any resolution can award is the average of both estimates (`max_fine`), enforced in the Anchor program.
7. **Escalation tiers.** Direct negotiation → $50/party arbitration → optional $25/party three-panelist panel. Minority dissent exceeding 20% is recorded permanently on-chain. If no resolution is reached before the deadline, the full balance is returned to the tenant automatically.

## Key Design Decisions

- **Off-chain AI, on-chain enforcement.** Gemini runs off-chain; all fund movements go through the Anchor program, which independently enforces `max_fine`, state transitions, and deadlines.
- **Commit-reveal for sealed estimates.** Neither party can see the other's figure before committing, preventing anchoring bias.
- **WORM storage.** Lease contracts and photos are write-once in Firebase Cloud Storage — neither party can alter or delete evidence after upload.
- **Wallet-first authentication.** Every API call requires a Firebase custom JWT with a `walletPubkey` claim verified by Ed25519 signature.

## Tech Stack

| Layer          | Technology                                                                      |
| -------------- | ------------------------------------------------------------------------------- |
| Smart contract | Rust · Anchor 0.31 · Solana Devnet                                              |
| Token          | USDC (SPL, 6 decimals)                                                          |
| Frontend       | Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui                              |
| Wallet         | `@solana/wallet-adapter` (Phantom, Solflare) · RainbowKit (EVM)                 |
| Backend        | 7 × Google Cloud Run services (TypeScript, Node.js 20)                          |
| AI             | Gemini 2.0 Flash via Vertex AI                                                  |
| Voice          | ElevenLabs (`eleven_multilingual_v2`)                                           |
| Database       | Firebase Firestore                                                              |
| Storage        | Firebase Cloud Storage (WORM object policies)                                   |
| Auth           | Firebase Authentication (custom JWT + Ed25519 wallet verification)              |
| Email          | SendGrid transactional email                                                    |
| Infrastructure | Terraform · Google Cloud Build · Cloud Armor · Cloud Scheduler · Secret Manager |
| Docs           | Docusaurus 3 → GitHub Pages + GitHub Wiki                                       |

## Repository Structure

```
programs/          Anchor smart contract (nest-crow)
app/               Next.js App Router pages and components
services/          7 Cloud Run microservices
  assess-damage/   Gemini AI damage assessment
  verify-wallet/   Wallet signature verification → Firebase JWT
  upload-contract/ PDF/DOCX upload and on-chain hash recording
  send-signing-link/ Magic-link contract signing emails
  tts/             ElevenLabs text-to-speech
  notify/          SendGrid transactional email
  webhook-deadline/ Cron-triggered claim_timeout enforcement
lib/               Shared utilities and Firebase Admin helpers
hooks/             React hooks (wallet state, deposits, voice)
components/        Shared UI components
types/             TypeScript type definitions
tests/             Anchor integration tests
infra/             Terraform HCL for all GCP resources
scripts/           Setup, deploy, TTS pre-render, wiki sync utilities
docker/            Docker Compose for local Cloud Run development
docs/              Docusaurus documentation site
```

## Getting Started

```bash
git clone https://github.com/kevinle3212/DepositGuard.git
cd DepositGuard
bash scripts/setup-dev.sh   # installs deps, copies .env.example → .env, builds Anchor
```

Fill in the required values in `.env`, then:

```bash
yarn dev                                              # Next.js frontend on localhost:3000
docker compose -f docker/docker-compose.yml up        # Cloud Run services on ports 8081–8087
```

The app is live at [nestcrow.tech](https://nestcrow.tech/). For the full setup guide, API reference, smart contract reference, and tutorials see the [documentation site](https://kevinle3212.github.io/DepositGuard/) or the `docs/` directory.

## Documentation

- **Live app:** [nestcrow.tech](https://nestcrow.tech/)
- **Docs site:** [kevinle3212.github.io/DepositGuard](https://kevinle3212.github.io/DepositGuard/)
- **GitHub Wiki:** [github.com/kevinle3212/DepositGuard/wiki](https://github.com/kevinle3212/DepositGuard/wiki)
- Setup guide, API reference, architecture overview, smart contract reference, tutorials, FAQ, glossary, roadmap, and changelog are all in `docs/`.

## Program

**Devnet program ID:** `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`

## Status

Working prototype on Solana Devnet with test USDC. Production deployment requires mainnet USDC integration, a third-party smart contract security audit, legal review (money transmission licensing, ESIGN Act compliance, state deposit-return statutes), and a Next.js 15 migration. All of this is tracked in the roadmap.

## License

Apache 2.0. See [LICENSE](./LICENSE).

## Team

Quack Quack — Kevin Le, Matthew Stone, Blake Staats, and Miles Miller (here in spirit).
