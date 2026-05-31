---
id: state-machine
title: State Machine
---

# EscrowState Status Machine

The `EscrowState.status` field advances through a defined set of states. Invalid transitions are rejected by the Anchor program.

## State diagram

```
                     initialize_escrow
                           │
                           ▼
                        CREATED
                           │
                    fund_escrow (both signed)
                           │
                           ▼
                        FUNDED
                           │
                   record_photo_hash (both parties)
                           │
                           ▼
               PENDING_DOCUMENTATION
                           │
              both photo hashes recorded
                           │
                           ▼
                        ACTIVE
                           │
              move-out photos recorded
                           │
                           ▼
                PENDING_APPROVAL ◀──── propose_release
                        │   │
              tenant agrees  tenant disputes
                   │              │
                   ▼              ▼
               RELEASED       DISPUTED
                                  │
                       resolve_dispute / resolve_dispute_panel
                                  │
                                  ▼
                              RESOLVED
```

## States

| Status                  | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `CREATED`               | Escrow accounts initialized; no funds yet             |
| `FUNDED`                | Tenant has transferred deposit into PDA token account |
| `PENDING_DOCUMENTATION` | Both parties must upload move-in photos               |
| `ACTIVE`                | Lease in progress; move-out photos not yet uploaded   |
| `PENDING_APPROVAL`      | Landlord has proposed a deduction split               |
| `RELEASED`              | Tenant approved; deposit disbursed                    |
| `DISPUTED`              | Tenant opened dispute; undisputed portion released    |
| `RESOLVED`              | Dispute settled by arbitrator or panel                |

## Transition rules (enforced on-chain)

| From                    | To                      | Instruction                     | Additional check                                        |
| ----------------------- | ----------------------- | ------------------------------- | ------------------------------------------------------- |
| `CREATED`               | `FUNDED`                | `fund_escrow`                   | `landlord_signed && tenant_signed`                      |
| `FUNDED`                | `PENDING_DOCUMENTATION` | `record_photo_hash` (first)     | Either party uploads                                    |
| `PENDING_DOCUMENTATION` | `ACTIVE`                | `record_photo_hash` (both done) | Both hashes recorded                                    |
| `ACTIVE`                | `PENDING_APPROVAL`      | `propose_release`               | Landlord only                                           |
| `PENDING_APPROVAL`      | `RELEASED`              | `approve_release`               | Tenant only                                             |
| `PENDING_APPROVAL`      | `DISPUTED`              | `open_dispute`                  | Tenant only                                             |
| `DISPUTED`              | `RESOLVED`              | `resolve_dispute`               | `fine_amount <= max_fine`                               |
| `DISPUTED`              | `RESOLVED`              | `resolve_dispute_panel`         | All three rulings submitted; `adopted_fine <= max_fine` |
| Any active              | `RELEASED`              | `claim_timeout`                 | `Clock::unix_timestamp > deadline_ts`                   |

## Error codes

| Code                     | Meaning                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `InvalidStatus`          | Instruction called from an invalid starting state                   |
| `DeadlineNotReached`     | `claim_timeout` called before `deadline_ts`                         |
| `FineTooLarge`           | `fine_amount > max_fine`                                            |
| `EstimateAlreadySealed`  | Party tried to revise a sealed estimate                             |
| `BothEstimatesRequired`  | `reveal_estimates` called before both estimates are in              |
| `NotAllRulingsSubmitted` | `resolve_dispute_panel` called before all three panelists submitted |
| `SignaturesRequired`     | `fund_escrow` called before both parties signed                     |
