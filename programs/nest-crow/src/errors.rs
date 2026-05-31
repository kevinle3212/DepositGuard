use anchor_lang::prelude::*;

#[error_code]
pub enum NestCrowError {
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

    // ── Dispute (Section 4) ──────────────────────────────────────────────────────
    #[msg("Escrow is not in the DISPUTED status")]
    NotDisputed,
    #[msg("This party has already sealed their dispute estimate; revision is not allowed")]
    EstimateAlreadySubmitted,
    #[msg("Both parties must seal their estimates before they can be revealed")]
    EstimatesNotSubmitted,
    #[msg("Estimates have already been revealed; max_fine is final")]
    EstimatesAlreadyRevealed,
    #[msg("Estimates must be revealed before the dispute can be resolved")]
    EstimatesNotRevealed,
    #[msg("Fine amount exceeds the on-chain max_fine cap")]
    FineExceedsMaxFine,
    #[msg("Fine amount exceeds the disputed funds held in escrow")]
    FineExceedsDisputed,
    #[msg("Caller is not the assigned arbitrator for this dispute")]
    NotArbitrator,
    #[msg("Caller is not the designated fine oracle for this dispute")]
    NotOracle,

    // ── Arbitration fees (Section 5) ─────────────────────────────────────────────
    #[msg("Arbitration fee payment deadline has passed")]
    FeeDeadlinePassed,
    #[msg("This party has already paid the arbitration fee")]
    FeeAlreadyPaid,
    #[msg("This party has already paid the panel-upgrade fee")]
    PanelFeeAlreadyPaid,
    #[msg("Both parties must pay the arbitration fee before the pool can be consumed")]
    FeesNotBothPaid,
    #[msg("A party must pay the base arbitration fee before the panel upgrade")]
    BaseFeeNotPaid,
    #[msg("Arbitration fees have already been refunded or consumed")]
    FeesAlreadyFinalized,

    // ── Arbitration panel (Section 6) ────────────────────────────────────────────
    #[msg("Both parties must pay the panel-upgrade fee to activate the panel track")]
    PanelUpgradeNotPaid,
    #[msg("Caller is not a member of this arbitration panel")]
    NotPanelist,
    #[msg("This panelist has already submitted a ruling")]
    RulingAlreadySubmitted,
    #[msg("All three panel rulings must be submitted before resolving")]
    PanelNotComplete,
    #[msg("This panel has already resolved the dispute")]
    PanelAlreadyResolved,
    #[msg("Ruling recipient must be the landlord or the tenant")]
    InvalidRecipient,

    // ── Arithmetic ───────────────────────────────────────────────────────────────
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
