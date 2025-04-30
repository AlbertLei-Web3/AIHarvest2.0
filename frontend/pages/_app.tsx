import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/layout/Layout';
import { createConfig, WagmiConfig, type Config } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { injected } from 'wagmi/connectors';
import dynamic from 'next/dynamic';
import { LiquidityProvider } from '@/contexts/LiquidityContext';

console.log('Creating Wagmi config...'); // 添加调试日志

// Create our minimal config to avoid loading unused connectors
const customConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http()
  },
  connectors: [
    injected()
  ]
});

// Create a client
const queryClient = new QueryClient();

// Main App component
function App({ Component, pageProps }: AppProps) {
  // 检查window.ethereum是否存在
  if (typeof window !== 'undefined') {
    console.log('window.ethereum exists:', !!window.ethereum);
    if (window.ethereum) {
      console.log('MetaMask detected:', !!window.ethereum.isMetaMask);
    }
  }

  return (
    <WagmiConfig config={customConfig}>
      <QueryClientProvider client={queryClient}>
        <LiquidityProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </LiquidityProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

// Dynamically import App with SSR disabled
const AppWithNoSSR = dynamic(() => Promise.resolve(App), { ssr: false });

export default function Wrapper(props: AppProps) {
  return <AppWithNoSSR {...props} />;
} 