use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{ClaimRecord, EscrowState, EscrowStatus};

/// Tenant rejects the landlord's proposed deduction and opens a formal dispute.
///
/// The undisputed portion is released to the tenant immediately; the contested
/// remainder stays locked in the vault. The assigned solo `arbitrator` and the
/// fine `oracle` (which relays the Gemini-computed fine) are recorded here.
/// Status transitions: `PENDING_APPROVAL` → DISPUTED.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(ctx: Context<OpenDispute>, arbitrator: Pubkey, oracle: Pubkey) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;

    require!(escrow.status == EscrowStatus::PendingApproval, NestCrowError::NotPendingApproval);
    require!(ctx.accounts.tenant.key() == escrow.tenant, NestCrowError::NotTenant);

    // The contested amount is exactly what the landlord proposed to deduct.
    let disputed = ctx.accounts.claim_record.landlord_estimate;
    let undisputed = ctx.accounts.claim_record.undisputed_total;

    let lease_id = escrow.lease_id;
    let bump = escrow.bump;
    let seeds: &[&[u8]] = &[b"escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    // Release the undisputed portion to the tenant right away.
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

    let claim = &mut ctx.accounts.claim_record;
    claim.disputed_total = disputed;
    claim.arbitrator = arbitrator;
    claim.oracle = oracle;
    // Clear the propose_release estimate so the sealed-estimate phase starts fresh.
    claim.tenant_estimate = 0;
    claim.landlord_estimate = 0;
    claim.tenant_estimate_sealed_ts = 0;
    claim.landlord_estimate_sealed_ts = 0;
    claim.tenant_estimate_submitted = false;
    claim.landlord_estimate_submitted = false;
    claim.estimates_revealed = false;
    claim.max_fine = 0;

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::Disputed;

    Ok(())
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
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

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = tenant,
    )]
    pub tenant_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
