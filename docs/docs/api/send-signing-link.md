---
id: send-signing-link
title: send-signing-link
---

# `/api/send-signing-link`

Generates a signed JWT magic link and emails it to the designated party (landlord or tenant) for in-browser contract signing.

## `POST /api/send-signing-link`

**Headers:** `Authorization: Bearer <Firebase JWT>`

**Request body**

```json
{
    "leaseId": "lease_abc123",
    "role": "tenant",
    "email": "tenant@example.com"
}
```

**Success response (204)** — No body. Email dispatched.

**Error responses**

| Code | Reason                                                      |
| ---- | ----------------------------------------------------------- |
| 400  | Missing fields or invalid role                              |
| 401  | Missing or invalid JWT                                      |
| 409  | Signing link already sent and not yet expired for this role |

## Magic link JWT payload

```json
{
    "leaseId": "lease_abc123",
    "role": "tenant",
    "email": "tenant@example.com",
    "exp": 1737000000
}
```

- Expires in **48 hours**.
- Stored in `signingTokens/{token}` in Firestore.
- Invalidated immediately after the party signs.

## `/lease/[id]/sign` page flow

1. Recipient opens the magic link.
2. Frontend validates JWT (expiry, `leaseId` match).
3. If no wallet connected → redirect to `/connect`.
4. Contract PDF rendered via `pdfjs-dist`.
5. "Sign and Confirm" → `wallet.signMessage(...)` → signature recorded in Firestore and on-chain.
6. Token invalidated; `LeaseConfig` PDA updated with `landlord_signed` / `tenant_signed`.
