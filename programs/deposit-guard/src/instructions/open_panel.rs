use anchor_lang::prelude::*;

use crate::errors::DepositGuardError;
use crate::state::{
    ArbitrationEscrow, ArbitrationPanel, EscrowState, EscrowStatus, PanelOutcome, PanelRuling,
};

/// Creates the three-arbitrator panel for a disputed lease. Requires that both
/// parties have paid the panel-upgrade fee. Callable by either party.
pub fn handler(ctx: Context<OpenPanel>, panelists: [Pubkey; 3]) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(
        escrow.status == EscrowStatus::Disputed,
        DepositGuardError::NotDisputed
    );

    let signer = ctx.accounts.signer.key();
    require!(
        signer == escrow.landlord || signer == escrow.tenant,
        DepositGuardError::NotParty
    );

    require!(
        ctx.accounts.arbitration_escrow.panel_upgrade_paid,
        DepositGuardError::PanelUpgradeNotPaid
    );

    let panel = &mut ctx.accounts.arbitration_panel;
    panel.lease_id = escrow.lease_id;
    panel.panelists = panelists;
    panel.rulings = [
        PanelRuling::default(),
        PanelRuling::default(),
        PanelRuling::default(),
    ];
    panel.outcome = PanelOutcome::Pending;
    panel.adopted_fine = 0;
    panel.adopted_recipient = Pubkey::default();
    panel.minority_dissent_flag = false;
    panel.escalation_deadline_ts = 0;
    panel.resolved = false;
    panel.bump = ctx.bumps.arbitration_panel;

    Ok(())
}

#[derive(Accounts)]
pub struct OpenPanel<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        seeds = [b"arb-escrow", escrow_state.lease_id.as_ref()],
        bump = arbitration_escrow.bump,
    )]
    pub arbitration_escrow: Account<'info, ArbitrationEscrow>,

    #[account(
        init,
        payer = signer,
        space = 8 + ArbitrationPanel::INIT_SPACE,
        seeds = [b"arb-panel", escrow_state.lease_id.as_ref()],
        bump,
    )]
    pub arbitration_panel: Box<Account<'info, ArbitrationPanel>>,

    pub system_program: Program<'info, System>,
}
