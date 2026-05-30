use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::DepositGuardError;
use crate::state::{ArbitrationEscrow, ArbitrationFeeStatus, EscrowState};

/// The assigned arbitrator claims the fee pool after both parties have paid.
/// Only `arbitration_escrow.arbitrator_pubkey` may call this.
pub fn handler(ctx: Context<ConsumeArbitrationFees>) -> Result<()> {
    let arb = &ctx.accounts.arbitration_escrow;
    require!(
        ctx.accounts.arbitrator.key() == arb.arbitrator_pubkey,
        DepositGuardError::NotArbitrator
    );
    require!(
        arb.status == ArbitrationFeeStatus::BothPaid,
        DepositGuardError::FeesNotBothPaid
    );

    let amount = ctx.accounts.arb_vault.amount;
    let lease_id = arb.lease_id;
    let bump = arb.bump;
    let seeds: &[&[u8]] = &[b"arb-escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    if amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.arb_vault.to_account_info(),
            to: ctx.accounts.arbitrator_token_account.to_account_info(),
            authority: ctx.accounts.arbitration_escrow.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            amount,
        )?;
    }

    let arb = &mut ctx.accounts.arbitration_escrow;
    arb.total = 0;
    arb.status = ArbitrationFeeStatus::Consumed;

    Ok(())
}

#[derive(Accounts)]
pub struct ConsumeArbitrationFees<'info> {
    pub arbitrator: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
        has_one = token_mint @ DepositGuardError::VaultBalanceMismatch,
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
        token::authority = arbitrator,
    )]
    pub arbitrator_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
