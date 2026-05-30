use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::DepositGuardError;
use crate::state::{EscrowState, EscrowStatus, LeaseConfig};

/// Transfers the full deposit from the tenant's token account into the
/// PDA-owned vault. Both parties must have signed the lease before funding.
/// Status transitions: CREATED → FUNDED.
pub fn handler(ctx: Context<FundEscrow>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    let config = &ctx.accounts.lease_config;

    require!(
        escrow.status == EscrowStatus::Created,
        DepositGuardError::NotCreated
    );
    require!(
        config.landlord_signed && config.tenant_signed,
        DepositGuardError::LeaseNotSigned
    );

    let amount = escrow.deposit_amount;

    let cpi_accounts = Transfer {
        from: ctx.accounts.tenant_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.tenant.to_account_info(),
    };
    token::transfer(CpiContext::new(token::ID, cpi_accounts), amount)?;

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::Funded;

    Ok(())
}

#[derive(Accounts)]
pub struct FundEscrow<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = tenant @ DepositGuardError::NotTenant,
        has_one = token_mint @ DepositGuardError::VaultBalanceMismatch,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        seeds = [b"lease-config", escrow_state.lease_id.as_ref()],
        bump = lease_config.bump,
    )]
    pub lease_config: Account<'info, LeaseConfig>,

    /// Tenant's SPL token account for the deposit mint.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = tenant,
    )]
    pub tenant_token_account: Account<'info, TokenAccount>,

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
