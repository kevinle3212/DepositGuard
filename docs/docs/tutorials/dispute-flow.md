---
id: dispute-flow
title: "Tutorial: Dispute Flow"
---

# Tutorial: Dispute Flow

This walkthrough covers what happens when the tenant disputes the landlord's deduction proposal.

## Triggering a dispute

At move-out, the landlord submits a deduction statement from the assessment page. The tenant has two choices:

- **Agree** → calls `approve_release` on-chain; lease moves to `RELEASED`.
- **Dispute** → calls `open_dispute` on-chain; lease moves to `DISPUTED`.

When a dispute is opened:

- The **undisputed** portion is released to the tenant immediately.
- The **disputed** remainder is locked in the PDA.

## Step 1 — Sealed estimate submission

Both parties are prompted to submit their damage estimates **independently** — each party cannot see the other's estimate until both are submitted.

1. Go to `/lease/[id]/dispute`.
2. Fill in your itemized estimate. Click **Submit Sealed Estimate**.
3. Wait for the other party to submit (the UI shows a "waiting" state).

The estimates are sealed in `ClaimRecord`. Revision is blocked after submission.

## Step 2 — Reveal estimates

Once both estimates are submitted, the `reveal_estimates` instruction is called automatically by the relayer.

- `max_fine = (tenant_estimate + landlord_estimate) / 2` is set on-chain.
- Both estimates are displayed to both parties.
- The Gemini advisory estimate is shown alongside for reference.

## Step 3 — Direct negotiation

The parties can now propose revised splits in the dispute UI. This is off-chain negotiation — no transactions are required. If agreement is reached, one party calls `approve_release` and the other confirms.

## Step 4 — Escalate to arbitration (if no agreement)

If direct negotiation fails, either party can escalate:

1. Click **Escalate to Arbitration** on the dispute page.
2. Each party pays a $50 USDC arbitration fee via `pay_arbitration_fee`.
3. Both parties have **72 hours** to pay. If only one party pays, fees are refunded and the dispute remains in direct negotiation.

### Optional: Panel upgrade

Either party can request a three-panelist panel instead of a solo arbitrator. Both parties must pay an additional $25 USDC via `pay_panel_upgrade_fee`.

## Deadline enforcement

If neither party triggers a resolution before `deadline_ts`, the Cloud Scheduler cron job triggers `claim_timeout`, returning the full remaining balance to the tenant.

## Next steps

- See [Arbitration Panel](./arbitration-panel) for the arbitration resolution flow.
- See the [State Machine](../smart-contracts/state-machine) for all valid transitions.
