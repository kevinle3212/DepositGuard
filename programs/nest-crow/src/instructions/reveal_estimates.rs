use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Computes `max_fine = (tenant_estimate + landlord_estimate) / 2` once both
/// estimates are sealed. Deterministic and permissionless (typically the relayer).
/// `max_fine` is the hard cap every resolution path must respect.
pub fn handler(ctx: Context<RevealEstimates>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(escrow.status == EscrowStatus::Disputed, NestCrowError::NotDisputed);

    let claim = &mut ctx.accounts.claim_record;
    require!(
        claim.tenant_estimate_submitted && claim.landlord_estimate_submitted,
        NestCrowError::EstimatesNotSubmitted
    );
    require!(!claim.estimates_revealed, NestCrowError::EstimatesAlreadyRevealed);

    let sum = claim
        .tenant_estimate
        .checked_add(claim.landlord_estimate)
        .ok_or(NestCrowError::ArithmeticOverflow)?;
    claim.max_fine = sum / 2;
    claim.estimates_revealed = true;

    Ok(())
}

#[derive(Accounts)]
pub struct RevealEstimates<'info> {
    /// Permissionless; the computation is fully deterministic.
    pub caller: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"claim-record", escrow_state.lease_id.as_ref()],
        bump = claim_record.bump,
    )]
    pub claim_record: Account<'info, ClaimRecord>,
}
