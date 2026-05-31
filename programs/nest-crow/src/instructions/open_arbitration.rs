use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::NestCrowError;
use crate::state::{
    ArbitrationEscrow, ArbitrationFeeStatus, EscrowState, EscrowStatus, ARBITRATION_FEE_USDC,
    ARBITRATION_PAYMENT_WINDOW_SECS,
};

/// Opens the arbitration fee track for a disputed lease.
///
/// Creates the `ArbitrationEscrow` and its fee vault, fixes each party's fee at
/// $50 USDC, records the assigned arbitrator, and starts the 72-hour payment
/// window. Callable by either party once the lease is DISPUTED.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(ctx: Context<OpenArbitration>, arbitrator: Pubkey) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(escrow.status == EscrowStatus::Disputed, NestCrowError::NotDisputed);

    let signer = ctx.accounts.signer.key();
    require!(signer == escrow.landlord || signer == escrow.tenant, NestCrowError::NotParty);

    let now = Clock::get()?.unix_timestamp;

    let arb = &mut ctx.accounts.arbitration_escrow;
    arb.lease_id = escrow.lease_id;
    arb.token_mint = escrow.token_mint;
    arb.landlord_paid = false;
    arb.tenant_paid = false;
    arb.landlord_fee_amount = ARBITRATION_FEE_USDC;
    arb.tenant_fee_amount = ARBITRATION_FEE_USDC;
    arb.landlord_panel_paid = false;
    arb.tenant_panel_paid = false;
    arb.panel_upgrade_paid = false;
    arb.total = 0;
    arb.status = ArbitrationFeeStatus::AwaitingPayment;
    arb.arbitrator_pubkey = arbitrator;
    arb.payment_deadline_ts = now
        .checked_add(ARBITRATION_PAYMENT_WINDOW_SECS)
        .ok_or(NestCrowError::ArithmeticOverflow)?;
    arb.bump = ctx.bumps.arbitration_escrow;

    Ok(())
}

#[derive(Accounts)]
pub struct OpenArbitration<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = token_mint @ NestCrowError::VaultBalanceMismatch,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        init,
        payer = signer,
        space = 8 + ArbitrationEscrow::INIT_SPACE,
        seeds = [b"arb-escrow", escrow_state.lease_id.as_ref()],
        bump,
    )]
    pub arbitration_escrow: Account<'info, ArbitrationEscrow>,

    #[account(
        init,
        payer = signer,
        seeds = [b"arb-vault", escrow_state.lease_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = arbitration_escrow,
    )]
    pub arb_vault: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
