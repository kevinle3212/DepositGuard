use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::{ClaimRecord, EscrowState, EscrowStatus, LeaseConfig};

/// Creates `EscrowState`, `LeaseConfig`, `ClaimRecord` PDAs and the PDA-owned
/// vault token account for a new lease. Status is set to CREATED.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(
    ctx: Context<InitializeEscrow>,
    lease_id: Pubkey,
    tenant: Pubkey,
    deposit_amount: u64,
    deadline_ts: i64,
    jurisdiction_code: [u8; 8],
    dispute_threshold_pct: u8,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow_state;
    escrow.lease_id = lease_id;
    escrow.landlord = ctx.accounts.landlord.key();
    escrow.tenant = tenant;
    escrow.token_mint = ctx.accounts.token_mint.key();
    escrow.deposit_amount = deposit_amount;
    escrow.status = EscrowStatus::Created;
    escrow.deadline_ts = deadline_ts;
    escrow.jurisdiction_code = jurisdiction_code;
    escrow.bump = ctx.bumps.escrow_state;

    let config = &mut ctx.accounts.lease_config;
    config.landlord = ctx.accounts.landlord.key();
    config.tenant = tenant;
    config.token_mint = ctx.accounts.token_mint.key();
    config.deposit_amount = deposit_amount;
    config.dispute_threshold_pct = dispute_threshold_pct;
    config.contract_hash = [0u8; 32];
    config.landlord_signed = false;
    config.tenant_signed = false;
    config.bump = ctx.bumps.lease_config;

    let claim = &mut ctx.accounts.claim_record;
    claim.damage_hashes = Vec::new();
    claim.disputed_total = 0;
    claim.undisputed_total = 0;
    claim.tenant_estimate = 0;
    claim.landlord_estimate = 0;
    claim.tenant_estimate_sealed_ts = 0;
    claim.landlord_estimate_sealed_ts = 0;
    claim.max_fine = 0;
    claim.landlord_photo_hash = [0u8; 32];
    claim.tenant_photo_hash = [0u8; 32];
    claim.landlord_photos_submitted = false;
    claim.tenant_photos_submitted = false;
    claim.tenant_estimate_submitted = false;
    claim.landlord_estimate_submitted = false;
    claim.estimates_revealed = false;
    claim.arbitrator = Pubkey::default();
    claim.oracle = Pubkey::default();
    claim.oracle_fine = 0;
    claim.oracle_fine_posted = false;
    claim.resolved_fine = 0;
    claim.minority_panelist = Pubkey::default();
    claim.minority_ruling_hash = [0u8; 32];
    claim.minority_dissent_flag = false;
    claim.bump = ctx.bumps.claim_record;

    Ok(())
}

#[derive(Accounts)]
#[instruction(lease_id: Pubkey)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub landlord: Signer<'info>,

    /// The USDC (or other SPL token) mint for the deposit.
    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = landlord,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [b"escrow", lease_id.as_ref()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        init,
        payer = landlord,
        space = 8 + LeaseConfig::INIT_SPACE,
        seeds = [b"lease-config", lease_id.as_ref()],
        bump,
    )]
    pub lease_config: Account<'info, LeaseConfig>,

    #[account(
        init,
        payer = landlord,
        space = 8 + ClaimRecord::INIT_SPACE,
        seeds = [b"claim-record", lease_id.as_ref()],
        bump,
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    /// PDA-owned token account that holds the deposit funds.
    #[account(
        init,
        payer = landlord,
        seeds = [b"vault", lease_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
