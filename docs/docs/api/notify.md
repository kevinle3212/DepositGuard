---
id: notify
title: notify
---

# `/api/notify`

Dispatches transactional email notifications via SendGrid for all on-chain and off-chain events that affect a party's funds or require action.

## `POST /api/notify`

**Headers:** `Authorization: Bearer <Firebase JWT>` (or called internally by other services)

**Request body**

```json
{
    "leaseId": "lease_abc123",
    "event": "dispute-opened",
    "recipients": ["landlord", "tenant"]
}
```

**Success response (204)** — No body.

**Error responses**

| Code | Reason                                  |
| ---- | --------------------------------------- |
| 400  | Unknown event key or invalid recipients |
| 401  | Missing or invalid JWT                  |

## Event keys

| Key                        | Recipients         | Trigger                                |
| -------------------------- | ------------------ | -------------------------------------- |
| `magic-link-invite`        | tenant or landlord | Signing link issued                    |
| `both-parties-signed`      | landlord, tenant   | Both signatures recorded               |
| `move-in-photo-required`   | tenant             | Lease moved to PENDING_DOCUMENTATION   |
| `move-out-complete`        | landlord           | Move-out photos uploaded               |
| `assessment-ready`         | landlord, tenant   | Gemini assessment written to Firestore |
| `deduction-statement`      | tenant             | Landlord proposes deduction            |
| `dispute-opened`           | landlord, tenant   | `open_dispute` called on-chain         |
| `arbitration-fee-due`      | landlord, tenant   | Arbitration track opened               |
| `arbitration-fee-refunded` | landlord, tenant   | Fees refunded before assignment        |
| `ruling-issued`            | landlord, tenant   | Arbitration panel ruling adopted       |
| `minority-dissent-filed`   | landlord, tenant   | Minority dissent flag set              |
| `deposit-released`         | tenant             | Full or partial deposit released       |
| `deadline-warning`         | landlord, tenant   | Deadline within 24 hours               |
| `claim-timeout-executed`   | landlord, tenant   | Relayer executed `claim_timeout`       |
