---
id: faq
title: FAQ & Troubleshooting
---

# FAQ & Troubleshooting

## General

### What blockchain does DepositGuard use?

Solana. The escrow program (`nest-crow`) is deployed on Devnet at `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`. Mainnet launch is tracked in Section 22 of the project roadmap.

### What token is used for deposits?

USDC (SPL token, 6 decimal places). SOL is used only for transaction fees (typically < $0.001 per transaction).

### Is Gemini's damage estimate legally binding?

No. All AI output carries the label **"Estimate Only - Not Legally Binding"**. Gemini is used to provide a reference point for negotiation, not to make legal determinations.

### What happens if no one resolves the dispute before the deadline?

The Cloud Scheduler cron job triggers `claim_timeout` automatically, returning the full remaining balance to the tenant. The on-chain instruction independently enforces this — the relayer cannot trigger it early.

---

## Setup & Development

### `anchor build` fails with "account not found"

Make sure your Solana wallet is funded on Devnet:

```bash
solana airdrop 2
```

### `yarn dev` errors about missing environment variables

Run `cp .env.example .env` and fill in at minimum `FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_SOLANA_RPC_URL`, and `NEXT_PUBLIC_PROGRAM_ID`.

### Firebase Admin initialization fails locally

Set `FIREBASE_SERVICE_ACCOUNT_JSON` to a base64-encoded service account JSON string:

```bash
cat your-service-account.json | base64 | tr -d '\n'
```

### ElevenLabs TTS returns 204

`ELEVENLABS_API_KEY` is unset — this is intentional for local dev without an ElevenLabs account. The app functions normally without voice.

### Docker Compose service fails to start

Check that all required env vars for that service are set in `.env`. Run:

```bash
docker compose -f docker/docker-compose.yml --env-file .env logs <service-name>
```

---

## Smart contracts

### `fund_escrow` transaction fails with `SignaturesRequired`

Both parties must sign the lease contract before funding is allowed. Check `LeaseConfig.landlord_signed` and `tenant_signed` via Anchor CLI or Solana Explorer.

### `resolve_dispute` fails with `FineTooLarge`

The proposed `fine_amount` exceeds `max_fine`. The maximum is `(tenant_estimate + landlord_estimate) / 2`, set on-chain in `ClaimRecord` after `reveal_estimates`.

### `claim_timeout` fails with `DeadlineNotReached`

The `deadline_ts` has not yet passed. The Anchor instruction enforces this — the relayer cannot trigger early.

---

## Wallet

### Tangem hardware wallet isn't connecting

Tangem SDK (`@tangem/tangem-sdk-web`) is not yet on npm. The connect page shows a "coming soon" placeholder. Use Phantom or Solflare in the meantime.

### Wallet modal shows "WalletNotReadyError"

Install the Phantom or Solflare browser extension and refresh the page.
