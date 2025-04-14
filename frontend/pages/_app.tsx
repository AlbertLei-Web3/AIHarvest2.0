import React from 'react';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { hardhat, sepolia, mainnet } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    hardhat,
    sepolia,
    mainnet,
  ],
  [publicProvider()]
);

// Set up wagmi config with connectors
const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
      },
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'AIHarvest DeFi Platform',
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

// Create a React Query client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default MyApp; 