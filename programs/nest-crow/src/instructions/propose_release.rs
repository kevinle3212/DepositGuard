use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Landlord proposes a deduction split after move-out.
/// Sets `landlord_estimate` and `undisputed_total` in `ClaimRecord`.
/// Status transitions: ACTIVE → `PENDING_APPROVAL`.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(ctx: Context<ProposeRelease>, deduction_amount: u64) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;

    require!(escrow.status == EscrowStatus::Active, NestCrowError::NotActive);
    require!(ctx.accounts.landlord.key() == escrow.landlord, NestCrowError::NotLandlord);
    require!(deduction_amount <= escrow.deposit_amount, NestCrowError::DeductionExceedsDeposit);

    let undisputed = escrow
        .deposit_amount
        .checked_sub(deduction_amount)
        .ok_or(NestCrowError::ArithmeticOverflow)?;

    let claim = &mut ctx.accounts.claim_record;
    claim.landlord_estimate = deduction_amount;
    claim.undisputed_total = undisputed;
    claim.landlord_estimate_sealed_ts = Clock::get()?.unix_timestamp;

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::PendingApproval;

    Ok(())
}

#[derive(Accounts)]
pub struct ProposeRelease<'info> {
    #[account(mut)]
    pub landlord: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = landlord @ NestCrowError::NotLandlord,
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
