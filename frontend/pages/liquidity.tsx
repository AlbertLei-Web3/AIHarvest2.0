import React, { useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { LiquidityInterface } from '../components/liquidity/LiquidityInterface';

const LiquidityPage: NextPage = () => {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Manage Liquidity | AIHarvest</title>
        <meta name="description" content="Provide liquidity to earn fees and farm rewards" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Liquidity Pools</h1>
        <p className="text-gray-600 mb-8">
          Provide liquidity to earn trading fees and farm rewards
        </p>

        <div className="max-w-4xl mx-auto">
          <LiquidityInterface />
        </div>
      </main>
    </>
  );
};

export default LiquidityPage; 