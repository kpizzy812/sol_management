pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("4LiT8r7gQ1ggVVdJBjEiKC5KJAnPoFC6eA1ikom8XB7Y");

#[program]
pub mod asset_collector {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }
}
