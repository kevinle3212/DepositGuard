use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{EscrowState, EscrowStatus};

/// Relayer calls this after `deadline_ts` has passed.
/// Releases the full remaining vault balance to the tenant.
/// Status transitions: ACTIVE or PENDING_APPROVAL → RELEASED.
pub fn handler(ctx: Context<ClaimTimeout>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;

    require!(
        escrow.status == EscrowStatus::Active
            || escrow.status == EscrowStatus::PendingApproval,
        NestCrowError::InvalidStatusTransition
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now >= escrow.deadline_ts, NestCrowError::DeadlineNotPassed);

    let vault_balance = ctx.accounts.vault.amount;
    let lease_id = escrow.lease_id;
    let bump = escrow.bump;

    let seeds: &[&[u8]] = &[b"escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    if vault_balance > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.tenant_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            vault_balance,
        )?;
    }

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::Released;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimTimeout<'info> {
    /// Any signer may call this (the relayer). No role restriction — the
    /// deadline check on-chain is the only guard.
    #[account(mut)]
    pub relayer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = token_mint @ NestCrowError::VaultBalanceMismatch,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.lease_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Tenant's token account to receive the full remaining balance.
    #[account(
        mut,
        token::mint = token_mint,
    )]
    pub tenant_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
