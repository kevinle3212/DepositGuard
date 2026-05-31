---
id: architecture
title: Architecture
---

# Architecture & Design Decisions

## System overview

DepositGuard replaces the traditional landlord-holds-deposit model with a trustless on-chain escrow. The core invariant: **no single party can unilaterally access the deposit**. All fund movements require either mutual agreement or a verified dispute resolution outcome.

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                       │
│  /connect  /dashboard  /lease/[id]/{setup,sign,         │
│           assessment,dispute,arbitration}                │
└────────────────────┬────────────────────────────────────┘
                     │  REST / Firebase SDK
        ┌────────────▼──────────────┐
        │   Cloud Run Services (7)  │
        │  verify-wallet            │
        │  upload-contract          │
        │  send-signing-link        │
        │  assess-damage            │
        │  tts  notify              │
        │  webhook-deadline         │
        └──┬────────────────────┬──┘
           │                    │
    ┌──────▼──────┐    ┌───────▼───────┐
    │  Firebase   │    │ Solana Devnet  │
    │  Auth       │    │ (Anchor program│
    │  Firestore  │    │  nest-crow)    │
    │  Storage    │    └───────────────┘
    └─────────────┘
           │
    ┌──────▼──────────────────────────────┐
    │     Google Cloud                    │
    │  Secret Manager  Cloud Scheduler    │
    │  Cloud Armor     Artifact Registry  │
    │  Cloud Build     Cloud DNS          │
    └────────────────────────────────────┘
```

## Key design decisions

### Wallet-first authentication

Every API call is gated by a Firebase custom JWT with a `walletPubkey` claim. This ensures that every Firestore write can be traced to a specific on-chain identity, not just an email address.

### Off-chain AI, on-chain enforcement

Gemini runs off-chain to avoid the cost and latency of on-chain ML inference. The AI output is **advisory only** — it carries an `"Estimate Only - Not Legally Binding"` label and is never used to move funds directly. All fund movements go through the Anchor program, which independently enforces `max_fine` and status transition rules.

### Commit-reveal for sealed estimates

During disputes, both parties submit estimates independently. Neither party can see the other's estimate until both are sealed (`submit_estimate` → `reveal_estimates`). This prevents anchoring bias and strategic last-minute adjustments.

### max_fine cap

`max_fine = (tenant_estimate + landlord_estimate) / 2`. No resolution path — solo arbitrator or three-panelist panel — can award more than `max_fine`. This is enforced in the Anchor program, not just in the UI.

### WORM storage

Lease contracts and photos use Firebase Storage with versioning and write-once object policies. Once uploaded, neither party can alter or delete evidence — only new versions can be added.

### Minority dissent protection

In a 2-1 panel ruling where the dissent exceeds 20% of the adopted fine, the minority ruling hash and panelist pubkey are permanently recorded on-chain and `minority_dissent_flag = true` is set in `ClaimRecord`. This creates an audit trail for escalation.

## Service boundaries

Each Cloud Run service is independently deployable, has its own `package.json` and `Dockerfile`, and authenticates inbound requests using Firebase Auth middleware (`services/verify-wallet/src/middleware/require-auth.ts`).

The Next.js app is deployed to Firebase App Hosting (with a Vercel mirror). It calls Cloud Run services directly; there is no API gateway layer — Cloud Armor on the load balancer provides rate limiting and WAF protection.

## Secrets management

All secrets (relayer keypair, API keys, service account JSON) live in Google Cloud Secret Manager. Nothing sensitive is in environment files checked into source control. The `.env.example` file shows the variable names with placeholder values only.
