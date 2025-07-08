use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Недостаточно прав доступа")]
    Unauthorized,
    
    #[msg("Кошелек-получатель не настроен")]
    CollectorWalletNotSet,
    
    #[msg("Неверный адрес кошелька-получателя")]
    InvalidCollectorWallet,
    
    #[msg("Недостаточно SOL для операции")]
    InsufficientBalance,
    
    #[msg("Ошибка при переводе токенов")]
    TokenTransferFailed,
}