use anchor_lang::prelude::*;

/// Status of the escrow, enforcing the state machine:
/// CREATED → FUNDED → `PENDING_DOCUMENTATION` → ACTIVE →
/// `PENDING_APPROVAL` → RELEASED / DISPUTED → RESOLVED
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum EscrowStatus {
    Created,
    Funded,
    PendingDocumentation,
    Active,
    PendingApproval,
    Released,
    Disputed,
    Resolved,
}

/// Primary escrow account holding lease identity and lifecycle state.
/// PDA seeds: ["escrow", `lease_id`]
#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    /// Unique identifier for this lease (used as PDA seed).
    pub lease_id: Pubkey,
    /// Landlord's wallet pubkey.
    pub landlord: Pubkey,
    /// Tenant's wallet pubkey.
    pub tenant: Pubkey,
    /// SPL token mint for the deposit currency (e.g., USDC).
    pub token_mint: Pubkey,
    /// Full deposit amount in token base units (6 decimals for USDC).
    pub deposit_amount: u64,
    /// Current lifecycle status.
    pub status: EscrowStatus,
    /// Unix timestamp after which `claim_timeout` becomes valid.
    pub deadline_ts: i64,
    /// ISO 3166-1 alpha-2 jurisdiction code, zero-padded (e.g., b"OR\0\0\0\0\0\0").
    pub jurisdiction_code: [u8; 8],
    /// PDA bump seed.
    pub bump: u8,
}
