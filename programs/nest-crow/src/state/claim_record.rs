use anchor_lang::prelude::*;

/// Damage and photo record for a lease.
/// Populated across move-in, move-out, and dispute phases.
/// PDA seeds: ["claim-record", `lease_id`]
#[account]
#[derive(InitSpace)]
#[allow(clippy::struct_excessive_bools)] // flat flags required for Anchor account layout
pub struct ClaimRecord {
    /// SHA-256 hashes of itemized damage evidence (max 20 items).
    #[max_len(20)]
    pub damage_hashes: Vec<[u8; 32]>,
    /// Amount of the deposit that is disputed (locked in PDA during dispute).
    pub disputed_total: u64,
    /// Amount the tenant receives without dispute.
    pub undisputed_total: u64,
    /// Tenant's sealed damage estimate (set in Section 4 dispute flow).
    pub tenant_estimate: u64,
    /// Landlord's proposed deduction / sealed estimate.
    pub landlord_estimate: u64,
    /// Unix timestamp when the tenant sealed their estimate.
    pub tenant_estimate_sealed_ts: i64,
    /// Unix timestamp when the landlord sealed their estimate.
    pub landlord_estimate_sealed_ts: i64,
    /// Maximum fine enforceable by an arbitrator = (`tenant_estimate` + `landlord_estimate`) / 2.
    /// Set on-chain by `reveal_estimates`; every resolution path is capped by this value.
    pub max_fine: u64,
    /// SHA-256 hash of the landlord's photo set (move-in baseline).
    pub landlord_photo_hash: [u8; 32],
    /// SHA-256 hash of the tenant's photo set (move-in baseline).
    pub tenant_photo_hash: [u8; 32],
    /// True once the landlord has submitted their photo hash.
    pub landlord_photos_submitted: bool,
    /// True once the tenant has submitted their photo hash.
    pub tenant_photos_submitted: bool,

    // ── Dispute flow (Section 4) ────────────────────────────────────────────────
    /// True once the tenant has sealed their dispute estimate via `submit_estimate`.
    pub tenant_estimate_submitted: bool,
    /// True once the landlord has sealed their dispute estimate via `submit_estimate`.
    pub landlord_estimate_submitted: bool,
    /// True once `reveal_estimates` has computed `max_fine`. Estimates are immutable after this.
    pub estimates_revealed: bool,
    /// Assigned solo arbitrator allowed to call `resolve_dispute`. Set by `open_dispute`.
    pub arbitrator: Pubkey,
    /// Designated fine oracle (relays the Gemini-computed fine on-chain). Set by `open_dispute`.
    pub oracle: Pubkey,
    /// Gemini-computed fine posted by the oracle. Advisory; always re-checked against `max_fine`.
    pub oracle_fine: u64,
    /// True once the oracle has posted `oracle_fine` via `post_oracle_fine`.
    pub oracle_fine_posted: bool,
    /// Final fine executed by `resolve_dispute` / `resolve_dispute_panel`.
    pub resolved_fine: u64,

    // ── Minority protection (Section 6) ─────────────────────────────────────────
    /// Pubkey of the dissenting panelist in a 2-1 majority outcome (zero if none).
    pub minority_panelist: Pubkey,
    /// SHA-256 hash of the dissenting panelist's written reasoning (zero if none).
    pub minority_ruling_hash: [u8; 32],
    /// True when a 2-1 majority's minority dissent exceeds the 20% threshold.
    pub minority_dissent_flag: bool,

    /// PDA bump seed.
    pub bump: u8,
}
