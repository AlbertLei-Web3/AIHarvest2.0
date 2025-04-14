import React, { useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { FarmInterface } from '../components/farm/FarmInterface';

const FarmPage: NextPage = () => {
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
        <title>Farm Rewards | AIHarvest</title>
        <meta name="description" content="Stake your LP tokens and earn AIHarvest rewards" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Farm Rewards</h1>
        <p className="text-gray-600 mb-8">
          Stake your LP tokens from liquidity pools to earn additional AIH token rewards
        </p>

        <div className="max-w-4xl mx-auto">
          <FarmInterface />
        </div>
      </main>
    </>
  );
};

export default FarmPage; 