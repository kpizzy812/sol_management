use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct SetCollectorWallet<'info> {
    #[account(
        init_if_needed,
        pads = CollectorState::LEN,
        space = CollectorState::LEN,
        seeds = [CollectorState::SEED],
        bump,
        payer = authority
    )]
    pub collector_state: Account<'info, CollectorState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Кошелек-получатель (может быть любой валидный адрес)
    pub collector_wallet: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SetCollectorWallet>, 
    new_collector_wallet: Pubkey
) -> Result<()> {
    let collector_state = &mut ctx.accounts.collector_state;
    
    // Если аккаунт только создается, инициализируем его
    if collector_state.authority == Pubkey::default() {
        collector_state.authority = ctx.accounts.authority.key();
        collector_state.gas_reserve = CollectorState::DEFAULT_GAS_RESERVE;
        collector_state.bump = ctx.bumps.collector_state;
        
        msg!("Контракт инициализирован с владельцем: {}", ctx.accounts.authority.key());
    } else {
        // Проверяем, что вызывающий - это владелец
        require!(
            collector_state.authority == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );
    }
    
    // Устанавливаем новый адрес кошелька-получателя
    collector_state.collector_wallet = new_collector_wallet;
    
    msg!("Кошелек-получатель установлен: {}", new_collector_wallet);
    
    Ok(())
}