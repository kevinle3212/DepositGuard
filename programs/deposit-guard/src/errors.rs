use anchor_lang::prelude::*;

#[error_code]
pub enum DepositGuardError {
    // ── Authorization ──────────────────────────────────────────────────────────
    #[msg("Caller is not the landlord of this lease")]
    NotLandlord,
    #[msg("Caller is not the tenant of this lease")]
    NotTenant,
    #[msg("Caller must be the landlord or the tenant")]
    NotParty,

    // ── State machine ──────────────────────────────────────────────────────────
    #[msg("Escrow is not in the CREATED status")]
    NotCreated,
    #[msg("Escrow is not in the FUNDED status")]
    NotFunded,
    #[msg("Escrow is not in the PENDING_DOCUMENTATION status")]
    NotPendingDocumentation,
    #[msg("Escrow is not in the ACTIVE status")]
    NotActive,
    #[msg("Escrow is not in the PENDING_APPROVAL status")]
    NotPendingApproval,
    #[msg("Escrow must be in RELEASED or RESOLVED status to close")]
    NotFinalStatus,
    #[msg("Invalid status transition attempted")]
    InvalidStatusTransition,

    // ── Contract / signing ─────────────────────────────────────────────────────
    #[msg("Both parties must sign the lease before the tenant can fund the escrow")]
    LeaseNotSigned,
    #[msg("Contract hash already set; cannot overwrite")]
    ContractHashAlreadySet,
    #[msg("Submitted hash does not match the stored contract hash")]
    ContractHashMismatch,
    #[msg("Contract hash not yet set by the landlord")]
    ContractHashNotSet,

    // ── Photos ─────────────────────────────────────────────────────────────────
    #[msg("Landlord has already submitted a photo hash for this lease")]
    LandlordPhotosAlreadySubmitted,
    #[msg("Tenant has already submitted a photo hash for this lease")]
    TenantPhotosAlreadySubmitted,

    // ── Amounts ────────────────────────────────────────────────────────────────
    #[msg("Deduction amount exceeds the total deposit")]
    DeductionExceedsDeposit,
    #[msg("Vault token balance does not match the recorded deposit amount")]
    VaultBalanceMismatch,

    // ── Timeout ────────────────────────────────────────────────────────────────
    #[msg("Deadline has not passed yet; claim_timeout cannot be called")]
    DeadlineNotPassed,

    // ── Close ──────────────────────────────────────────────────────────────────
    #[msg("Vault still holds tokens; disburse all funds before closing")]
    VaultNotEmpty,
}
