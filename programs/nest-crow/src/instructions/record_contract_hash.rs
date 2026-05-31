use anchor_lang::prelude::*;

use crate::errors::NestCrowError;
use crate::state::{EscrowState, LeaseConfig};

/// Stores the SHA-256 hash of the lease PDF on-chain.
///
/// - Landlord call: sets `contract_hash` and marks `landlord_signed = true`.
/// - Tenant call: verifies the submitted hash matches the stored one and marks
///   `tenant_signed = true`. The landlord must call first.
pub fn handler(ctx: Context<RecordContractHash>, contract_hash: [u8; 32]) -> Result<()> {
    let escrow = &ctx.accounts.escrow_state;
    let config = &mut ctx.accounts.lease_config;
    let caller = ctx.accounts.caller.key();

    if caller == escrow.landlord {
        require!(!config.landlord_signed, NestCrowError::ContractHashAlreadySet);
        config.contract_hash = contract_hash;
        config.landlord_signed = true;
    } else if caller == escrow.tenant {
        require!(config.landlord_signed, NestCrowError::ContractHashNotSet);
        require!(
            config.contract_hash == contract_hash,
            NestCrowError::ContractHashMismatch
        );
        config.tenant_signed = true;
    } else {
        return err!(NestCrowError::NotParty);
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RecordContractHash<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        seeds = [b"escrow", escrow_state.lease_id.as_ref()],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"lease-config", escrow_state.lease_id.as_ref()],
        bump = lease_config.bump,
    )]
    pub lease_config: Account<'info, LeaseConfig>,

    pub system_program: Program<'info, System>,
}
