use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Each party independently seals their own damage estimate. Neither estimate is
/// revealed until both are in, and a sealed estimate can never be revised.
/// Requires status DISPUTED.
pub fn handler(ctx: Context<SubmitEstimate>, estimate: u64) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(escrow.status == EscrowStatus::Disputed, NestCrowError::NotDisputed);

    let is_landlord = ctx.accounts.signer.key() == escrow.landlord;
    let is_tenant = ctx.accounts.signer.key() == escrow.tenant;
    require!(is_landlord || is_tenant, NestCrowError::NotParty);

    let claim = &mut ctx.accounts.claim_record;
    require!(!claim.estimates_revealed, NestCrowError::EstimatesAlreadyRevealed);

    let now = Clock::get()?.unix_timestamp;
    if is_landlord {
        require!(!claim.landlord_estimate_submitted, NestCrowError::EstimateAlreadySubmitted);
        claim.landlord_estimate = estimate;
        claim.landlord_estimate_sealed_ts = now;
        claim.landlord_estimate_submitted = true;
    } else {
        require!(!claim.tenant_estimate_submitted, NestCrowError::EstimateAlreadySubmitted);
        claim.tenant_estimate = estimate;
        claim.tenant_estimate_sealed_ts = now;
        claim.tenant_estimate_submitted = true;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct SubmitEstimate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

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

    pub system_program: Program<'info, System>,
}
