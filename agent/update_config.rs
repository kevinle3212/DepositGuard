use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::EscrowError;
use crate::state::*;

/// Admin rotates the oracle key (e.g. agent key rotation) or adjusts the cap.
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ EscrowError::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn update_config(
    ctx: Context<UpdateConfig>,
    new_oracle: Option<Pubkey>,
    new_max_fine_bps: Option<u16>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    if let Some(oracle) = new_oracle {
        config.oracle = oracle;
    }
    if let Some(bps) = new_max_fine_bps {
        config.max_fine_bps = bps;
    }
    Ok(())
}
