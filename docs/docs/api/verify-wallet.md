---
id: verify-wallet
title: verify-wallet
---

# `/api/verify-wallet`

Verifies an Ed25519 wallet signature and mints a Firebase Auth custom JWT with the `walletPubkey` embedded as a custom claim. All other API routes require the JWT produced here.

## Endpoints

### `GET /api/nonce`

Returns a server-generated nonce for the client to sign.

**Response**

```json
{ "nonce": "abc123..." }
```

Nonces expire after 5 minutes. Request a fresh one for each verification attempt.

---

### `POST /api/verify-wallet`

**Request body**

```json
{
    "walletPubkey": "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963vox8",
    "signature": "<base58-encoded Ed25519 signature>",
    "nonce": "abc123..."
}
```

**Success response (200)**

```json
{ "token": "<Firebase custom JWT>" }
```

Exchange this token with `firebase.auth().signInWithCustomToken(token)` on the client.

**Error responses**

| Code | Reason                              |
| ---- | ----------------------------------- |
| 400  | Missing or malformed fields         |
| 401  | Invalid signature or nonce mismatch |
| 410  | Nonce expired or already used       |

## Implementation notes

- Signature verification uses the Web Crypto API (`Ed25519`) and `@solana/web3.js PublicKey`.
- On success, `walletPubkey` and `walletVerifiedAt` are written to `users/{uid}` in Firestore.
- The nonce store (`lib/nonce-store.ts`) is in-process with a 5-minute TTL; each nonce is single-use.
