use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount};

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus, LeaseConfig};

/// Closes all PDA accounts and the vault token account, reclaiming rent
/// back to the landlord. May only be called after all funds are disbursed
/// (status = RELEASED or RESOLVED).
pub fn handler(ctx: Context<CloseEscrow>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;

    require!(
        escrow.status == EscrowStatus::Released || escrow.status == EscrowStatus::Resolved,
        NestCrowError::NotFinalStatus
    );
    require!(ctx.accounts.vault.amount == 0, NestCrowError::VaultNotEmpty);

    let lease_id = escrow.lease_id;
    let bump = escrow.bump;

    let seeds: &[&[u8]] = &[b"escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    // Close the vault token account; rent goes to landlord.
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.landlord.to_account_info(),
        authority: ctx.accounts.escrow_state.to_account_info(),
    };
    token::close_account(CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds))?;

    // Anchor's `close = landlord` constraint on the PDA accounts handles
    // zeroing data and transferring remaining lamports.

    Ok(())
}

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    #[account(mut)]
    pub landlord: Signer<'info>,

    #[account(
        mut,
        close = landlord,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = landlord @ NestCrowError::NotLandlord,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        close = landlord,
        seeds = [b"lease-config", escrow_state.lease_id.as_ref()],
        bump = lease_config.bump,
    )]
    pub lease_config: Account<'info, LeaseConfig>,

    #[account(
        mut,
        close = landlord,
        seeds = [b"claim-record", escrow_state.lease_id.as_ref()],
        bump = claim_record.bump,
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.lease_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
