---
id: pdas
title: PDAs
---

# Program-Derived Accounts (PDAs)

All accounts use the program ID `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a` as part of the derivation. Seeds shown as `[seed, ...]`.

---

## `EscrowState`

Seeds: `["escrow", lease_id_bytes]`

The primary account representing a single security deposit escrow.

| Field               | Type           | Description                               |
| ------------------- | -------------- | ----------------------------------------- |
| `lease_id`          | `[u8; 32]`     | Unique lease identifier                   |
| `landlord`          | `Pubkey`       | Landlord wallet address                   |
| `tenant`            | `Pubkey`       | Tenant wallet address                     |
| `token_mint`        | `Pubkey`       | SPL token mint (USDC)                     |
| `deposit_amount`    | `u64`          | Deposit in token base units (6 decimals)  |
| `status`            | `EscrowStatus` | Current lifecycle state                   |
| `deadline_ts`       | `i64`          | Unix timestamp — release deadline         |
| `jurisdiction_code` | `[u8; 4]`      | State/jurisdiction code (e.g., `b"OR00"`) |

---

## `LeaseConfig`

Seeds: `["lease-config", lease_id_bytes]`

Signing state and contract hash for the lease.

| Field                   | Type       | Description                             |
| ----------------------- | ---------- | --------------------------------------- |
| `landlord`              | `Pubkey`   | Must match `EscrowState.landlord`       |
| `tenant`                | `Pubkey`   | Must match `EscrowState.tenant`         |
| `token_mint`            | `Pubkey`   | Must match `EscrowState.token_mint`     |
| `deposit_amount`        | `u64`      | Must match `EscrowState.deposit_amount` |
| `dispute_threshold_pct` | `u8`       | Auto-flag threshold (default 15)        |
| `contract_hash`         | `[u8; 32]` | SHA-256 of lease PDF                    |
| `landlord_signed`       | `bool`     | Landlord has signed the contract        |
| `tenant_signed`         | `bool`     | Tenant has signed the contract          |

---

## `ClaimRecord`

Seeds: `["claim-record", lease_id_bytes]`

Damage assessment and dispute data.

| Field                         | Type       | Description                                       |
| ----------------------------- | ---------- | ------------------------------------------------- |
| `landlord_photo_hash`         | `[u8; 32]` | SHA-256 of landlord's photo set                   |
| `tenant_photo_hash`           | `[u8; 32]` | SHA-256 of tenant's photo set                     |
| `disputed_total`              | `u64`      | Disputed amount in token base units               |
| `undisputed_total`            | `u64`      | Undisputed amount released immediately on dispute |
| `tenant_estimate`             | `u64`      | Tenant's sealed damage estimate                   |
| `landlord_estimate`           | `u64`      | Landlord's sealed damage estimate                 |
| `tenant_estimate_sealed_ts`   | `i64`      | Unix timestamp when tenant estimate was sealed    |
| `landlord_estimate_sealed_ts` | `i64`      | Unix timestamp when landlord estimate was sealed  |
| `max_fine`                    | `u64`      | `(tenant_estimate + landlord_estimate) / 2`       |
| `minority_dissent_flag`       | `bool`     | True when panel dissent > 20%                     |

---

## `ArbitrationEscrow`

Seeds: `["arb-escrow", lease_id_bytes]`

Fee pool for the arbitration track.

| Field                 | Type                      | Description                              |
| --------------------- | ------------------------- | ---------------------------------------- |
| `lease_id`            | `[u8; 32]`                | Lease identifier                         |
| `landlord_paid`       | `bool`                    | Landlord paid $50 fee                    |
| `tenant_paid`         | `bool`                    | Tenant paid $50 fee                      |
| `landlord_fee_amount` | `u64`                     | `50_000_000` ($50 USDC)                  |
| `tenant_fee_amount`   | `u64`                     | `50_000_000` ($50 USDC)                  |
| `landlord_panel_paid` | `bool`                    | Landlord paid $25 panel upgrade          |
| `tenant_panel_paid`   | `bool`                    | Tenant paid $25 panel upgrade            |
| `panel_upgrade_paid`  | `bool`                    | Both paid — panel track active           |
| `total`               | `u64`                     | Total collected                          |
| `status`              | `ArbitrationEscrowStatus` | `Pending / Active / Consumed / Refunded` |
| `arbitrator_pubkey`   | `Pubkey`                  | Assigned solo arbitrator                 |
| `payment_deadline_ts` | `i64`                     | 72-hour payment deadline                 |

---

## `ArbitrationPanel`

Seeds: `["arb-panel", lease_id_bytes]`

Three-panelist ruling record.

| Field                    | Type           | Description                               |
| ------------------------ | -------------- | ----------------------------------------- |
| `lease_id`               | `[u8; 32]`     | Lease identifier                          |
| `panelists`              | `[Pubkey; 3]`  | Assigned panelist addresses               |
| `rulings`                | `[Ruling; 3]`  | Each panelist's sealed ruling             |
| `outcome`                | `PanelOutcome` | `Pending / Unanimous / Majority / Median` |
| `adopted_fine`           | `u64`          | Final adopted fine amount                 |
| `adopted_recipient`      | `Pubkey`       | Fine recipient (landlord or platform)     |
| `minority_dissent_flag`  | `bool`         | Dissent exceeded 20%                      |
| `escalation_deadline_ts` | `i64`          | `now + 14 days` after resolution          |
| `resolved`               | `bool`         | Panel resolution complete                 |

### `Ruling` struct

| Field             | Type       | Description                  |
| ----------------- | ---------- | ---------------------------- |
| `panelist_pubkey` | `Pubkey`   | Panelist address             |
| `fine_amount`     | `u64`      | Proposed fine                |
| `recipient`       | `Pubkey`   | Proposed recipient           |
| `ruling_hash`     | `[u8; 32]` | SHA-256 of written reasoning |
| `submitted_ts`    | `i64`      | Submission timestamp         |
