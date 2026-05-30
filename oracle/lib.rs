use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::DisputeResolution;

// Placeholder program id. Replace with your own via `anchor keys sync`.
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod escrow_dispute {
    use super::*;

    // ----- Admin / config -----

    /// One-time setup: register the admin, the fine-calculation oracle key,
    /// and the maximum fine (basis points of the escrow amount).
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        oracle: Pubkey,
        max_fine_bps: u16,
    ) -> Result<()> {
        instructions::initialize_config(ctx, oracle, max_fine_bps)
    }

    /// Admin rotates the oracle key or adjusts the fine cap.
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_oracle: Option<Pubkey>,
        new_max_fine_bps: Option<u16>,
    ) -> Result<()> {
        instructions::update_config(ctx, new_oracle, new_max_fine_bps)
    }

    // ----- Escrow lifecycle -----

    /// Create an escrow agreement and its empty token vault.
    /// `seed` is a client-chosen u64 that makes the escrow PDA unique.
    pub fn initialize_escrow(ctx: Context<InitializeEscrow>, seed: u64, amount: u64) -> Result<()> {
        instructions::initialize_escrow(ctx, seed, amount)
    }

    /// Buyer deposits the agreed `amount` into the vault.
    pub fn fund_escrow(ctx: Context<FundEscrow>) -> Result<()> {
        instructions::fund_escrow(ctx)
    }

    /// Buyer releases funds to the seller (happy path).
    pub fn release(ctx: Context<Release>) -> Result<()> {
        instructions::release(ctx)
    }

    /// Seller refunds the buyer.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        instructions::refund(ctx)
    }

    // ----- Dispute / fine calculation -----

    /// Buyer or seller opens a dispute on a funded escrow, committing the
    /// evidence image URI and its SHA-256.
    pub fn raise_dispute(
        ctx: Context<RaiseDispute>,
        reason: String,
        evidence_uri: String,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        instructions::raise_dispute(ctx, reason, evidence_uri, evidence_hash)
    }

    /// Initiator withdraws an open dispute.
    pub fn cancel_dispute(ctx: Context<CancelDispute>) -> Result<()> {
        instructions::cancel_dispute(ctx)
    }

    /// Authorized oracle (Gemini agent) submits a judgement; the fine amount is
    /// derived on-chain from `fine_bps`.
    pub fn submit_verdict(
        ctx: Context<SubmitVerdict>,
        resolution: DisputeResolution,
        fine_bps: u16,
        verdict_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_verdict(ctx, resolution, fine_bps, verdict_hash)
    }
}
