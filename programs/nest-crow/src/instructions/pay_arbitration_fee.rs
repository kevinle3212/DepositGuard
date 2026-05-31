use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{ArbitrationEscrow, ArbitrationFeeStatus, EscrowState};

/// A party pays its fixed $50 USDC arbitration fee into the fee vault.
///
/// Must be paid within the 72-hour window. Once both parties have paid, the pool
/// moves to `BothPaid` and can be consumed by the assigned arbitrator.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(ctx: Context<PayArbitrationFee>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    let signer = ctx.accounts.payer.key();
    let is_landlord = signer == escrow.landlord;
    let is_tenant = signer == escrow.tenant;
    require!(is_landlord || is_tenant, NestCrowError::NotParty);

    let arb = &ctx.accounts.arbitration_escrow;
    require!(
        arb.status == ArbitrationFeeStatus::AwaitingPayment,
        NestCrowError::FeesAlreadyFinalized
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now <= arb.payment_deadline_ts, NestCrowError::FeeDeadlinePassed);

    let amount = if is_landlord {
        require!(!arb.landlord_paid, NestCrowError::FeeAlreadyPaid);
        arb.landlord_fee_amount
    } else {
        require!(!arb.tenant_paid, NestCrowError::FeeAlreadyPaid);
        arb.tenant_fee_amount
    };

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.arb_vault.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    token::transfer(CpiContext::new(token::ID, cpi_accounts), amount)?;

    let arb = &mut ctx.accounts.arbitration_escrow;
    if is_landlord {
        arb.landlord_paid = true;
    } else {
        arb.tenant_paid = true;
    }
    arb.total = arb.total.checked_add(amount).ok_or(NestCrowError::ArithmeticOverflow)?;
    if arb.landlord_paid && arb.tenant_paid {
        arb.status = ArbitrationFeeStatus::BothPaid;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct PayArbitrationFee<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = token_mint @ NestCrowError::VaultBalanceMismatch,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"arb-escrow", escrow_state.lease_id.as_ref()],
        bump = arbitration_escrow.bump,
    )]
    pub arbitration_escrow: Account<'info, ArbitrationEscrow>,

    #[account(
        mut,
        seeds = [b"arb-vault", escrow_state.lease_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = arbitration_escrow,
    )]
    pub arb_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = payer,
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
