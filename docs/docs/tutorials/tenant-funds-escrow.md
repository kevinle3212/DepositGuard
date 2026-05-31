---
id: tenant-funds-escrow
title: "Tutorial: Tenant Funds Escrow"
---

# Tutorial: Tenant Funds Escrow

This walkthrough covers the tenant side of the lease from signing through deposit funding.

## Prerequisites

- A signing link email from your landlord.
- Phantom or Solflare wallet with USDC on Devnet equal to the deposit amount.

## Step 1 — Open the signing link

Click the magic link in your email. It opens `/lease/[id]/sign`.

- If your wallet is not connected, you will be redirected to `/connect` first.
- The link expires after 48 hours. Request a new one from your landlord if expired.

## Step 2 — Review and sign the contract

1. The lease PDF renders inline — read it carefully.
2. Click **Sign and Confirm**.
3. Your wallet prompts you to sign the message: `"I agree to lease [leaseId] contract hash [sha256]. Timestamp: [unix_ts]"`.
4. Sign the message. Do **not** approve a transaction — this is a message signature only (no SOL spent).

Your signature and wallet address are recorded in Firestore and on-chain. The signing link is immediately invalidated.

## Step 3 — Fund the escrow

Once both parties have signed, the **Fund Escrow** button becomes active on the lease page.

1. Verify the deposit amount and USDC balance shown on screen.
2. Click **Fund Escrow**.
3. Approve the USDC transfer transaction in your wallet (this does spend USDC).

The `fund_escrow` instruction transfers your USDC into the PDA-owned token account. The lease status moves to `FUNDED`.

:::info
If the **Fund Escrow** button is greyed out, it means the landlord has not yet signed the contract. Both signatures are required before funding is allowed — this is enforced on-chain.
:::

## Step 4 — Upload move-in photos

After funding, the lease enters `PENDING_DOCUMENTATION`. Both parties must upload their move-in photo sets.

1. Go to the lease page and click **Upload Move-In Photos**.
2. Upload photos via the drag-and-drop panel. Photos are stored in Firebase Cloud Storage.
3. Click **Confirm Upload**.

Once both parties upload, the lease becomes `ACTIVE` and your security deposit is protected in escrow.

## What happens to your deposit?

- Your USDC sits in the PDA token account — neither you nor the landlord can access it unilaterally.
- At move-out, Gemini AI compares your move-in and move-out photos and produces an advisory estimate.
- The landlord proposes a deduction. You can agree (funds released immediately) or dispute.
- If no agreement is reached before the deadline, the full deposit is automatically returned to you.
