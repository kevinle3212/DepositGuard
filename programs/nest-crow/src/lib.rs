//! NestCrow — security deposit escrow on Solana.
//!
//! State machine:
//!   CREATED → FUNDED → `PENDING_DOCUMENTATION` → ACTIVE →
//!   `PENDING_APPROVAL` → RELEASED / DISPUTED → RESOLVED
//!
//! Anchor `Context` / `Accounts` use elided binder lifetimes on `#[program]` entrypoints.
#![allow(
    elided_lifetimes_in_paths,
    clippy::diverging_sub_expression,
    clippy::needless_pass_by_value
)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

// `use instructions::*` brings the Accounts structs into scope for #[program].
#[allow(clippy::wildcard_imports)]
use instructions::*;

// Replace with the actual program ID after running `anchor keys sync`.
declare_id!("Cr81cjzduskMppdGZWBaP7GVX8H1Uqujs2Zf9dSResyi");

#[allow(
    clippy::diverging_sub_expression,
    clippy::needless_pass_by_value,
    clippy::missing_errors_doc
)]
#[program]
pub mod nest_crow {
    use super::{
        instructions, ApproveRelease, ClaimTimeout, CloseEscrow, ConsumeArbitrationFees, Context,
        FundEscrow, InitializeEscrow, OpenArbitration, OpenDispute, OpenPanel, PayArbitrationFee,
        PayPanelUpgradeFee, PostOracleFine, ProposeRelease, Pubkey, RecordContractHash,
        RecordPhotoHash, RefundArbitrationFees, ResolveDispute, ResolveDisputePanel, Result,
        RevealEstimates, SubmitEstimate, SubmitPanelRuling,
    };

    /// Creates `EscrowState`, `LeaseConfig`, `ClaimRecord` PDAs and the vault token
    /// account for a new lease. Status begins at CREATED.
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        lease_id: Pubkey,
        tenant: Pubkey,
        deposit_amount: u64,
        deadline_ts: i64,
        jurisdiction_code: [u8; 8],
        dispute_threshold_pct: u8,
    ) -> Result<()> {
        instructions::initialize_escrow::handler(
            ctx,
            lease_id,
            tenant,
            deposit_amount,
            deadline_ts,
            jurisdiction_code,
            dispute_threshold_pct,
        )
    }

    /// Stores the SHA-256 hash of the lease PDF on-chain and marks the
    /// calling party as signed. Landlord calls first; tenant confirms.
    pub fn record_contract_hash(
        ctx: Context<RecordContractHash>,
        contract_hash: [u8; 32],
    ) -> Result<()> {
        instructions::record_contract_hash::handler(ctx, contract_hash)
    }

    /// Tenant transfers the full deposit into the PDA vault.
    /// Requires both `landlord_signed` and `tenant_signed` to be true.
    /// Status: CREATED → FUNDED.
    pub fn fund_escrow(ctx: Context<FundEscrow>) -> Result<()> {
        instructions::fund_escrow::handler(ctx)
    }

    /// Stores the SHA-256 hash of a party's move-in photo set.
    /// Status: FUNDED → `PENDING_DOCUMENTATION` (first call),
    ///         `PENDING_DOCUMENTATION` → ACTIVE (both parties submitted).
    pub fn record_photo_hash(ctx: Context<RecordPhotoHash>, photo_hash: [u8; 32]) -> Result<()> {
        instructions::record_photo_hash::handler(ctx, photo_hash)
    }

    /// Landlord proposes a deduction from the deposit after move-out.
    /// Status: ACTIVE → `PENDING_APPROVAL`.
    pub fn propose_release(ctx: Context<ProposeRelease>, deduction_amount: u64) -> Result<()> {
        instructions::propose_release::handler(ctx, deduction_amount)
    }

    /// Tenant accepts the landlord's proposed split; funds are disbursed.
    /// Status: `PENDING_APPROVAL` → RELEASED.
    pub fn approve_release(ctx: Context<ApproveRelease>) -> Result<()> {
        instructions::approve_release::handler(ctx)
    }

    /// Relayer calls after `deadline_ts`; full vault balance goes to tenant.
    /// Status: ACTIVE or `PENDING_APPROVAL` → RELEASED.
    pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
        instructions::claim_timeout::handler(ctx)
    }

    /// Closes all PDA accounts and the vault, returning rent to the landlord.
    /// Requires status = RELEASED or RESOLVED and vault balance = 0.
    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        instructions::close_escrow::handler(ctx)
    }

    // ── Dispute and fine calculation (Section 4) ─────────────────────────────────

    /// Tenant rejects the proposed deduction; undisputed funds go to the tenant,
    /// disputed funds stay locked. Records the solo arbitrator and fine oracle.
    /// Status: `PENDING_APPROVAL` → DISPUTED.
    pub fn open_dispute(
        ctx: Context<OpenDispute>,
        arbitrator: Pubkey,
        oracle: Pubkey,
    ) -> Result<()> {
        instructions::open_dispute::handler(ctx, arbitrator, oracle)
    }

    /// Each party seals an independent damage estimate; revision is forbidden and
    /// neither is revealed until both are in.
    pub fn submit_estimate(ctx: Context<SubmitEstimate>, estimate: u64) -> Result<()> {
        instructions::submit_estimate::handler(ctx, estimate)
    }

    /// Computes `max_fine = (tenant_estimate + landlord_estimate) / 2` once both
    /// estimates are sealed.
    pub fn reveal_estimates(ctx: Context<RevealEstimates>) -> Result<()> {
        instructions::reveal_estimates::handler(ctx)
    }

    /// Oracle relays the Gemini-computed fine on-chain (advisory, re-checked
    /// against `max_fine`).
    pub fn post_oracle_fine(ctx: Context<PostOracleFine>, fine: u64) -> Result<()> {
        instructions::post_oracle_fine::handler(ctx, fine)
    }

    /// Solo arbitrator executes the resolution; `fine_amount` is capped at
    /// `max_fine`. Status: DISPUTED → RESOLVED.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, fine_amount: u64) -> Result<()> {
        instructions::resolve_dispute::handler(ctx, fine_amount)
    }

    // ── Arbitration fee escrow (Section 5) ───────────────────────────────────────

    /// Opens the arbitration fee track: $50/party, 72-hour window, assigned arbitrator.
    pub fn open_arbitration(ctx: Context<OpenArbitration>, arbitrator: Pubkey) -> Result<()> {
        instructions::open_arbitration::handler(ctx, arbitrator)
    }

    /// A party pays its fixed $50 USDC arbitration fee.
    pub fn pay_arbitration_fee(ctx: Context<PayArbitrationFee>) -> Result<()> {
        instructions::pay_arbitration_fee::handler(ctx)
    }

    /// A party pays the optional $25 USDC panel-upgrade fee (both must pay to activate).
    pub fn pay_panel_upgrade_fee(ctx: Context<PayPanelUpgradeFee>) -> Result<()> {
        instructions::pay_panel_upgrade_fee::handler(ctx)
    }

    /// Returns paid fees to the payers (early resolution or one-party default).
    pub fn refund_arbitration_fees(ctx: Context<RefundArbitrationFees>) -> Result<()> {
        instructions::refund_arbitration_fees::handler(ctx)
    }

    /// Assigned arbitrator claims the fee pool after both parties pay.
    pub fn consume_arbitration_fees(ctx: Context<ConsumeArbitrationFees>) -> Result<()> {
        instructions::consume_arbitration_fees::handler(ctx)
    }

    // ── Arbitration panel and minority voting (Section 6) ────────────────────────

    /// Creates the three-arbitrator panel (requires both panel-upgrade fees paid).
    pub fn open_panel(ctx: Context<OpenPanel>, panelists: [Pubkey; 3]) -> Result<()> {
        instructions::open_panel::handler(ctx, panelists)
    }

    /// A panelist submits a sealed ruling (fine, recipient, reasoning hash).
    pub fn submit_panel_ruling(
        ctx: Context<SubmitPanelRuling>,
        fine_amount: u64,
        recipient: Pubkey,
        ruling_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_panel_ruling::handler(ctx, fine_amount, recipient, ruling_hash)
    }

    /// Reconciles the three rulings (unanimous / majority / median), enforces the
    /// `max_fine` cap and minority protection, and pays out. Status: DISPUTED → RESOLVED.
    pub fn resolve_dispute_panel(ctx: Context<ResolveDisputePanel>) -> Result<()> {
        instructions::resolve_dispute_panel::handler(ctx)
    }
}
