---
id: tts
title: tts
---

# `/api/tts`

Generates spoken audio from pre-defined voice script templates using ElevenLabs. Returns a streamed MP3. Returns 204 silently if `ELEVENLABS_API_KEY` is unset (for local dev without ElevenLabs).

## `POST /api/tts`

**Headers:** `Authorization: Bearer <Firebase JWT>`

**Request body**

```json
{
    "scriptKey": "dispute-initiated",
    "variables": {
        "landlordName": "Jane Smith",
        "depositAmount": "1500"
    }
}
```

**Success response (200)** — `Content-Type: audio/mpeg`, streamed MP3.

**Error responses**

| Code | Reason                                          |
| ---- | ----------------------------------------------- |
| 400  | Unknown scriptKey or missing required variables |
| 401  | Missing or invalid JWT                          |
| 429  | Rate limit exceeded (20 req/min per user)       |

## Available script keys

| Key                      | Voice           | Trigger                      |
| ------------------------ | --------------- | ---------------------------- |
| `wallet-connect-prompt`  | Platform Guide  | Wallet connection page       |
| `onboarding-welcome`     | Platform Guide  | First login                  |
| `contract-signing-ready` | Platform Guide  | Both parties signing         |
| `arbitration-fee-due`    | Dispute Advisor | Arbitration fee payment      |
| `minority-dissent-filed` | Dispute Advisor | Minority dissent recorded    |
| `deposit-released`       | Platform Guide  | Deposit release confirmation |
| `deadline-warning`       | Platform Guide  | Deadline approaching         |
| `error-generic`          | Platform Guide  | Unexpected error states      |

## Caching

Static (variable-free) scripts are pre-rendered to MP3 and cached in Firebase Cloud Storage at `tts-cache/{voiceRole}/{scriptKey}.mp3`. The endpoint checks the cache before calling ElevenLabs.

Refresh the cache after modifying scripts:

```bash
yarn tsx scripts/pre-render-tts.ts
```

## Voice IDs

| Role            | Default ElevenLabs voice | Override env var                      |
| --------------- | ------------------------ | ------------------------------------- |
| Platform Guide  | Rachel                   | `ELEVENLABS_VOICE_ID_PLATFORM_GUIDE`  |
| Dispute Advisor | Adam                     | `ELEVENLABS_VOICE_ID_DISPUTE_ADVISOR` |
