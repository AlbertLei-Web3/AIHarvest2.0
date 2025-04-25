/**
 * Common utility functions for contract interactions
 */
import { ethers } from 'ethers';

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