---
id: instructions
title: Instructions
---

# Instructions

All instructions are part of the `nest-crow` Anchor program. Accounts use PDA seeds described in [PDAs](./pdas).

---

## Core escrow

### `initialize_escrow`

Creates `EscrowState` and `LeaseConfig` PDAs. Sets `status = CREATED`.

**Signers:** landlord  
**Accounts:** `EscrowState` (init), `LeaseConfig` (init), system program

---

### `fund_escrow`

Tenant transfers USDC into the PDA-owned token account. Sets `status = FUNDED`.

**Precondition:** `LeaseConfig.landlord_signed && tenant_signed == true`  
**Signers:** tenant  
**Accounts:** `EscrowState`, `LeaseConfig`, tenant token account, escrow token account, SPL token program

---

### `record_contract_hash`

Stores the SHA-256 hash of the lease PDF in `LeaseConfig`.

**Signers:** relayer (on behalf of uploader)  
**Accounts:** `LeaseConfig`

---

### `record_photo_hash`

Stores the SHA-256 hash of a party's photo set in `ClaimRecord`. Both parties must upload before the lease advances to `ACTIVE`.

**Signers:** landlord or tenant (role-checked)  
**Accounts:** `EscrowState`, `ClaimRecord`

---

### `propose_release`

Landlord proposes a deduction split. Sets `status = PENDING_APPROVAL`.

**Signers:** landlord  
**Accounts:** `EscrowState`, `ClaimRecord`

---

### `approve_release`

Tenant approves the proposed split. Releases the undisputed portion to the tenant immediately. Sets `status = RELEASED`.

**Signers:** tenant  
**Accounts:** `EscrowState`, `ClaimRecord`, escrow token account, tenant token account, SPL token program

---

### `claim_timeout`

Relayer calls after `deadline_ts` passes. Releases the full remaining balance to the tenant. On-chain check: `Clock::unix_timestamp > deadline_ts`.

**Signers:** relayer  
**Accounts:** `EscrowState`, escrow token account, tenant token account, SPL token program, clock

---

### `close_escrow`

Closes PDA accounts and reclaims rent after all funds have been disbursed.

**Signers:** landlord or relayer  
**Accounts:** `EscrowState`, `LeaseConfig`, `ClaimRecord`

---

## Dispute

### `open_dispute`

Sets `status = DISPUTED`. Releases the undisputed portion to the tenant immediately. Locks the disputed remainder in the PDA.

**Signers:** tenant  
**Accounts:** `EscrowState`, `ClaimRecord`, escrow token account, tenant token account

---

### `submit_estimate`

Each party independently submits a damage estimate. Sealed in `ClaimRecord`. Revisions are blocked after submission.

**Signers:** landlord or tenant  
**Accounts:** `EscrowState`, `ClaimRecord`

---

### `reveal_estimates`

Called after both estimates are sealed. Sets `max_fine = (tenant_estimate + landlord_estimate) / 2` in `ClaimRecord`.

**Signers:** either party or relayer  
**Accounts:** `EscrowState`, `ClaimRecord`

---

### `resolve_dispute`

Solo arbitrator resolution. Validates `fine_amount <= max_fine`. Transfers USDC from escrow to recipient. Sets `status = RESOLVED`.

**Signers:** assigned arbitrator  
**Accounts:** `EscrowState`, `ClaimRecord`, `ArbitrationEscrow`, escrow token account, recipient token account

---

## Arbitration fees

### `open_arbitration`

Initializes the `ArbitrationEscrow` PDA. Sets the 72-hour payment deadline.

**Signers:** either party  
**Accounts:** `EscrowState`, `ArbitrationEscrow` (init)

---

### `pay_arbitration_fee`

Transfers $50 USDC from a party's wallet into the `ArbitrationEscrow` PDA. Sets `landlord_paid` or `tenant_paid`.

**Signers:** landlord or tenant  
**Accounts:** `ArbitrationEscrow`, party token account, escrow token account

---

### `pay_panel_upgrade_fee`

Transfers $25 USDC from a party's wallet. Both parties must pay to activate `panel_upgrade_paid`.

**Signers:** landlord or tenant  
**Accounts:** `ArbitrationEscrow`, party token account, escrow token account

---

### `refund_arbitration_fees`

Callable by relayer when the dispute resolves before the arbitrator is assigned. Returns each party's actual payment.

**Signers:** relayer  
**Accounts:** `ArbitrationEscrow`, landlord token account, tenant token account

---

### `consume_arbitration_fees`

Transfers the full fee pool to the arbitrator or platform address. Callable only by the assigned `arbitrator_pubkey`.

**Signers:** arbitrator  
**Accounts:** `ArbitrationEscrow`, arbitrator token account

---

## Arbitration panel

### `open_panel`

Initializes the `ArbitrationPanel` PDA and assigns three panelists.

**Signers:** relayer  
**Accounts:** `ArbitrationEscrow`, `ArbitrationPanel` (init)

---

### `submit_panel_ruling`

Each panelist submits a sealed ruling (fine amount + recipient + SHA-256 hash of written reasoning).

**Signers:** panelist  
**Accounts:** `ArbitrationPanel`

---

### `resolve_dispute_panel`

Validates all three rulings; applies Case A (unanimous), Case B (2-1 majority with 20% dissent check), or Case C (three-way median). Validates `adopted_fine <= max_fine`. Executes USDC transfer. Sets `escalation_deadline_ts = now + 14 days`.

**Signers:** relayer  
**Accounts:** `EscrowState`, `ClaimRecord`, `ArbitrationPanel`, `ArbitrationEscrow`, escrow token account, recipient token account

---

## Oracle

### `post_oracle_fine`

Relays the Gemini-computed fine on-chain. Re-checked against `max_fine` before any resolution path uses it.

**Signers:** oracle relayer  
**Accounts:** `ClaimRecord`
