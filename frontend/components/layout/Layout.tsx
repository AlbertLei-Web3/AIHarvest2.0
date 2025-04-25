import React, { ReactNode, useState } from 'react';
import { Header, LanguageProvider } from './Header';
import { Footer } from './Footer';
import NetworkSwitcher from '../NetworkSwitcher';
import { CHAIN_IDS } from '../../utils/contracts/network';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);

  // Handle network change
  const handleNetworkChange = (isCorrect: boolean) => {
    setIsCorrectNetwork(isCorrect);
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-dark-default via-dark-light to-dark-lighter text-white">
        <Header />
        <div className="flex-grow">
          {/* Only show children if connected to the correct network or show a placeholder message */}
          {isCorrectNetwork ? children : (
            <div className="container mx-auto px-4 py-10 text-center">
              <h2 className="text-2xl font-bold mb-4">Network Connection Required</h2>
              <p className="mb-6">Please connect to the Sepolia network to use this application.</p>
            </div>
          )}
        </div>
        <Footer />
        <NetworkSwitcher 
          targetChainId={CHAIN_IDS.SEPOLIA} 
          onNetworkChange={handleNetworkChange} 
        />
      </div>
    </LanguageProvider>
  );
}; 