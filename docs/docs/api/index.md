---
id: index
title: API Reference
---

# API Reference

DepositGuard exposes seven Cloud Run microservices, each as an independent HTTP API. All authenticated endpoints require a Firebase Auth JWT in the `Authorization: Bearer <token>` header. The token must have a `walletPubkey` custom claim set by `/api/verify-wallet`.

## Services

| Service                                  | Local port | Purpose                                      |
| ---------------------------------------- | ---------- | -------------------------------------------- |
| [verify-wallet](./verify-wallet)         | 8081       | Wallet signature verification → Firebase JWT |
| [upload-contract](./upload-contract)     | 8082       | PDF/DOCX upload, hash, on-chain recording    |
| [send-signing-link](./send-signing-link) | 8083       | Magic-link email for contract signing        |
| [assess-damage](./assess-damage)         | 8084       | Gemini AI damage assessment                  |
| [tts](./tts)                             | 8085       | ElevenLabs text-to-speech                    |
| [notify](./notify)                       | 8086       | Transactional email (SendGrid)               |
| [webhook-deadline](./webhook-deadline)   | 8087       | Deadline enforcement cron job                |

## Authentication flow

```
Client                verify-wallet           All other services
  │                       │                        │
  ├── GET /api/nonce ──▶  │                        │
  │ ◀── { nonce } ───────  │                        │
  │                       │                        │
  ├── POST /api/verify-wallet { walletPubkey, signature, nonce } ──▶ │
  │ ◀── { token } (Firebase custom JWT) ──────────  │
  │                                                 │
  ├── POST /api/<any> Authorization: Bearer <token> ▶ │
  │                                                 │
  │                              (middleware validates walletPubkey claim)
```

## Common error responses

| Code | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| 400  | Missing or malformed request body                                     |
| 401  | Missing, invalid, or expired Firebase JWT; missing walletPubkey claim |
| 403  | Authenticated but unauthorized for this resource                      |
| 429  | Rate limit exceeded (20 req/min per user)                             |
| 500  | Internal server error — check Cloud Run logs                          |
