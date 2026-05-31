use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{
    ArbitrationEscrow, ArbitrationFeeStatus, ArbitrationPanel, ClaimRecord, EscrowState,
    EscrowStatus, PanelOutcome, PANEL_DISSENT_THRESHOLD_PCT, PANEL_ESCALATION_WINDOW_SECS,
};

/// Reconciles the three panel rulings and executes the adopted outcome:
///   Case A — unanimous: all three fines agree.
///   Case B — 2-1 majority: the majority fine is adopted; if the minority's
///            dissent exceeds 20% of the majority fine, it is flagged and the
///            dissenting panelist + reasoning hash are recorded permanently.
///   Case C — three-way split: the median fine is adopted.
/// The adopted fine is hard-capped at `max_fine` and at the disputed balance.
/// Disputed funds are paid out (fine → recipient, remainder → the other party),
/// the fee pool is marked consumed, and a 14-day escalation window opens.
/// Status transitions: DISPUTED → RESOLVED.
pub fn handler(ctx: Context<ResolveDisputePanel>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(
        escrow.status == EscrowStatus::Disputed,
        NestCrowError::NotDisputed
    );

    {
        let panel = &ctx.accounts.arbitration_panel;
        require!(!panel.resolved, NestCrowError::PanelAlreadyResolved);
        require!(
            panel.rulings.iter().all(|r| r.submitted),
            NestCrowError::PanelNotComplete
        );
    }
    require!(
        ctx.accounts.claim_record.estimates_revealed,
        NestCrowError::EstimatesNotRevealed
    );

    // The panel track must have been funded (both upgrade fees paid).
    require!(
        matches!(
            ctx.accounts.arbitration_escrow.status,
            ArbitrationFeeStatus::BothPaid | ArbitrationFeeStatus::Consumed
        ),
        NestCrowError::FeesNotBothPaid
    );

    let fines = [
        ctx.accounts.arbitration_panel.rulings[0].fine_amount,
        ctx.accounts.arbitration_panel.rulings[1].fine_amount,
        ctx.accounts.arbitration_panel.rulings[2].fine_amount,
    ];

    // Reconcile the three rulings into an adopted ruling.
    let decision = reconcile(&fines);
    let adopted_idx = decision.adopted_idx;
    let adopted_fine = fines[adopted_idx];
    let adopted_recipient = ctx.accounts.arbitration_panel.rulings[adopted_idx].recipient;

    let claim = &ctx.accounts.claim_record;
    require!(
        adopted_fine <= claim.max_fine,
        NestCrowError::FineExceedsMaxFine
    );
    require!(
        adopted_fine <= claim.disputed_total,
        NestCrowError::FineExceedsDisputed
    );
    let disputed_total = claim.disputed_total;
    let to_other = disputed_total
        .checked_sub(adopted_fine)
        .ok_or(NestCrowError::ArithmeticOverflow)?;

    // Minority-protection: in a 2-1 majority, evaluate the dissent magnitude.
    let mut dissent_flag = false;
    let mut minority_panelist = Pubkey::default();
    let mut minority_hash = [0u8; 32];
    if let Some(minority_idx) = decision.minority_idx {
        let minority_fine = fines[minority_idx];
        minority_panelist = ctx.accounts.arbitration_panel.rulings[minority_idx].panelist;
        minority_hash = ctx.accounts.arbitration_panel.rulings[minority_idx].ruling_hash;
        dissent_flag = dissent_exceeds_threshold(adopted_fine, minority_fine)?;
    }

    // Execute the payout from the disputed vault.
    let escrow = &ctx.accounts.escrow_state;
    let lease_id = escrow.lease_id;
    let bump = escrow.bump;
    let seeds: &[&[u8]] = &[b"escrow", lease_id.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    let recipient_is_landlord = adopted_recipient == escrow.landlord;
    require!(
        recipient_is_landlord || adopted_recipient == escrow.tenant,
        NestCrowError::InvalidRecipient
    );

    let (fine_to, remainder_to) = if recipient_is_landlord {
        (
            ctx.accounts.landlord_token_account.to_account_info(),
            ctx.accounts.tenant_token_account.to_account_info(),
        )
    } else {
        (
            ctx.accounts.tenant_token_account.to_account_info(),
            ctx.accounts.landlord_token_account.to_account_info(),
        )
    };

    if adopted_fine > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: fine_to,
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            adopted_fine,
        )?;
    }
    if to_other > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: remainder_to,
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token::ID, cpi_accounts, signer_seeds),
            to_other,
        )?;
    }

    let now = Clock::get()?.unix_timestamp;

    // Record the panel outcome.
    let panel = &mut ctx.accounts.arbitration_panel;
    panel.outcome = decision.outcome;
    panel.adopted_fine = adopted_fine;
    panel.adopted_recipient = adopted_recipient;
    panel.minority_dissent_flag = dissent_flag;
    panel.escalation_deadline_ts = now
        .checked_add(PANEL_ESCALATION_WINDOW_SECS)
        .ok_or(NestCrowError::ArithmeticOverflow)?;
    panel.resolved = true;

    // Persist minority protection on the immutable claim record.
    let claim = &mut ctx.accounts.claim_record;
    claim.resolved_fine = adopted_fine;
    claim.minority_panelist = minority_panelist;
    claim.minority_ruling_hash = minority_hash;
    claim.minority_dissent_flag = dissent_flag;

    // Mark the fee pool consumed (panelist compensation is claimed via
    // consume_arbitration_fees).
    let arb = &mut ctx.accounts.arbitration_escrow;
    arb.status = ArbitrationFeeStatus::Consumed;

    let escrow = &mut ctx.accounts.escrow_state;
    escrow.status = EscrowStatus::Resolved;

    Ok(())
}

/// Result of reconciling three ruling fines.
struct Decision {
    outcome: PanelOutcome,
    /// Index of the ruling whose fine/recipient is adopted.
    adopted_idx: usize,
    /// Index of the dissenting ruling in a 2-1 majority, if any.
    minority_idx: Option<usize>,
}

/// Classifies three fines as unanimous (Case A), 2-1 majority (Case B), or
/// three-way split adopting the median (Case C).
fn reconcile(fines: &[u64; 3]) -> Decision {
    if fines[0] == fines[1] && fines[1] == fines[2] {
        Decision {
            outcome: PanelOutcome::Unanimous,
            adopted_idx: 0,
            minority_idx: None,
        }
    } else if fines[0] == fines[1] {
        Decision {
            outcome: PanelOutcome::Majority,
            adopted_idx: 0,
            minority_idx: Some(2),
        }
    } else if fines[0] == fines[2] {
        Decision {
            outcome: PanelOutcome::Majority,
            adopted_idx: 0,
            minority_idx: Some(1),
        }
    } else if fines[1] == fines[2] {
        Decision {
            outcome: PanelOutcome::Majority,
            adopted_idx: 1,
            minority_idx: Some(0),
        }
    } else {
        // All distinct: adopt the median.
        let mut idx = [0usize, 1, 2];
        idx.sort_by_key(|&i| fines[i]);
        Decision {
            outcome: PanelOutcome::Median,
            adopted_idx: idx[1],
            minority_idx: None,
        }
    }
}

/// True when |minority - majority| exceeds `PANEL_DISSENT_THRESHOLD_PCT`% of the
/// majority fine. A nonzero dissent against a zero majority always exceeds it.
fn dissent_exceeds_threshold(majority_fine: u64, minority_fine: u64) -> Result<bool> {
    let diff = majority_fine.abs_diff(minority_fine);
    if majority_fine == 0 {
        return Ok(diff > 0);
    }
    let lhs = (diff as u128)
        .checked_mul(100)
        .ok_or(NestCrowError::ArithmeticOverflow)?;
    let rhs = (majority_fine as u128)
        .checked_mul(PANEL_DISSENT_THRESHOLD_PCT as u128)
        .ok_or(NestCrowError::ArithmeticOverflow)?;
    Ok(lhs > rhs)
}

#[derive(Accounts)]
pub struct ResolveDisputePanel<'info> {
    /// Permissionless; the outcome is a deterministic function of the rulings.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
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
        seeds = [b"arb-panel", escrow_state.lease_id.as_ref()],
        bump = arbitration_panel.bump,
    )]
    pub arbitration_panel: Box<Account<'info, ArbitrationPanel>>,

    #[account(
        mut,
        seeds = [b"arb-escrow", escrow_state.lease_id.as_ref()],
        bump = arbitration_escrow.bump,
    )]
    pub arbitration_escrow: Box<Account<'info, ArbitrationEscrow>>,

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
