---
id: assess-damage
title: assess-damage
---

# `/api/assess-damage`

Runs a Gemini 2.0 Flash multimodal comparison of move-in and move-out photo sets and returns an itemized damage estimate. Protected by Cloud Armor rate limiting.

## `POST /api/assess-damage`

**Headers:** `Authorization: Bearer <Firebase JWT>`

**Request body**

```json
{
    "leaseId": "lease_abc123"
}
```

Photos are fetched automatically from Firebase Cloud Storage using signed URLs. The endpoint does not accept raw image uploads — photos must have been committed via `record_photo_hash` first.

**Success response (200)**

```json
{
    "advisoryLabel": "Estimate Only - Not Legally Binding",
    "items": [
        {
            "description": "Carpet stain in living room",
            "estimatedAmountUsdc": 150,
            "severity": "moderate",
            "observedDifference": "No stain in move-in photos; visible stain in move-out photos"
        }
    ],
    "totalEstimatedDamageUsd": 150,
    "summary": "One moderate item of damage observed."
}
```

**Error responses**

| Code | Reason                                                                            |
| ---- | --------------------------------------------------------------------------------- |
| 400  | Lease not in correct status or photos not uploaded                                |
| 401  | Missing or invalid JWT                                                            |
| 422  | Gemini returned unparseable output — both parties notified, no write to Firestore |
| 429  | Rate limit exceeded                                                               |

## Auto-dispute flag

If `|landlord_total - gemini_total| / gemini_total > disputeThresholdPct` (default 15%), the tenant sees a dispute prompt in the UI.

## Implementation notes

- Model: `gemini-2.0-flash`, temperature `0.0`, JSON response mode.
- Response validated with a Zod schema before any Firestore write.
- `geminiRaw` is written once and marked immutable in Firestore security rules.
- Cloud Armor enforces 100 req/min per IP at the load balancer level.
