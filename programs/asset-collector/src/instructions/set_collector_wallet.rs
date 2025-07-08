use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct InitializeCollector<'info> {
    #[account(
        init,
        space = CollectorState::LEN,
        seeds = [CollectorState::SEED],
        bump,
        payer = authority
    )]
    pub collector_state: Account<'info, CollectorState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetCollectorWallet<'info> {
    #[account(
        mut,
        seeds = [CollectorState::SEED],
        bump = collector_state.bump,
        constraint = collector_state.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub collector_state: Account<'info, CollectorState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn initialize_collector_handler(
    ctx: Context<InitializeCollector>
) -> Result<()> {
    let collector_state = &mut ctx.accounts.collector_state;
    
    collector_state.authority = ctx.accounts.authority.key();
    collector_state.collector_wallet = Pubkey::default(); // Будет установлен позже
    collector_state.gas_reserve = CollectorState::DEFAULT_GAS_RESERVE;
    collector_state.bump = ctx.bumps.collector_state;
    
    msg!("Контракт инициализирован с владельцем: {}", ctx.accounts.authority.key());
    
    Ok(())
}

pub fn set_collector_wallet_handler(
    ctx: Context<SetCollectorWallet>, 
    new_collector_wallet: Pubkey
) -> Result<()> {
    let collector_state = &mut ctx.accounts.collector_state;
    
    // Устанавливаем новый адрес кошелька-получателя
    collector_state.collector_wallet = new_collector_wallet;
    
    msg!("Кошелек-получатель установлен: {}", new_collector_wallet);
    
    Ok(())
}