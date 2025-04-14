import React from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { WalletConnect } from '../components/wallet/WalletConnect';
import { useAccount } from 'wagmi';
import { Banner } from '../components/ui/Banner';
import { FeatureCard } from '../components/ui/FeatureCard';

const Home: NextPage = () => {
  const { isConnected } = useAccount();

  return (
    <>
      <Head>
        <title>AIHarvest - DeFi Platform</title>
        <meta name="description" content="Swap tokens, provide liquidity, and earn rewards on AIHarvest" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <Banner 
          title="Welcome to AIHarvest" 
          subtitle="Swap, provide liquidity, and earn rewards"
          ctaText={isConnected ? "Launch App" : "Connect Wallet"}
          ctaLink={isConnected ? "/swap" : "#connect-wallet"}
        />

        {!isConnected && (
          <div className="my-8 max-w-md mx-auto">
            <WalletConnect />
          </div>
        )}

        {isConnected && <DashboardStats />}

        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              title="Token Swapping" 
              description="Swap between different tokens with minimal fees and slippage"
              icon="swap"
              link="/swap"
            />
            <FeatureCard 
              title="Liquidity Providing" 
              description="Provide liquidity to earn fees from trades"
              icon="liquidity"
              link="/liquidity"
            />
            <FeatureCard 
              title="Yield Farming" 
              description="Stake your LP tokens to earn AIH rewards"
              icon="farm"
              link="/farm"
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default Home; 