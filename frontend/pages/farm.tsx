import React from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';
import FarmList from '@/components/FarmList';
import { Layout } from '@/components/layout/Layout';

// Use dynamic import to avoid hydration issues with wallet components
const WalletConnect = dynamic(() => import('@/components/wallet/WalletConnect'), {
  ssr: false,
});

const FarmPage = () => {
  const { language } = useLanguage();
  const { isConnected } = useAccount();

  // Translations
  const t = (en: string, zh: string) => language === 'zh' ? zh : en;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">
            {t('Yield Farming', '收益耕作')}
          </h1>
          <p className="text-gray-400">
            {t('Stake LP tokens to earn AIH rewards', '质押LP代币以赚取AIH奖励')}
          </p>
        </div>

        {!isConnected ? (
          <div className="bg-gray-800 rounded-xl shadow-md p-8 text-center border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-white">
              {t('Connect Wallet to Farm', '连接钱包开始耕作')}
            </h2>
            <p className="mb-6 text-gray-400">
              {t('Please connect your wallet to view and interact with farms', '请连接您的钱包以查看和交互农场')}
            </p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </div>
        ) : (
          <FarmList />
        )}
      </div>
    </Layout>
  );
};

export default FarmPage; 