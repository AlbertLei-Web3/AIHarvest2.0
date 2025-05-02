import React, { ReactNode, useState } from 'react';
import { Header, LanguageProvider } from './Header';
import { Footer } from './Footer';
import NetworkSwitcher from '../NetworkSwitcher';
import { CHAIN_IDS } from '../../utils/contracts/network';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

// Background component with animations and particles
const PageBackground: React.FC = () => {
  return (
    <div className={styles.backgroundContainer}>
      {/* Gradient Background */}
      <div className={styles.gradientBackground}></div>
      
      {/* Animated circles/orbs */}
      <div className={styles.backgroundOrb1}></div>
      <div className={styles.backgroundOrb2}></div>
      <div className={styles.backgroundOrb3}></div>
      
      {/* Animated grid pattern */}
      <div className={styles.gridPattern}></div>
      
      {/* Wave Animation - Bottom */}
      <div className={styles.bottomWave}></div>
      
      {/* Wave Animation - Bottom (Reverse) */}
      <div className={styles.bottomWaveReverse}></div>
      
      {/* Subtle stars/particles */}
      <div className="stars absolute inset-0"></div>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);

  // Handle network change
  const handleNetworkChange = (isCorrect: boolean) => {
    setIsCorrectNetwork(isCorrect);
  };

  return (
    <LanguageProvider>
      <div className={styles.layoutContainer}>
        {/* Background Component */}
        <PageBackground />
        
        <Header />
        <div className={styles.mainContent}>
          {/* Only show children if connected to the correct network or show a placeholder message */}
          {isCorrectNetwork ? children : (
            <div className={styles.errorContainer}>
              <h2 className="text-2xl font-bold mb-4 gradient-text">Network Connection Required</h2>
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