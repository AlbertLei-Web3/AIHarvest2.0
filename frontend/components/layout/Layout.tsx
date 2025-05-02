import React, { ReactNode, useState } from 'react';
import { Header, LanguageProvider } from './Header';
import { Footer } from './Footer';
import NetworkSwitcher from '../NetworkSwitcher';
import { CHAIN_IDS } from '../../utils/contracts/network';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

// Background component with animations
const PageBackground: React.FC = () => {
  return (
    <div className={styles.backgroundContainer}>
      <div className={styles.gradientBackground}></div>
      <div className={styles.backgroundOrb1}></div>
      <div className={styles.backgroundOrb2}></div>
      <div className={styles.backgroundOrb3}></div>
      <div className={styles.gridPattern}></div>
      <div className={styles.bottomWave}></div>
      <div className={styles.bottomWaveReverse}></div>
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
        <PageBackground />
        <Header />
        <div className={styles.mainContent}>
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