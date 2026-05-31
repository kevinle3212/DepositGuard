use anchor_lang::prelude::*;

/// Configuration and signing state for a lease.
/// PDA seeds: ["lease-config", `lease_id`]
#[account]
#[derive(InitSpace)]
pub struct LeaseConfig {
    /// Landlord's wallet pubkey.
    pub landlord: Pubkey,
    /// Tenant's wallet pubkey.
    pub tenant: Pubkey,
    /// SPL token mint for the deposit currency.
    pub token_mint: Pubkey,
    /// Full deposit amount in token base units.
    pub deposit_amount: u64,
    /// Dispute auto-flag threshold in whole-percent points (e.g., 15 = 15%).
    pub dispute_threshold_pct: u8,
    /// SHA-256 hash of the lease PDF, set by the landlord via `record_contract_hash`.
    pub contract_hash: [u8; 32],
    /// True once the landlord has called `record_contract_hash`.
    pub landlord_signed: bool,
    /// True once the tenant has confirmed the hash via `record_contract_hash`.
    pub tenant_signed: bool,
    /// PDA bump seed.
    pub bump: u8,
}
