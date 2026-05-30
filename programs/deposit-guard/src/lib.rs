/// DepositGuard — security deposit escrow on Solana.
///
/// State machine:
///   CREATED → FUNDED → PENDING_DOCUMENTATION → ACTIVE →
///   PENDING_APPROVAL → RELEASED / DISPUTED → RESOLVED
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

// `use instructions::*` brings the Accounts structs into scope for #[program].
// handler fns are called via full module paths below (mod.rs does not re-export them).
use instructions::*;

// Replace with the actual program ID after running `anchor keys sync`.
declare_id!("F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a");

#[program]
pub mod deposit_guard {
    use super::*;

    /// Creates EscrowState, LeaseConfig, ClaimRecord PDAs and the vault token
    /// account for a new lease. Status begins at CREATED.
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        lease_id: Pubkey,
        tenant: Pubkey,
        deposit_amount: u64,
        deadline_ts: i64,
        jurisdiction_code: [u8; 8],
        dispute_threshold_pct: u8,
    ) -> Result<()> {
        instructions::initialize_escrow::handler(
            ctx,
            lease_id,
            tenant,
            deposit_amount,
            deadline_ts,
            jurisdiction_code,
            dispute_threshold_pct,
        )
    }

    /// Stores the SHA-256 hash of the lease PDF on-chain and marks the
    /// calling party as signed. Landlord calls first; tenant confirms.
    pub fn record_contract_hash(
        ctx: Context<RecordContractHash>,
        contract_hash: [u8; 32],
    ) -> Result<()> {
        instructions::record_contract_hash::handler(ctx, contract_hash)
    }

    /// Tenant transfers the full deposit into the PDA vault.
    /// Requires both `landlord_signed` and `tenant_signed` to be true.
    /// Status: CREATED → FUNDED.
    pub fn fund_escrow(ctx: Context<FundEscrow>) -> Result<()> {
        instructions::fund_escrow::handler(ctx)
    }

    /// Stores the SHA-256 hash of a party's move-in photo set.
    /// Status: FUNDED → PENDING_DOCUMENTATION (first call),
    ///         PENDING_DOCUMENTATION → ACTIVE (both parties submitted).
    pub fn record_photo_hash(
        ctx: Context<RecordPhotoHash>,
        photo_hash: [u8; 32],
    ) -> Result<()> {
        instructions::record_photo_hash::handler(ctx, photo_hash)
    }

    /// Landlord proposes a deduction from the deposit after move-out.
    /// Status: ACTIVE → PENDING_APPROVAL.
    pub fn propose_release(
        ctx: Context<ProposeRelease>,
        deduction_amount: u64,
    ) -> Result<()> {
        instructions::propose_release::handler(ctx, deduction_amount)
    }

    /// Tenant accepts the landlord's proposed split; funds are disbursed.
    /// Status: PENDING_APPROVAL → RELEASED.
    pub fn approve_release(ctx: Context<ApproveRelease>) -> Result<()> {
        instructions::approve_release::handler(ctx)
    }

    /// Relayer calls after `deadline_ts`; full vault balance goes to tenant.
    /// Status: ACTIVE or PENDING_APPROVAL → RELEASED.
    pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
        instructions::claim_timeout::handler(ctx)
    }

    /// Closes all PDA accounts and the vault, returning rent to the landlord.
    /// Requires status = RELEASED or RESOLVED and vault balance = 0.
    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        instructions::close_escrow::handler(ctx)
    }
}
