import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';

// Translations for the home page
const translations = {
  en: {
    title: 'Welcome to AIHarvest',
    subtitle: 'The Next Generation DeFi Platform',
    description: 'AIHarvest combines AI-powered analytics with DeFi tools to maximize your yield farming strategy.',
    getStarted: 'Get Started',
    connectWallet: 'Connect Wallet',
    features: 'Features',
    swapTokens: 'Swap Tokens',
    provideLiquidity: 'Provide Liquidity',
    farmYield: 'Farm Yield',
    swapDescription: 'Exchange tokens at competitive rates with minimal slippage.',
    liquidityDescription: 'Provide liquidity to earn fees and qualify for farming rewards.',
    farmDescription: 'Stake your LP tokens to earn additional yield through our farms.',
  },
  zh: {
    title: '欢迎来到 AIHarvest',
    subtitle: '下一代 DeFi 平台',
    description: 'AIHarvest 将 AI 驱动的分析与 DeFi 工具相结合，以最大化您的收益农业策略。',
    getStarted: '开始使用',
    connectWallet: '连接钱包',
    features: '功能特点',
    swapTokens: '代币交换',
    provideLiquidity: '提供流动性',
    farmYield: '农场收益',
    swapDescription: '以具有竞争力的价格和最小滑点交换代币。',
    liquidityDescription: '提供流动性以赚取费用并获得农场奖励资格。',
    farmDescription: '质押您的 LP 代币，通过我们的农场获得额外收益。',
  }
};

export default function Home() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { isConnected } = useAccount();
  
  // Get translations for this page
  const homeT = (key: keyof typeof translations.en): string => {
    const currentTranslations = translations[language];
    return currentTranslations[key] || key;
  };

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="text-center mb-24">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
          {homeT('title')}
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-white/90">
          {homeT('subtitle')}
        </h2>
        <p className="text-lg max-w-2xl mx-auto mb-12 text-white/80">
          {homeT('description')}
        </p>
        <div className="flex justify-center space-x-4">
          {isConnected ? (
            <Link 
              href="/swap" 
              className="px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-lg font-bold text-white shadow-glow hover:shadow-glow-lg transition-all"
            >
              {homeT('getStarted')}
            </Link>
          ) : (
            <button 
              className="px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-lg font-bold text-white shadow-glow hover:shadow-glow-lg transition-all"
            >
              {homeT('connectWallet')}
            </button>
          )}
        </div>
      </div>

      {/* Features Section */}
      <section className="mb-24">
        <h2 className="text-3xl font-bold text-center mb-16 text-white">
          {homeT('features')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Swap Feature */}
          <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:bg-dark-lightest border border-primary/10">
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-center mb-4 text-white">
              {homeT('swapTokens')}
            </h3>
            <p className="text-white/70 text-center">
              {homeT('swapDescription')}
            </p>
          </div>
          
          {/* Liquidity Feature */}
          <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:bg-dark-lightest border border-primary/10">
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-center mb-4 text-white">
              {homeT('provideLiquidity')}
            </h3>
            <p className="text-white/70 text-center">
              {homeT('liquidityDescription')}
            </p>
          </div>
          
          {/* Farm Feature */}
          <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:bg-dark-lightest border border-primary/10">
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-center mb-4 text-white">
              {homeT('farmYield')}
            </h3>
            <p className="text-white/70 text-center">
              {homeT('farmDescription')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
} 