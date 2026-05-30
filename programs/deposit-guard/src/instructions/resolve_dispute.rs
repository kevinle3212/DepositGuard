use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::DepositGuardError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Solo arbitrator resolves the dispute. `fine_amount` is the damages charged to
/// the tenant (paid to the landlord); the remaining disputed funds go to the
/// tenant. The fine is hard-capped on-chain at `max_fine` regardless of any
/// off-chain (Gemini/oracle) recommendation.
/// Status transitions: DISPUTED → RESOLVED.
pub fn handler(ctx: Context<ResolveDispute>, fine_amount: u64) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(
        escrow.status == EscrowStatus::Disputed,
        DepositGuardError::NotDisputed
    );

    let claim = &ctx.accounts.claim_record;
    require!(
        ctx.accounts.arbitrator.key() == claim.arbitrator,
        DepositGuardError::NotArbitrator
    );
    require!(
        claim.estimates_revealed,
        DepositGuardError::EstimatesNotRevealed
    );
    require!(
        fine_amount <= claim.max_fine,
        DepositGuardError::FineExceedsMaxFine
    );
    require!(
        fine_amount <= claim.disputed_total,
        DepositGuardError::FineExceedsDisputed
    );

    let to_tenant = claim
        .disputed_total
        .checked_sub(fine_amount)
        .ok_or(DepositGuardError::ArithmeticOverflow)?;

    let lease_id = escrow.lease_id;
    let bump = escrow.bump;
    let seeds: &[&[u8]] = &[b"escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    // Fine (damages) → landlord.
    if fine_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.landlord_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            fine_amount,
        )?;
    }

    // Remaining disputed funds → tenant.
    if to_tenant > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.tenant_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            to_tenant,
        )?;
    }

    let claim = &mut ctx.accounts.claim_record;
    claim.resolved_fine = fine_amount;

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::Resolved;

    Ok(())
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    pub arbitrator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = token_mint @ DepositGuardError::VaultBalanceMismatch,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
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

    /// CHECK: tenant token account; validated by mint and escrow tenant address.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = tenant,
    )]
    pub tenant_token_account: Account<'info, TokenAccount>,

    /// CHECK: tenant pubkey validated against escrow_state.
    #[account(address = escrow_state.tenant @ DepositGuardError::NotTenant)]
    pub tenant: UncheckedAccount<'info>,

    /// CHECK: landlord token account; validated by mint and escrow landlord address.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = landlord,
    )]
    pub landlord_token_account: Account<'info, TokenAccount>,

    /// CHECK: landlord pubkey validated against escrow_state.
    #[account(address = escrow_state.landlord @ DepositGuardError::NotLandlord)]
    pub landlord: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
