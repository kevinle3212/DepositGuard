use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Tenant approves the landlord's proposed deduction split.
/// Releases the undisputed amount to the tenant and the deduction to the landlord.
/// Status transitions: PENDING_APPROVAL → RELEASED.
pub fn handler(ctx: Context<ApproveRelease>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;

    require!(escrow.status == EscrowStatus::PendingApproval, NestCrowError::NotPendingApproval);
    require!(ctx.accounts.tenant.key() == escrow.tenant, NestCrowError::NotTenant);

    let undisputed = ctx.accounts.claim_record.undisputed_total;
    let deduction = ctx.accounts.claim_record.landlord_estimate;
    let lease_id = escrow.lease_id;
    let bump = escrow.bump;

    let seeds: &[&[u8]] = &[b"escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    // Transfer undisputed portion to tenant.
    if undisputed > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.tenant_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            undisputed,
        )?;
    }

    // Transfer deduction to landlord.
    if deduction > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.landlord_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            deduction,
        )?;
    }

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::Released;

    Ok(())
}

#[derive(Accounts)]
pub struct ApproveRelease<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = tenant @ NestCrowError::NotTenant,
        has_one = token_mint @ NestCrowError::VaultBalanceMismatch,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    /// Boxed to keep the instruction's stack frame within the 4096-byte limit.
    #[account(
        seeds = [b"claim-record", escrow_state.lease_id.as_ref()],
        bump = claim_record.bump,
    )]
    pub claim_record: Box<Account<'info, ClaimRecord>>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.lease_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Tenant's token account to receive undisputed funds.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = tenant,
    )]
    pub tenant_token_account: Account<'info, TokenAccount>,

    /// CHECK: Landlord's token account; validated via escrow_state.landlord constraint.
    #[account(
        mut,
        token::mint = token_mint,
    )]
    pub landlord_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
