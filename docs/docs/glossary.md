---
id: glossary
title: Glossary
---

# Glossary

**Anchor** — A framework for writing Solana programs in Rust. Provides account validation macros, IDL generation, and a TypeScript client.

**ArbitrationEscrow** — The PDA account that holds the $50 per party arbitration fee during the arbitration track.

**ArbitrationPanel** — The PDA account that records three panelists' sealed rulings and the final adopted outcome.

**ClaimRecord** — The PDA account that stores damage evidence: photo hashes, sealed estimates, `max_fine`, and minority dissent flag.

**Commit-reveal** — A two-phase pattern where parties commit to a value (sealed estimate) before it is revealed, preventing strategic last-minute adjustments.

**CPI (Cross-Program Invocation)** — A Solana mechanism for one program to call another. Used internally within the `nest-crow` program for token transfers via the SPL Token program.

**Devnet** — Solana's development network. Tokens have no real value. Used for testing before Mainnet deployment.

**EscrowState** — The primary PDA account tracking the lifecycle status of a single security deposit escrow.

**Firebase Auth custom JWT** — A Firebase Authentication token minted by `verify-wallet` with the user's `walletPubkey` embedded as a custom claim. Required for all API calls.

**Gemini** — Google's multimodal AI model family. DepositGuard uses `gemini-2.0-flash` for visual damage assessment.

**Jurisdiction code** — A 4-byte code (e.g., `OR00` for Oregon) stored in `EscrowState` and used for legal compliance checks.

**LeaseConfig** — The PDA account storing signing state (`landlord_signed`, `tenant_signed`) and the lease contract hash.

**Magic link** — A signed JWT emailed to a party for one-click contract signing. Expires in 48 hours and is invalidated after use.

**max_fine** — The maximum fine any resolution path can award, computed as `(tenant_estimate + landlord_estimate) / 2` and enforced on-chain.

**Minority dissent flag** — Set on-chain when a panel ruling dissent exceeds 20% of the adopted fine. Creates an audit trail for court escalation.

**Nonce** — A one-time server-generated random value used in wallet signature verification to prevent replay attacks.

**PDA (Program-Derived Address)** — A Solana account address derived deterministically from seeds and a program ID. Not controlled by a private key — only the program can sign for it.

**Relayer** — A trusted server-side keypair that submits on-chain transactions on behalf of users for actions that require a server secret (e.g., `claim_timeout`, `record_contract_hash`).

**Sealed estimate** — A damage estimate submitted by one party that cannot be seen by the other until both have submitted. Enforced in the Anchor program via `submit_estimate`.

**SPL Token** — Solana Program Library token standard. USDC on Solana is an SPL token.

**USDC** — USD Coin, a stablecoin pegged to the US dollar. Used for all deposit amounts in DepositGuard (6 decimal places on Solana).

**WORM (Write Once, Read Many)** — A Firebase Cloud Storage policy that prevents overwriting uploaded objects, ensuring evidence integrity.

**Zustand** — A lightweight React state management library used for wallet connection state and lease status in the Next.js frontend.
