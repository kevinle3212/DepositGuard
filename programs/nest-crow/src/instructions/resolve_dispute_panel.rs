use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::NestCrowError;
use crate::state::{
    ArbitrationEscrow, ArbitrationFeeStatus, ArbitrationPanel, ClaimRecord, EscrowState,
    EscrowStatus, PanelOutcome, PANEL_DISSENT_THRESHOLD_PCT, PANEL_ESCALATION_WINDOW_SECS,
};

/// Reconciles the three panel rulings and executes the adopted outcome.
///
/// Case A — unanimous: all three fines agree.
/// Case B — 2-1 majority: the majority fine is adopted; if the minority's
/// dissent exceeds 20% of the majority fine, it is flagged and the
/// dissenting panelist + reasoning hash are recorded permanently.
/// Case C — three-way split: the median fine is adopted.
/// The adopted fine is hard-capped at `max_fine` and at the disputed balance.
/// Disputed funds are paid out (fine → recipient, remainder → the other party),
/// the fee pool is marked consumed, and a 14-day escalation window opens.
/// Status transitions: DISPUTED → RESOLVED.
/// # Errors
///
/// Returns a [`ProgramError`] if accounts, authorization, or state checks fail.
pub fn handler(mut ctx: Context<ResolveDisputePanel>) -> Result<()> {
    validate_ready(&ctx)?;
    let fines = collect_panel_fines(&ctx.accounts.arbitration_panel)?;
    let decision = reconcile(&fines);
    let adopted = adopted_ruling(&ctx.accounts.arbitration_panel, &fines, &decision)?;
    validate_fine(&ctx.accounts.claim_record, adopted.fine)?;
    let minority = minority_dissent(&ctx.accounts.arbitration_panel, &fines, &decision)?;
    let to_other = payout_remainder(&ctx.accounts.claim_record, adopted.fine)?;
    execute_payout(&ctx, adopted.recipient, adopted.fine, to_other)?;
    record_resolution(&mut ctx, decision, adopted, minority)?;
    Ok(())
}

fn validate_ready(ctx: &Context<ResolveDisputePanel>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    require!(escrow.status == EscrowStatus::Disputed, NestCrowError::NotDisputed);

    {
        let panel = &ctx.accounts.arbitration_panel;
        require!(!panel.resolved, NestCrowError::PanelAlreadyResolved);
        require!(panel.rulings.iter().all(|r| r.submitted), NestCrowError::PanelNotComplete);
    }
    require!(ctx.accounts.claim_record.estimates_revealed, NestCrowError::EstimatesNotRevealed);
    require!(
        matches!(
            ctx.accounts.arbitration_escrow.status,
            ArbitrationFeeStatus::BothPaid | ArbitrationFeeStatus::Consumed
        ),
        NestCrowError::FeesNotBothPaid
    );
    Ok(())
}

fn collect_panel_fines(panel: &ArbitrationPanel) -> Result<[u64; 3]> {
    let mut fines = [0u64; 3];
    for (i, slot) in fines.iter_mut().enumerate() {
        *slot =
            panel.rulings.get(i).map(|r| r.fine_amount).ok_or(NestCrowError::ArithmeticOverflow)?;
    }
    Ok(fines)
}

struct AdoptedRuling {
    fine: u64,
    recipient: Pubkey,
}

fn adopted_ruling(
    panel: &ArbitrationPanel,
    fines: &[u64; 3],
    decision: &Decision,
) -> Result<AdoptedRuling> {
    let fine = fines.get(decision.adopted_idx).copied().ok_or(NestCrowError::ArithmeticOverflow)?;
    let recipient = panel
        .rulings
        .get(decision.adopted_idx)
        .map(|r| r.recipient)
        .ok_or(NestCrowError::ArithmeticOverflow)?;
    Ok(AdoptedRuling { fine, recipient })
}

fn validate_fine(claim: &ClaimRecord, adopted_fine: u64) -> Result<()> {
    require!(adopted_fine <= claim.max_fine, NestCrowError::FineExceedsMaxFine);
    require!(adopted_fine <= claim.disputed_total, NestCrowError::FineExceedsDisputed);
    Ok(())
}

struct MinorityDissent {
    flag: bool,
    panelist: Pubkey,
    hash: [u8; 32],
}

fn minority_dissent(
    panel: &ArbitrationPanel,
    fines: &[u64; 3],
    decision: &Decision,
) -> Result<MinorityDissent> {
    let mut dissent = MinorityDissent { flag: false, panelist: Pubkey::default(), hash: [0u8; 32] };
    let Some(minority_idx) = decision.minority_idx else {
        return Ok(dissent);
    };
    let minority_fine =
        fines.get(minority_idx).copied().ok_or(NestCrowError::ArithmeticOverflow)?;
    let ruling = panel.rulings.get(minority_idx).ok_or(NestCrowError::ArithmeticOverflow)?;
    dissent.panelist = ruling.panelist;
    dissent.hash = ruling.ruling_hash;
    let adopted_fine =
        fines.get(decision.adopted_idx).copied().ok_or(NestCrowError::ArithmeticOverflow)?;
    dissent.flag = dissent_exceeds_threshold(adopted_fine, minority_fine)?;
    Ok(dissent)
}

fn payout_remainder(claim: &ClaimRecord, adopted_fine: u64) -> Result<u64> {
    claim
        .disputed_total
        .checked_sub(adopted_fine)
        .ok_or_else(|| NestCrowError::ArithmeticOverflow.into())
}

fn execute_payout(
    ctx: &Context<ResolveDisputePanel>,
    adopted_recipient: Pubkey,
    adopted_fine: u64,
    to_other: u64,
) -> Result<()> {
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
    Ok(())
}

fn record_resolution(
    ctx: &mut Context<ResolveDisputePanel>,
    decision: Decision,
    adopted: AdoptedRuling,
    minority: MinorityDissent,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let panel = &mut ctx.accounts.arbitration_panel;
    panel.outcome = decision.outcome;
    panel.adopted_fine = adopted.fine;
    panel.adopted_recipient = adopted.recipient;
    panel.minority_dissent_flag = minority.flag;
    panel.escalation_deadline_ts =
        now.checked_add(PANEL_ESCALATION_WINDOW_SECS).ok_or(NestCrowError::ArithmeticOverflow)?;
    panel.resolved = true;

    let claim = &mut ctx.accounts.claim_record;
    claim.resolved_fine = adopted.fine;
    claim.minority_panelist = minority.panelist;
    claim.minority_ruling_hash = minority.hash;
    claim.minority_dissent_flag = minority.flag;

    ctx.accounts.arbitration_escrow.status = ArbitrationFeeStatus::Consumed;
    ctx.accounts.escrow_state.status = EscrowStatus::Resolved;
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
    let &[a, b, c] = fines;
    if a == b && b == c {
        Decision { outcome: PanelOutcome::Unanimous, adopted_idx: 0, minority_idx: None }
    } else if a == b {
        Decision { outcome: PanelOutcome::Majority, adopted_idx: 0, minority_idx: Some(2) }
    } else if a == c {
        Decision { outcome: PanelOutcome::Majority, adopted_idx: 0, minority_idx: Some(1) }
    } else if b == c {
        Decision { outcome: PanelOutcome::Majority, adopted_idx: 1, minority_idx: Some(0) }
    } else {
        // All distinct: adopt the median.
        let mut idx = [0usize, 1, 2];
        idx.sort_by_key(|&i| fines.get(i).copied().unwrap_or(0));
        let [_, median_idx, _] = idx;
        Decision { outcome: PanelOutcome::Median, adopted_idx: median_idx, minority_idx: None }
    }
}

/// True when |minority - majority| exceeds `PANEL_DISSENT_THRESHOLD_PCT`% of the
/// majority fine. A nonzero dissent against a zero majority always exceeds it.
fn dissent_exceeds_threshold(majority_fine: u64, minority_fine: u64) -> Result<bool> {
    let diff = majority_fine.abs_diff(minority_fine);
    if majority_fine == 0 {
        return Ok(diff > 0);
    }
    let lhs = u128::from(diff).checked_mul(100).ok_or(NestCrowError::ArithmeticOverflow)?;
    let rhs = u128::from(majority_fine)
        .checked_mul(u128::from(PANEL_DISSENT_THRESHOLD_PCT))
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
    pub escrow_state: Box<Account<'info, EscrowState>>,

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
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = landlord,
    )]
    pub landlord_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: landlord pubkey validated against `escrow_state`.
    #[account(address = escrow_state.landlord @ NestCrowError::NotLandlord)]
    pub landlord: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = tenant,
    )]
    pub tenant_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: tenant pubkey validated against `escrow_state`.
    #[account(address = escrow_state.tenant @ NestCrowError::NotTenant)]
    pub tenant: UncheckedAccount<'info>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
