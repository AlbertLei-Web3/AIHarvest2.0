import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/layout/Layout';
import { createConfig, configureChains } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

// Configure chains & providers
const { chains, publicClient } = configureChains(
  [sepolia],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: true,
  publicClient,
});

// Create a client
const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
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