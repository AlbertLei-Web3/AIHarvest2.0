/**
 * Common utility functions for contract interactions
 */
import { ethers } from 'ethers';
import { CHAIN_IDS, RPC_URLS, getChainName } from './network';

/**
 * Logger utility to standardize console output
 */
export const logger = {
  log: (message: string, ...args: any[]) => {
    console.log(`[DeFi] ${message}`, ...args);
  },
  error: (message: string, error: any) => {
    console.error(`[DeFi Error] ${message}`, error);
    // Could add error tracking service integration here
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[DeFi Warning] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DeFi Debug] ${message}`, ...args);
    }
  }
};

/**
 * Checks if ethereum object is available and connected
 */
export const checkEthereumStatus = (): boolean => {
  logger.debug('Checking ethereum status...');
  
  if (!window.ethereum) {
    logger.error('No ethereum object found in window', null);
    return false;
  }
  
  logger.debug('Ethereum object properties:', {
    isMetaMask: window.ethereum.isMetaMask,
    selectedAddress: window.ethereum.selectedAddress,
    chainId: window.ethereum.chainId
  });
  
  if (!window.ethereum.selectedAddress) {
    logger.warn('No selected address, connection may be lost');
    return false;
  }
  
  return true;
};

/**
 * Ensures wallet is connected and returns the current address
 */
export const ensureWalletConnection = async (): Promise<string | null> => {
  if (!window.ethereum) {
    logger.error('No ethereum object found', null);
    return null;
  }
  
  try {
    // Try to get accounts first through non-intrusive method
    let accounts = await window.ethereum.request({ method: 'eth_accounts' });
    
    // If no accounts, request connection
    if (!accounts || accounts.length === 0) {
      logger.log('No accounts found, requesting connection...');
      accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    }
    
    if (accounts && accounts.length > 0) {
      logger.log('Connected wallet address:', accounts[0]);
      return accounts[0];
    } else {
      logger.error('Failed to get accounts after connection request', null);
      return null;
    }
  } catch (error) {
    logger.error('Error ensuring wallet connection:', error);
    return null;
  }
};

/**
 * Get signer from connected wallet
 */
export const getSigner = (): ethers.Signer => {
  if (!window.ethereum) throw new Error("No crypto wallet found");
  
  // Check connection status but don't block the flow
  try {
    const isConnected = checkEthereumStatus();
    if (!isConnected) {
      logger.warn("Wallet connection issues detected, but proceeding with available provider");
    }
  } catch (error) {
    logger.error("Error checking wallet status:", error);
  }
  
  return new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider).getSigner();
};

/**
 * Get ethers provider
 */
export const getProvider = (): ethers.providers.Web3Provider => {
  if (!window.ethereum) throw new Error("No crypto wallet found");
  return new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
};

/**
 * Switch network to the target chain ID
 */
export const switchNetwork = async (targetChainId: number = CHAIN_IDS.SEPOLIA): Promise<boolean> => {
  if (!window.ethereum) {
    logger.error('No ethereum object found', null);
    return false;
  }
  
  try {
    // Get current chain ID
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainIdNumber = parseInt(currentChainId, 16);
    
    // If already on the right network, return true
    if (currentChainIdNumber === targetChainId) {
      logger.debug(`Already on ${getChainName(targetChainId)}`);
      return true;
    }
    
    logger.log(`Switching from ${getChainName(currentChainIdNumber)} to ${getChainName(targetChainId)}...`);
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      
      logger.log(`Successfully switched to ${getChainName(targetChainId)}`);
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: getChainName(targetChainId),
                rpcUrls: [RPC_URLS[targetChainId]],
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: [`https://sepolia.etherscan.io`],
              },
            ],
          });
          logger.log(`Added and switched to ${getChainName(targetChainId)}`);
          return true;
        } catch (addError) {
          logger.error(`Error adding ${getChainName(targetChainId)} network:`, addError);
          return false;
        }
      }
      logger.error(`Error switching to ${getChainName(targetChainId)}:`, switchError);
      return false;
    }
  } catch (error) {
    logger.error('Error in switchNetwork:', error);
    return false;
  }
};

/**
 * Check if the current network is the target network
 */
export const checkNetwork = async (targetChainId: number = CHAIN_IDS.SEPOLIA): Promise<boolean> => {
  if (!window.ethereum) {
    logger.error('No ethereum object found', null);
    return false;
  }
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    
    if (currentChainId !== targetChainId) {
      logger.warn(`Wrong network detected. Current: ${getChainName(currentChainId)}, Required: ${getChainName(targetChainId)}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking network:', error);
    return false;
  }
}; 