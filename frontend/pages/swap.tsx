import React, { useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { SwapInterface } from '../components/swap/SwapInterface';

const SwapPage: NextPage = () => {
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
        <title>Swap Tokens | AIHarvest</title>
        <meta name="description" content="Swap your tokens with minimal fees and slippage" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Swap Tokens</h1>
        <p className="text-gray-600 mb-8">
          Exchange tokens with minimal fees and slippage
        </p>

        <div className="max-w-lg mx-auto">
          <SwapInterface />
        </div>
      </main>
    </>
  );
};

export default SwapPage; 