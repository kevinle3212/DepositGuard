use anchor_lang::prelude::*;

/// After a panel ruling, parties have 14 days to escalate (e.g., to court).
pub const PANEL_ESCALATION_WINDOW_SECS: i64 = 14 * 24 * 60 * 60;
/// Minority dissent above this percentage (relative to the majority fine) is flagged
/// and recorded permanently for minority protection.
pub const PANEL_DISSENT_THRESHOLD_PCT: u64 = 20;

/// How the three rulings were reconciled into the adopted fine.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum PanelOutcome {
    /// Not yet resolved.
    Pending,
    /// Case A — all three rulings agree on the fine amount.
    Unanimous,
    /// Case B — two rulings agree; one dissents.
    Majority,
    /// Case C — all three differ; the median fine is adopted.
    Median,
}

/// A single panelist's sealed ruling.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug, Default)]
pub struct PanelRuling {
    /// Panelist who authored this ruling.
    pub panelist: Pubkey,
    /// Proposed fine amount (token base units).
    pub fine_amount: u64,
    /// Party who should receive the adopted fine (landlord or tenant).
    pub recipient: Pubkey,
    /// SHA-256 hash of the written reasoning backing this ruling.
    pub ruling_hash: [u8; 32],
    /// Unix timestamp the ruling was submitted.
    pub submitted_ts: i64,
    /// True once this slot holds a submitted ruling.
    pub submitted: bool,
}

/// Three-arbitrator panel for a disputed lease.
/// PDA seeds: ["arb-panel", lease_id].
#[account]
#[derive(InitSpace)]
pub struct ArbitrationPanel {
    /// Lease this panel adjudicates (PDA seed).
    pub lease_id: Pubkey,
    /// The three panel members.
    pub panelists: [Pubkey; 3],
    /// Each panelist's sealed ruling (parallel to `panelists`).
    pub rulings: [PanelRuling; 3],
    /// Reconciliation outcome once resolved.
    pub outcome: PanelOutcome,
    /// Fine amount adopted by the panel (always `<= ClaimRecord.max_fine`).
    pub adopted_fine: u64,
    /// Party who received the adopted fine.
    pub adopted_recipient: Pubkey,
    /// True when a 2-1 majority's dissent exceeded `PANEL_DISSENT_THRESHOLD_PCT`.
    pub minority_dissent_flag: bool,
    /// Unix timestamp until which the ruling may be escalated. Set at resolution.
    pub escalation_deadline_ts: i64,
    /// True once `resolve_dispute_panel` has executed.
    pub resolved: bool,
    /// PDA bump seed.
    pub bump: u8,
}
