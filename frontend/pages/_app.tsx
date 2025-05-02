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
import Head from 'next/head';
import { useEffect } from 'react';

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

// Ensure transparent backgrounds
const TransparentBackgroundFix = () => {
  useEffect(() => {
    // Apply transparent background to critical elements
    const fixBackground = () => {
      const htmlElement = document.documentElement;
      const bodyElement = document.body;
      const rootElement = document.getElementById('__next');
      const mainContent = document.querySelector('.flex-grow');
      
      if (htmlElement) htmlElement.style.backgroundColor = 'transparent';
      if (bodyElement) bodyElement.style.backgroundColor = 'transparent';
      if (rootElement) rootElement.style.backgroundColor = 'transparent';
      if (mainContent) mainContent.setAttribute('style', 'background-color: transparent !important');
    };

    // Run immediately and after a delay (for dynamic content)
    fixBackground();
    const timer = setTimeout(fixBackground, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
};

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
          <Head>
            <style jsx global>{`
              html, body, #__next {
                background-color: transparent !important;
              }
            `}</style>
          </Head>
          <TransparentBackgroundFix />
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