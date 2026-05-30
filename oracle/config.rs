use anchor_lang::prelude::*;

/// Single global program config (one PDA, seed = CONFIG_SEED).
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// May update the oracle key and fine bounds.
    pub admin: Pubkey,
    /// The only key allowed to submit fine-calculation verdicts.
    /// This is the Gemini agent's signing keypair.
    pub oracle: Pubkey,
    /// Hard cap on any fine, in basis points of the escrow amount.
    /// The on-chain program rejects verdicts above this, so a misbehaving
    /// or compromised agent can never assess an unbounded fine.
    pub max_fine_bps: u16,
    /// Bump for the config PDA.
    pub bump: u8,
}
