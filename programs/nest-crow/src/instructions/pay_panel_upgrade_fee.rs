use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{ArbitrationEscrow, ArbitrationFeeStatus, EscrowState, PANEL_UPGRADE_FEE_USDC};

/// A party pays the optional $25 USDC panel-upgrade fee. Both parties must pay to
/// activate the three-arbitrator panel track. The party must have paid its base
/// arbitration fee first.
pub fn handler(ctx: Context<PayPanelUpgradeFee>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    let signer = ctx.accounts.payer.key();
    let is_landlord = signer == escrow.landlord;
    let is_tenant = signer == escrow.tenant;
    require!(is_landlord || is_tenant, NestCrowError::NotParty);

    let arb = &ctx.accounts.arbitration_escrow;
    require!(
        arb.status == ArbitrationFeeStatus::AwaitingPayment
            || arb.status == ArbitrationFeeStatus::BothPaid,
        NestCrowError::FeesAlreadyFinalized
    );

    if is_landlord {
        require!(arb.landlord_paid, NestCrowError::BaseFeeNotPaid);
        require!(!arb.landlord_panel_paid, NestCrowError::PanelFeeAlreadyPaid);
    } else {
        require!(arb.tenant_paid, NestCrowError::BaseFeeNotPaid);
        require!(!arb.tenant_panel_paid, NestCrowError::PanelFeeAlreadyPaid);
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.arb_vault.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    token::transfer(CpiContext::new(token::ID, cpi_accounts), PANEL_UPGRADE_FEE_USDC)?;

    let arb = &mut ctx.accounts.arbitration_escrow;
    if is_landlord {
        arb.landlord_panel_paid = true;
    } else {
        arb.tenant_panel_paid = true;
    }
    arb.total =
        arb.total.checked_add(PANEL_UPGRADE_FEE_USDC).ok_or(NestCrowError::ArithmeticOverflow)?;
    if arb.landlord_panel_paid && arb.tenant_panel_paid {
        arb.panel_upgrade_paid = true;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct PayPanelUpgradeFee<'info> {
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
