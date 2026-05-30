use anchor_lang::prelude::*;

/// Damage and photo record for a lease.
/// Populated across move-in, move-out, and dispute phases.
/// PDA seeds: ["claim-record", lease_id]
#[account]
#[derive(InitSpace)]
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
    /// Maximum fine enforceable by an arbitrator = (tenant_estimate + landlord_estimate) / 2.
    pub max_fine: u64,
    /// SHA-256 hash of the landlord's photo set (move-in baseline).
    pub landlord_photo_hash: [u8; 32],
    /// SHA-256 hash of the tenant's photo set (move-in baseline).
    pub tenant_photo_hash: [u8; 32],
    /// True once the landlord has submitted their photo hash.
    pub landlord_photos_submitted: bool,
    /// True once the tenant has submitted their photo hash.
    pub tenant_photos_submitted: bool,
    /// PDA bump seed.
    pub bump: u8,
}
