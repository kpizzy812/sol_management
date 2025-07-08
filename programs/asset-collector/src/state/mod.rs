use anchor_lang::prelude::*;

#[account]
pub struct CollectorState {
    /// Адрес владельца контракта (может менять настройки)
    pub authority: Pubkey,
    /// Адрес кошелька-получателя (куда собираются активы)
    pub collector_wallet: Pubkey,
    /// Минимальный резерв SOL для газа (в лампортах)
    pub gas_reserve: u64,
    /// Bump для PDA
    pub bump: u8,
}

impl CollectorState {
    /// Размер аккаунта в байтах
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // collector_wallet  
        8 +  // gas_reserve
        1;   // bump

    /// Минимальный резерв для газа (0.015 SOL в лампортах)
    pub const DEFAULT_GAS_RESERVE: u64 = 15_000_000; // 0.015 SOL
    
    /// Seed для PDA
    pub const SEED: &'static [u8] = b"collector-state";
}