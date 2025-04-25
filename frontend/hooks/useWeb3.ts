import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { checkEthereumStatus, ensureWalletConnection, getSigner, getProvider, logger } from '../utils/contracts/helpers';

/**
 * Hook for Web3 wallet connection and Ethereum interaction
 */
export default function useWeb3() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Connect wallet and set account
   */
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!window.ethereum) {
        throw new Error('No crypto wallet found');
      }
      
      const address = await ensureWalletConnection();
      if (!address) {
        throw new Error('Failed to connect wallet');
      }
      
      setAccount(address);
      setIsConnected(true);
      
      // Get current chain ID
      const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
      const network = await provider.getNetwork();
      setChainId(network.chainId);
      
      return address;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error connecting wallet';
      logger.error('Error connecting wallet:', error);
      setError(errorMessage);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setError(null);
  }, []);

  /**
   * Get network name based on chain ID
   */
  const getNetworkName = useCallback(() => {
    if (!chainId) return 'Unknown';
    
    switch (chainId) {
      case 1:
        return 'Ethereum Mainnet';
      case 11155111:
        return 'Sepolia';
      case 80001:
        return 'Mumbai';
      default:
        return `Chain ID ${chainId}`;
    }
  }, [chainId]);

  /**
   * Check if the current network is supported
   */
  const isSupportedNetwork = useCallback(() => {
    if (!chainId) return false;
    
    // Add your supported networks here
    const supportedNetworks = [1, 11155111, 80001];
    return supportedNetworks.includes(chainId);
  }, [chainId]);

  /**
   * Handle account changes
   */
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      disconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      setIsConnected(true);
    }
  }, [account, disconnect]);

  /**
   * Handle chain changes
   */
  const handleChainChanged = useCallback((chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    
    // Refresh page as recommended by MetaMask
    window.location.reload();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (window.ethereum) {
      // Check initial connection status
      checkEthereumStatus() && connect();
      
      // Set up listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', disconnect);
      
      // Clean up listeners
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
        window.ethereum?.removeListener('disconnect', disconnect);
      };
    }
  }, [connect, disconnect, handleAccountsChanged, handleChainChanged]);

  return {
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    getNetworkName,
    isSupportedNetwork,
    getSigner: () => getSigner(),
    getProvider: () => getProvider()
  };
} 