---
id: roadmap
title: Roadmap
---

# Roadmap

## Current: Devnet (v0.1)

The core escrow, dispute, arbitration, and panel flows are implemented and tested on Solana Devnet. The Next.js frontend, seven Cloud Run services, and Firebase backend are live.

Program ID: `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`

## Near-term

- **Third-party smart contract audit** — Commission an external security audit and resolve all findings before Mainnet deployment.
- **Upgrade authority decision** — Burn for immutability or multisig for emergency patches; document and implement the decision.
- **Load testing** — Run load tests on all Cloud Run services; tune Cloud Armor and autoscaling settings.
- **Full Playwright E2E suite** — Complete end-to-end tests for all four user paths (landlord, tenant, dispute, arbitration panel).

## Mainnet launch (v1.0)

- **Mainnet-Beta deployment** — Switch from Devnet to Mainnet-Beta; configure Helius RPC as the production endpoint with fallback to public mainnet RPC.
- **Legal review** — Cover money transmission licensing (MTL), USDC on Solana custody implications, ESIGN Act compliance for magic link signatures, state-specific deposit-return statutes, and arbitration rules per jurisdiction.
- **Next.js 15 migration** — `next` is pinned at 14.2.35. Several DoS/SSRF advisories are patched only in Next ≥ 15.5.16 with no 14.x backport.
- **Secret Manager final audit** — Confirm nothing sensitive is in source control or container image layers.

## Future

- **Tangem hardware wallet** — `@tangem/tangem-sdk-web` is not yet on npm; wire in when the package is published.
- **EVM wallet support** — Extend RainbowKit/wagmi integration beyond the current Solana-primary flow.
- **Multi-jurisdiction rule engine** — Per-state deposit-return statutes vary significantly; a rule engine would automate jurisdiction-specific defaults.
- **Arbitrator marketplace** — A decentralized registry of verified arbitrators with on-chain reputation scores.
- **Mobile app** — React Native wrapper for the core tenant and landlord flows.
