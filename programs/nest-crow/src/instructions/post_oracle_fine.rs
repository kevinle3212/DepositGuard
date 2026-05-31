use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// The designated oracle relays the Gemini-computed fine on-chain. This value is
/// advisory: it is recorded for the arbitrator/panel and re-checked against
/// `max_fine` here, but every resolution path independently re-enforces the cap.
pub fn handler(ctx: Context<PostOracleFine>, fine: u64) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(escrow.status == EscrowStatus::Disputed, NestCrowError::NotDisputed);

    let claim = &mut ctx.accounts.claim_record;
    require!(ctx.accounts.oracle.key() == claim.oracle, NestCrowError::NotOracle);
    require!(claim.estimates_revealed, NestCrowError::EstimatesNotRevealed);
    require!(fine <= claim.max_fine, NestCrowError::FineExceedsMaxFine);

    claim.oracle_fine = fine;
    claim.oracle_fine_posted = true;

    Ok(())
}

#[derive(Accounts)]
pub struct PostOracleFine<'info> {
    pub oracle: Signer<'info>,

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
