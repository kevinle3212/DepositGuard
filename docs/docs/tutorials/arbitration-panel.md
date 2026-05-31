---
id: arbitration-panel
title: "Tutorial: Arbitration Panel"
---

# Tutorial: Arbitration Panel

This walkthrough covers the three-panelist arbitration track, activated when both parties pay the $25 panel upgrade fee.

## Panel composition

Three panelists are assigned by the platform. Each panelist:

- Receives the lease details, photo sets, Gemini estimate, and both sealed estimates.
- Has a conflict-of-interest disclosure visible on the arbitration page.
- Submits a sealed ruling independently.

## Step 1 — Panelists submit rulings

Each panelist navigates to their ruling portal and submits:

- **Fine amount** — how much the tenant owes the landlord (must be ≤ `max_fine`).
- **Recipient** — landlord wallet or platform fee address.
- **Ruling hash** — SHA-256 of their written reasoning document.

Rulings are sealed on-chain via `submit_panel_ruling`. A panelist cannot revise after submitting. The ruling status per panelist (sealed / pending) is visible on the arbitration page, but the amounts are hidden until all three are in.

## Step 2 — Reveal all rulings

Once all three panelists have submitted, the relayer calls `resolve_dispute_panel`. All three rulings are revealed simultaneously.

## Step 3 — Outcome calculation (on-chain)

The Anchor program applies one of three cases:

| Case          | Condition                   | Outcome                           |
| ------------- | --------------------------- | --------------------------------- |
| A — Unanimous | All three rulings identical | Adopted as-is                     |
| B — Majority  | Two rulings match           | Majority adopted; dissent checked |
| C — Median    | Three different amounts     | Median adopted                    |

### Minority dissent rule (Case B)

If the dissenting panelist's amount differs from the majority by more than 20%:

- `minority_dissent_flag = true` is set on-chain in `ClaimRecord`.
- The minority ruling hash and panelist pubkey are permanently recorded.
- Both parties see a **Minority Dissent** notice on the arbitration page.

The dissent flag does not change the outcome — the majority ruling is still adopted — but it creates an audit trail for court escalation within the 14-day escalation window.

## Step 4 — Escalation window

After `resolve_dispute_panel`, `escalation_deadline_ts = now + 14 days` is set on-chain. During this window:

- Either party can escalate to court using the on-chain ruling and minority dissent record as evidence.
- After 14 days, the escrow can be fully closed.

## What if a panelist doesn't submit?

If a panelist fails to submit within the platform's ruling deadline, the platform will reassign or escalate. This process is off-chain — the smart contract requires all three rulings before `resolve_dispute_panel` can execute.
