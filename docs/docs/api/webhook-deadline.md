---
id: webhook-deadline
title: webhook-deadline
---

# `/api/webhook-deadline`

Cron-triggered endpoint that queries Firestore for expired leases and submits `claim_timeout` on-chain for each one. Invoked by Google Cloud Scheduler every 15 minutes.

## `POST /api/webhook-deadline`

**Auth:** OIDC token from Cloud Scheduler (not a Firebase JWT — this endpoint is internal-only).

**Request body:** Empty.

**Success response (200)**

```json
{
    "processed": 2,
    "skipped": 0,
    "errors": []
}
```

**Behavior**

1. Query Firestore for leases in `assessed` or `disputed` status where `deadlineTs < now`.
2. For each expired lease, build a `claim_timeout` transaction.
3. Sign with the relayer keypair (fetched from Google Cloud Secret Manager).
4. Submit to Solana; the on-chain instruction independently validates `deadline_ts < Clock::unix_timestamp` — the relayer cannot trigger early.
5. Call `/api/notify` with `claim-timeout-executed` for both parties.

## On-chain safety

The Anchor `claim_timeout` instruction enforces:

```rust
require!(
    clock.unix_timestamp > escrow.deadline_ts,
    EscrowError::DeadlineNotReached
);
```

Even if the relayer calls this endpoint early (e.g., misconfigured clock), the transaction will be rejected on-chain.

## Cloud Scheduler configuration

- Schedule: `*/15 * * * *` (every 15 minutes)
- Target: `POST https://<cloud-run-url>/api/webhook-deadline`
- Auth: OIDC with the relayer service account
