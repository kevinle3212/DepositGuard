use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum DisputeState {
    Open,
    /// Set once the agent/panel begins reviewing.
    UnderReview,
    Resolved,
}

/// Outcome direction of a dispute. `Pending` until a verdict is submitted.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum DisputeResolution {
    Pending,
    FavorBuyer,
    FavorSeller,
    Split,
}

#[account]
#[derive(InitSpace)]
pub struct Dispute {
    /// The escrow this dispute belongs to.
    pub escrow: Pubkey,
    /// Party that opened the dispute (must be the buyer or the seller).
    pub initiator: Pubkey,
    /// Free-text reason. Keep `max_len` in sync with `MAX_REASON_LEN`.
    #[max_len(256)]
    pub reason: String,
    /// Off-chain pointer to the evidence image (ar://, ipfs://, https://...).
    /// Keep `max_len` in sync with `MAX_URI_LEN`.
    #[max_len(200)]
    pub evidence_uri: String,
    /// SHA-256 of the evidence image bytes. The agent must verify the fetched
    /// image hashes to this value before judging, so the judged artifact is
    /// exactly the one committed on-chain (tamper-evident).
    pub evidence_hash: [u8; 32],
    /// Current dispute state.
    pub state: DisputeState,
    /// Resolution direction (set by the verdict).
    pub resolution: DisputeResolution,
    /// Fine size in basis points of the escrow amount (set by the verdict).
    pub fine_bps: u16,
    /// Fine in mint base units, computed on-chain from `fine_bps`.
    pub fine_amount: u64,
    /// SHA-256 of the agent's canonical verdict payload (judgement provenance).
    pub verdict_hash: [u8; 32],
    /// Unix timestamp the dispute was opened.
    pub created_at: i64,
    /// Unix timestamp the dispute was resolved (0 while unresolved).
    pub resolved_at: i64,
    /// Bump for the dispute PDA.
    pub bump: u8,
}
