use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{ArbitrationPanel, EscrowState};

/// A panelist submits a sealed ruling.
///
/// Includes a fine amount, the intended recipient, and the SHA-256 hash of their
/// written reasoning. Each panelist may submit exactly once; rulings cannot be
/// added after the panel has resolved.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(
    ctx: Context<SubmitPanelRuling>,
    fine_amount: u64,
    recipient: Pubkey,
    ruling_hash: [u8; 32],
) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(
        recipient == escrow.landlord || recipient == escrow.tenant,
        NestCrowError::InvalidRecipient
    );

    let panelist = ctx.accounts.panelist.key();
    let panel = &mut ctx.accounts.arbitration_panel;
    require!(!panel.resolved, NestCrowError::PanelAlreadyResolved);

    // Locate this signer's panel slot.
    let idx =
        panel.panelists.iter().position(|p| *p == panelist).ok_or(NestCrowError::NotPanelist)?;

    let ruling = panel.rulings.get_mut(idx).ok_or(NestCrowError::ArithmeticOverflow)?;
    require!(!ruling.submitted, NestCrowError::RulingAlreadySubmitted);
    ruling.panelist = panelist;
    ruling.fine_amount = fine_amount;
    ruling.recipient = recipient;
    ruling.ruling_hash = ruling_hash;
    ruling.submitted_ts = Clock::get()?.unix_timestamp;
    ruling.submitted = true;

    Ok(())
}

#[derive(Accounts)]
pub struct SubmitPanelRuling<'info> {
    #[account(mut)]
    pub panelist: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"arb-panel", escrow_state.lease_id.as_ref()],
        bump = arbitration_panel.bump,
    )]
    pub arbitration_panel: Box<Account<'info, ArbitrationPanel>>,

    pub system_program: Program<'info, System>,
}
