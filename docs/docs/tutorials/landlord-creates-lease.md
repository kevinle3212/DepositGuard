---
id: landlord-creates-lease
title: "Tutorial: Landlord Creates a Lease"
---

# Tutorial: Landlord Creates a Lease

This walkthrough covers the landlord side of the lease setup flow from start to move-in.

## Prerequisites

- Phantom or Solflare wallet with a small amount of SOL (for rent) and USDC on Devnet.
- The lease PDF prepared and ready to upload.
- Tenant's email address.

## Step 1 — Connect your wallet

1. Navigate to `/connect`.
2. Select your wallet (Phantom, Solflare, or hardware wallet).
3. Sign the nonce message when prompted — this verifies your wallet and mints a session JWT.

You will be redirected to `/dashboard` on success.

## Step 2 — Create a new lease

1. Click **New Lease** on the dashboard.
2. Fill in the lease form at `/lease/[id]/setup`:
    - **Deposit amount** — in USDC (e.g., `1500`)
    - **Jurisdiction** — select the US state (used for legal compliance)
    - **Tenant email** — used to send the signing link
3. Click **Initialize Escrow**.

This calls `initialize_escrow` on-chain and creates the `EscrowState` and `LeaseConfig` PDAs. Your dashboard now shows the new lease in `CREATED` status.

## Step 3 — Upload the lease contract

1. Open the lease and click **Upload Contract**.
2. Drag your PDF (or DOCX) onto the upload zone.
3. Click **Upload**.

The server computes the SHA-256 hash, stores the file in Firebase Cloud Storage, and calls `record_contract_hash` on-chain. The contract hash is displayed for your records.

## Step 4 — Send the signing link

1. Click **Send Signing Link to Tenant**.
2. The tenant receives an email with a magic link (valid for 48 hours).

You will also sign the contract in this step — click **Sign and Confirm** to record your signature on-chain.

## Step 5 — Tenant signs (wait)

The lease moves to `PENDING_SIGNATURE` status on your dashboard. Once the tenant signs, both `landlord_signed` and `tenant_signed` become `true` in the `LeaseConfig` PDA, and the tenant can now fund the escrow.

## Step 6 — Move-in photo upload

After the tenant funds the escrow, the lease enters `PENDING_DOCUMENTATION`. Both parties must upload their move-in photo sets.

1. Go to the lease page and click **Upload Move-In Photos**.
2. Upload photos via the drag-and-drop panel.
3. Click **Confirm Upload**.

The SHA-256 hash of the photo set is committed on-chain via `record_photo_hash`. Once both parties upload, the lease becomes `ACTIVE`.

## Next steps

- The lease is now active. Monitor the dashboard for move-out photo requests.
- See [Tenant Funds Escrow](./tenant-funds-escrow) for the tenant's perspective.
- See [Dispute Flow](./dispute-flow) if a dispute arises at move-out.
