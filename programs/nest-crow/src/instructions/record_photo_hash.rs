use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Stores the SHA-256 hash of a party's move-in photo set in the ClaimRecord.
///
/// State transitions:
/// - First submission (FUNDED → PENDING_DOCUMENTATION).
/// - Both parties submitted (PENDING_DOCUMENTATION → ACTIVE).
pub fn handler(ctx: Context<RecordPhotoHash>, photo_hash: [u8; 32]) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    let claim = &mut ctx.accounts.claim_record;
    let caller = ctx.accounts.caller.key();

    // Authorize caller before checking state (prevents state-machine information leakage).
    require!(caller == escrow.landlord || caller == escrow.tenant, NestCrowError::NotParty);

    require!(
        escrow.status == EscrowStatus::Funded
            || escrow.status == EscrowStatus::PendingDocumentation,
        NestCrowError::InvalidStatusTransition
    );

    if caller == escrow.landlord {
        require!(!claim.landlord_photos_submitted, NestCrowError::LandlordPhotosAlreadySubmitted);
        claim.landlord_photo_hash = photo_hash;
        claim.landlord_photos_submitted = true;
    } else {
        // caller == escrow.tenant (validated above)
        require!(!claim.tenant_photos_submitted, NestCrowError::TenantPhotosAlreadySubmitted);
        claim.tenant_photo_hash = photo_hash;
        claim.tenant_photos_submitted = true;
    }

    let escrow = &mut ctx.accounts.escrow_state;
    let claim = &ctx.accounts.claim_record;

    if escrow.status == EscrowStatus::Funded {
        escrow.status = EscrowStatus::PendingDocumentation;
    }

    if claim.landlord_photos_submitted && claim.tenant_photos_submitted {
        escrow.status = EscrowStatus::Active;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RecordPhotoHash<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
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
