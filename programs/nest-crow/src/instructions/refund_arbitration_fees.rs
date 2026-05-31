use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{ArbitrationEscrow, ArbitrationFeeStatus, EscrowState, PANEL_UPGRADE_FEE_USDC};

/// Returns every fee a party actually paid (base $50 + optional $25 panel) back
/// to that party. Used when the dispute resolves before the arbitrator is
/// assigned, or when only one party paid within the 72-hour window
/// (one-party default). Permissionless relayer call; funds only ever return to
/// the original payers.
pub fn handler(ctx: Context<RefundArbitrationFees>) -> Result<()> {
    let arb = &ctx.accounts.arbitration_escrow;
    require!(
        arb.status == ArbitrationFeeStatus::AwaitingPayment
            || arb.status == ArbitrationFeeStatus::BothPaid,
        NestCrowError::FeesAlreadyFinalized
    );

    let landlord_refund =
        fee_total(arb.landlord_paid, arb.landlord_fee_amount, arb.landlord_panel_paid)?;
    let tenant_refund = fee_total(arb.tenant_paid, arb.tenant_fee_amount, arb.tenant_panel_paid)?;

    let lease_id = arb.lease_id;
    let bump = arb.bump;
    let seeds: &[&[u8]] = &[b"arb-escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    if landlord_refund > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.arb_vault.to_account_info(),
            to: ctx.accounts.landlord_token_account.to_account_info(),
            authority: ctx.accounts.arbitration_escrow.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            landlord_refund,
        )?;
    }

    if tenant_refund > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.arb_vault.to_account_info(),
            to: ctx.accounts.tenant_token_account.to_account_info(),
            authority: ctx.accounts.arbitration_escrow.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            tenant_refund,
        )?;
    }

    let arb = &mut ctx.accounts.arbitration_escrow;
    arb.total = 0;
    arb.status = ArbitrationFeeStatus::Refunded;

    Ok(())
}

/// Sum of the base fee (if paid) and the panel-upgrade fee (if paid).
fn fee_total(base_paid: bool, base_amount: u64, panel_paid: bool) -> Result<u64> {
    let mut total = if base_paid { base_amount } else { 0 };
    if panel_paid {
        total =
            total.checked_add(PANEL_UPGRADE_FEE_USDC).ok_or(NestCrowError::ArithmeticOverflow)?;
    }
    Ok(total)
}

#[derive(Accounts)]
pub struct RefundArbitrationFees<'info> {
    /// Permissionless (typically the relayer); refunds only go to the payers.
    pub caller: Signer<'info>,

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
    pub arbitration_escrow: Box<Account<'info, ArbitrationEscrow>>,

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
        token::authority = landlord,
    )]
    pub landlord_token_account: Account<'info, TokenAccount>,

    /// CHECK: landlord pubkey validated against escrow_state.
    #[account(address = escrow_state.landlord @ NestCrowError::NotLandlord)]
    pub landlord: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = tenant,
    )]
    pub tenant_token_account: Account<'info, TokenAccount>,

    /// CHECK: tenant pubkey validated against escrow_state.
    #[account(address = escrow_state.tenant @ NestCrowError::NotTenant)]
    pub tenant: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
