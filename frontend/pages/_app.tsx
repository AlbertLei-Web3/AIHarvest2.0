import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Layout } from '@/components/layout/Layout';
import { createConfig, WagmiConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import dynamic from 'next/dynamic';

// Create wagmi config for v2
const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http()
  }
});

// Create a client
const queryClient = new QueryClient();

// Main App component
function App({ Component, pageProps }: AppProps) {
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

// Dynamically import App with SSR disabled
const AppWithNoSSR = dynamic(() => Promise.resolve(App), { ssr: false });

export default function Wrapper(props: AppProps) {
  return <AppWithNoSSR {...props} />;
} 