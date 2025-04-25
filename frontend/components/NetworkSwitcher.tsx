import React, { useEffect, useState } from 'react';
import { checkNetwork, switchNetwork, logger } from '../utils/contracts/helpers';
import { CHAIN_IDS, getChainName } from '../utils/contracts/network';

interface NetworkSwitcherProps {
  targetChainId?: number;
  onNetworkChange?: (isCorrectNetwork: boolean) => void;
}

const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ 
  targetChainId = CHAIN_IDS.SEPOLIA,
  onNetworkChange 
}) => {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

  // Check current network
  const checkCurrentNetwork = async () => {
    try {
      if (!window.ethereum) {
        setIsCorrectNetwork(false);
        if (onNetworkChange) onNetworkChange(false);
        return;
      }

      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      setCurrentChainId(chainId);
      
      const isCorrect = chainId === targetChainId;
      setIsCorrectNetwork(isCorrect);
      
      if (onNetworkChange) onNetworkChange(isCorrect);
    } catch (error) {
      logger.error('Error checking network in NetworkSwitcher:', error);
      setIsCorrectNetwork(false);
      if (onNetworkChange) onNetworkChange(false);
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async () => {
    try {
      const success = await switchNetwork(targetChainId);
      if (success) {
        setIsCorrectNetwork(true);
        if (onNetworkChange) onNetworkChange(true);
      }
    } catch (error) {
      logger.error('Error switching network:', error);
    }
  };

  // Check network on component mount
  useEffect(() => {
    checkCurrentNetwork();

    // Setup event listener for chain changes
    if (window.ethereum) {
      const handleChainChanged = () => {
        checkCurrentNetwork();
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [targetChainId]);

  // If still loading or correct network, don't show anything
  if (isCorrectNetwork === null || isCorrectNetwork === true) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
      <div className="flex flex-col items-start">
        <p className="font-semibold mb-2">
          Wrong Network Detected: {currentChainId ? getChainName(currentChainId) : 'Unknown'}
        </p>
        <p className="text-sm mb-3">
          Please switch to {getChainName(targetChainId)} to use this application.
        </p>
        <button
          onClick={handleSwitchNetwork}
          className="bg-white text-red-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
        >
          Switch Network
        </button>
      </div>
    </div>
  );
};

export default NetworkSwitcher; 