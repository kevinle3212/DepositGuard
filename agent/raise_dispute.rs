use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::EscrowError;
use crate::events::DisputeRaised;
use crate::state::*;

/// Either party opens a dispute against a funded escrow. This freezes the
/// escrow (`Disputed`) so release/refund cannot run until it is cancelled by
/// the initiator or resolved by a verdict.
///
/// The caller commits the evidence image up front: `evidence_uri` points at the
/// off-chain bytes and `evidence_hash` is their SHA-256. The fine-calculation
/// agent re-fetches the URI and checks the hash before judging, so the image it
/// scores is provably the one committed here.
#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(mut)]
    pub initiator: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow.buyer.as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init,
        payer = initiator,
        space = 8 + Dispute::INIT_SPACE,
        seeds = [DISPUTE_SEED, escrow.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,

    pub system_program: Program<'info, System>,
}

pub fn raise_dispute(
    ctx: Context<RaiseDispute>,
    reason: String,
    evidence_uri: String,
    evidence_hash: [u8; 32],
) -> Result<()> {
    require!(
        ctx.accounts.escrow.state == EscrowState::Funded,
        EscrowError::InvalidEscrowState
    );
    require!(reason.len() <= MAX_REASON_LEN, EscrowError::ReasonTooLong);
    require!(evidence_uri.len() <= MAX_URI_LEN, EscrowError::UriTooLong);

    let initiator = ctx.accounts.initiator.key();
    require!(
        initiator == ctx.accounts.escrow.buyer || initiator == ctx.accounts.escrow.seller,
        EscrowError::UnauthorizedParty
    );

    let escrow_key = ctx.accounts.escrow.key();
    let now = Clock::get()?.unix_timestamp;

    let dispute = &mut ctx.accounts.dispute;
    dispute.escrow = escrow_key;
    dispute.initiator = initiator;
    dispute.reason = reason;
    dispute.evidence_uri = evidence_uri.clone();
    dispute.evidence_hash = evidence_hash;
    dispute.state = DisputeState::Open;
    dispute.resolution = DisputeResolution::Pending;
    dispute.fine_bps = 0;
    dispute.fine_amount = 0;
    dispute.verdict_hash = [0u8; 32];
    dispute.created_at = now;
    dispute.resolved_at = 0;
    dispute.bump = ctx.bumps.dispute;

    let escrow = &mut ctx.accounts.escrow;
    escrow.state = EscrowState::Disputed;
    escrow.has_dispute = true;

    emit!(DisputeRaised {
        escrow: escrow_key,
        dispute: dispute.key(),
        initiator,
        evidence_uri,
    });

    Ok(())
}
