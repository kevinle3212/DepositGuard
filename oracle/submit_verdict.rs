use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::EscrowError;
use crate::events::VerdictSubmitted;
use crate::state::*;

/// The authorized fine-calculation agent submits its judgement.
///
/// Trust boundary: Gemini's judgement happens off-chain; this instruction only
/// *records* the result and *derives the money* deterministically. The signer
/// must equal `config.oracle`, and `fine_bps` is capped by `config.max_fine_bps`,
/// so the program never trusts the agent with an unbounded transfer.
#[derive(Accounts)]
pub struct SubmitVerdict<'info> {
    /// Must match `config.oracle`.
    pub oracle: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = oracle @ EscrowError::UnauthorizedOracle,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.buyer.as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [DISPUTE_SEED, escrow.key().as_ref()],
        bump = dispute.bump,
        has_one = escrow,
    )]
    pub dispute: Account<'info, Dispute>,
}

pub fn submit_verdict(
    ctx: Context<SubmitVerdict>,
    resolution: DisputeResolution,
    fine_bps: u16,
    verdict_hash: [u8; 32],
) -> Result<()> {
    require!(
        ctx.accounts.escrow.state == EscrowState::Disputed,
        EscrowError::InvalidEscrowState
    );
    require!(
        matches!(
            ctx.accounts.dispute.state,
            DisputeState::Open | DisputeState::UnderReview
        ),
        EscrowError::DisputeNotPending
    );
    require!(
        resolution != DisputeResolution::Pending,
        EscrowError::InvalidResolution
    );
    require!(
        fine_bps <= ctx.accounts.config.max_fine_bps,
        EscrowError::FineTooHigh
    );

    // Deterministic fine: amount * fine_bps / 10_000 (u128 to avoid overflow).
    let amount = ctx.accounts.escrow.amount;
    let fine_amount = (amount as u128)
        .checked_mul(fine_bps as u128)
        .ok_or(EscrowError::Overflow)?
        .checked_div(BPS_DENOMINATOR as u128)
        .ok_or(EscrowError::Overflow)? as u64;

    let now = Clock::get()?.unix_timestamp;
    let escrow_key = ctx.accounts.escrow.key();

    let dispute = &mut ctx.accounts.dispute;
    dispute.resolution = resolution;
    dispute.fine_bps = fine_bps;
    dispute.fine_amount = fine_amount;
    dispute.verdict_hash = verdict_hash;
    dispute.state = DisputeState::Resolved;
    dispute.resolved_at = now;

    // Mark the escrow resolved. Disbursement (paying out per `resolution`,
    // deducting `fine_amount` + arbitration fees) is handled by the resolution
    // execution instruction, wired up with the fees/panel modules.
    ctx.accounts.escrow.state = EscrowState::Resolved;

    emit!(VerdictSubmitted {
        escrow: escrow_key,
        dispute: dispute.key(),
        oracle: ctx.accounts.oracle.key(),
        resolution,
        fine_bps,
        fine_amount,
        verdict_hash,
    });

    Ok(())
}
