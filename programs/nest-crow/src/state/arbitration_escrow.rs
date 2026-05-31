use anchor_lang::prelude::*;

/// Fixed arbitration fee per party: $50 USDC (6 decimals).
pub const ARBITRATION_FEE_USDC: u64 = 50_000_000;
/// Optional panel-upgrade fee per party: $25 USDC (6 decimals).
pub const PANEL_UPGRADE_FEE_USDC: u64 = 25_000_000;
/// Parties have 72 hours to pay the arbitration fee before the track can default.
pub const ARBITRATION_PAYMENT_WINDOW_SECS: i64 = 72 * 60 * 60;

/// Lifecycle of the arbitration fee pool.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum ArbitrationFeeStatus {
    /// One or both parties still owe the fee.
    AwaitingPayment,
    /// Both parties have paid; pool is ready to be consumed by the arbitrator.
    BothPaid,
    /// Fees returned to the paying party/parties (resolved early or one-party default).
    Refunded,
    /// Pool paid out to the assigned arbitrator / platform fee address.
    Consumed,
}

/// Escrow holding the arbitration (and optional panel-upgrade) fees for a lease.
/// PDA seeds: ["arb-escrow", lease_id]. Funds are held in ["arb-vault", lease_id].
#[account]
#[derive(InitSpace)]
pub struct ArbitrationEscrow {
    /// Lease this fee pool belongs to (PDA seed).
    pub lease_id: Pubkey,
    /// SPL token mint for the fees (same USDC mint as the deposit).
    pub token_mint: Pubkey,
    /// True once the landlord has paid the $50 arbitration fee.
    pub landlord_paid: bool,
    /// True once the tenant has paid the $50 arbitration fee.
    pub tenant_paid: bool,
    /// Required landlord fee (`ARBITRATION_FEE_USDC`).
    pub landlord_fee_amount: u64,
    /// Required tenant fee (`ARBITRATION_FEE_USDC`).
    pub tenant_fee_amount: u64,
    /// True once the landlord has paid the $25 panel-upgrade fee.
    pub landlord_panel_paid: bool,
    /// True once the tenant has paid the $25 panel-upgrade fee.
    pub tenant_panel_paid: bool,
    /// True once BOTH parties have paid the panel upgrade (activates the panel track).
    pub panel_upgrade_paid: bool,
    /// Running total of tokens held in the arbitration vault.
    pub total: u64,
    /// Current fee-pool status.
    pub status: ArbitrationFeeStatus,
    /// Pubkey of the assigned arbitrator (only this key may consume the pool).
    pub arbitrator_pubkey: Pubkey,
    /// Unix timestamp after which an unpaid track may be defaulted/refunded.
    pub payment_deadline_ts: i64,
    /// PDA bump seed.
    pub bump: u8,
}
