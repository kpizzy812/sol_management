// web-app/utils/PhantomDeepLink.js
import { Transaction, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export class PhantomDeepLink {
  constructor() {
    // Генерируем keypair для шифрования (в продакшене храните в env)
    this.dappKeyPair = Keypair.generate();
  }

  /**
   * Проверить, выполняется ли код в браузере
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
  }

  /**
   * Отправить транзакцию через Phantom с кастомным UI
   */
  async signAndSendTransaction(transaction, userPublicKey, appMetadataUrl) {
    if (!this.isBrowser()) {
      throw new Error('PhantomDeepLink можно использовать только в браузере');
    }

    try {
      // Сериализуем транзакцию
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });

      // Создаем параметры для deeplink
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey.toBytes()),
        cluster: "devnet", // Измените на "mainnet-beta" для продакшена
        app_url: appMetadataUrl, // ← Ваша страница с кастомным UI
        redirect_link: `${window.location.origin}/transaction-success`,
        transaction: bs58.encode(serializedTransaction)
      });

      // Создаем Phantom deeplink
      const phantomUrl = `phantom://v1/signAndSendTransaction?${params.toString()}`;
      
      console.log('📱 Открываем Phantom с кастомным UI...');
      console.log('Metadata URL:', appMetadataUrl);
      
      // Открываем Phantom
      if (this.isMobile()) {
        // На мобильных устройствах
        window.location.href = phantomUrl;
      } else {
        // На десктопе - открываем в новом окне
        const popup = window.open(phantomUrl, '_blank', 'width=400,height=600');
        
        // Проверяем, закрылось ли окно (пользователь завершил транзакцию)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            console.log('✅ Phantom окно закрыто');
          }
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Ошибка при создании Phantom deeplink:', error);
      throw new Error(`Failed to create Phantom transaction: ${error.message}`);
    }
  }

  /**
   * Создать deeplink для подключения кошелька
   */
  createConnectWalletLink(appMetadataUrl) {
    if (!this.isBrowser()) {
      throw new Error('createConnectWalletLink можно использовать только в браузере');
    }

    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey.toBytes()),
      cluster: "devnet",
      app_url: appMetadataUrl,
      redirect_link: `${window.location.origin}/wallet-connected`
    });

    return `phantom://v1/connect?${params.toString()}`;
  }

  /**
   * Проверить, мобильное ли устройство
   */
  private isMobile(): boolean {
    if (!this.isBrowser()) return false;
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Обработка результата транзакции (callback URL)
   */
  static handleTransactionResult(urlParams) {
    const signature = urlParams.get('signature');
    const errorCode = urlParams.get('errorCode');
    const errorMessage = urlParams.get('errorMessage');

    if (signature) {
      console.log('✅ Транзакция успешна:', signature);
      return {
        success: true,
        signature: signature
      };
    } else if (errorCode) {
      console.error('❌ Ошибка транзакции:', errorCode, errorMessage);
      return {
        success: false,
        error: errorMessage || `Error code: ${errorCode}`
      };
    }

    return {
      success: false,
      error: 'Unknown error'
    };
  }

  /**
   * Проверить, доступен ли Phantom
   */
  isPhantomAvailable(): boolean {
    if (!this.isBrowser()) return false;
    
    return typeof window !== 'undefined' && !!window.phantom?.solana;
  }

  /**
   * Подключиться к Phantom кошельку (альтернативный способ)
   */
  async connectWallet(): Promise<{ publicKey: PublicKey }> {
    if (!this.isBrowser()) {
      throw new Error('connectWallet можно использовать только в браузере');
    }

    if (!this.isPhantomAvailable()) {
      throw new Error('Phantom кошелек не найден. Установите расширение Phantom.');
    }

    try {
      const response = await window.phantom!.solana!.connect();
      console.log('✅ Подключен к Phantom:', response.publicKey.toString());
      return response;
    } catch (error) {
      console.error('❌ Ошибка подключения к Phantom:', error);
      throw error;
    }
  }
}