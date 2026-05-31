---
id: upload-contract
title: upload-contract
---

# `/api/upload-contract`

Accepts a lease PDF or DOCX, computes its SHA-256 hash, stores it in Firebase Cloud Storage, and submits the hash on-chain via the Anchor `record_contract_hash` instruction.

## `POST /api/upload-contract`

**Headers:** `Authorization: Bearer <Firebase JWT>`

**Request:** `multipart/form-data`

| Field     | Type   | Description                  |
| --------- | ------ | ---------------------------- |
| `file`    | File   | Lease PDF or DOCX; max 20 MB |
| `leaseId` | string | Firestore lease document ID  |

**Success response (200)**

```json
{
    "contractHash": "sha256:<hex>",
    "storageUrl": "gs://bucket/contracts/<leaseId>/lease-v1.pdf",
    "uploadedBy": "<walletPubkey>",
    "timestamp": "2025-01-15T10:00:00Z"
}
```

**Error responses**

| Code | Reason                                                |
| ---- | ----------------------------------------------------- |
| 400  | Invalid file type or size exceeds 20 MB               |
| 401  | Missing or invalid JWT                                |
| 409  | Contract already uploaded for this lease (write-once) |

## Implementation notes

- DOCX files are converted to PDF via `pdf-lib` before storage.
- The file is stored at `contracts/{leaseId}/lease-v{n}.pdf` with versioning enabled.
- Firebase Storage WORM policy prevents overwriting once the object is created.
- The relayer keypair (from Secret Manager) signs and submits `record_contract_hash` on Devnet/Mainnet.
