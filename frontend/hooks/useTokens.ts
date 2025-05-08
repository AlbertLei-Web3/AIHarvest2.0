import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import useWeb3 from './useWeb3';
import { getTokenContract, getTokenInfo, getTokenBalance, getTokenAllowance, approveToken } from '../utils/contracts/erc20';
import { TokenInfo } from '../utils/contracts/types';
import { logger } from '../utils/contracts/helpers';
import { TOKENS } from '../utils/contracts/addresses';

/**
 * Hook for ERC20 token operations
 */
export default function useTokens() {
  const { account, isConnected } = useWeb3();
  // 【精华】使用状态缓存机制减少RPC调用，提高前端性能
  // 【Essential Highlight】Uses state caching to reduce RPC calls and improve frontend performance
  const [loadingInfo, setLoadingInfo] = useState<Record<string, boolean>>({});
  const [loadingBalance, setLoadingBalance] = useState<Record<string, boolean>>({});
  const [loadingAllowance, setLoadingAllowance] = useState<Record<string, boolean>>({});
  const [loadingApproval, setLoadingApproval] = useState<Record<string, boolean>>({});
  const [tokenInfoCache, setTokenInfoCache] = useState<Record<string, TokenInfo>>({});
  const [balanceCache, setBalanceCache] = useState<Record<string, string>>({});
  const [allowanceCache, setAllowanceCache] = useState<Record<string, Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Reset all error states
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Get token info
   */
  const fetchTokenInfo = useCallback(async (
    tokenAddress: string
  ): Promise<TokenInfo | null> => {
    if (!ethers.utils.isAddress(tokenAddress)) {
      setErrors(prev => ({ ...prev, [`info_${tokenAddress}`]: 'Invalid token address' }));
      return null;
    }
    
    // Check cache first
    if (tokenInfoCache[tokenAddress]) {
      return tokenInfoCache[tokenAddress];
    }

    try {
      setLoadingInfo(prev => ({ ...prev, [tokenAddress]: true }));
      const info = await getTokenInfo(tokenAddress);
      
      // Update cache
      setTokenInfoCache(prev => ({
        ...prev,
        [tokenAddress]: info
      }));
      
      return info;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching token info';
      logger.error(`Error fetching token info for ${tokenAddress}:`, error);
      setErrors(prev => ({ ...prev, [`info_${tokenAddress}`]: errorMessage }));
      return null;
    } finally {
      setLoadingInfo(prev => ({ ...prev, [tokenAddress]: false }));
    }
  }, [tokenInfoCache]);

  /**
   * Get token balance
   */
  const fetchBalance = useCallback(async (
    tokenAddress: string,
    ownerAddress?: string
  ): Promise<string> => {
    if (!ethers.utils.isAddress(tokenAddress)) {
      setErrors(prev => ({ ...prev, [`balance_${tokenAddress}`]: 'Invalid token address' }));
      return "0";
    }

    const addressToCheck = ownerAddress || account;
    if (!addressToCheck) {
      setErrors(prev => ({ ...prev, [`balance_${tokenAddress}`]: 'No owner address provided' }));
      return "0";
    }
    
    try {
      setLoadingBalance(prev => ({ ...prev, [tokenAddress]: true }));
      const balance = await getTokenBalance(tokenAddress, addressToCheck);
      
      // Update cache
      setBalanceCache(prev => ({
        ...prev,
        [tokenAddress]: balance
      }));
      
      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching balance';
      logger.error(`Error fetching balance for ${tokenAddress}:`, error);
      setErrors(prev => ({ ...prev, [`balance_${tokenAddress}`]: errorMessage }));
      return "0";
    } finally {
      setLoadingBalance(prev => ({ ...prev, [tokenAddress]: false }));
    }
  }, [account]);

  /**
   * Get token allowance
   */
  const fetchAllowance = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    ownerAddress?: string
  ): Promise<string> => {
    // 【精华】代币授权查询系统，支持缓存以减少链上调用
    // 【Essential Highlight】Token allowance query system with caching to reduce on-chain calls
    if (!ethers.utils.isAddress(tokenAddress) || !ethers.utils.isAddress(spenderAddress)) {
      setErrors(prev => ({ ...prev, [`allowance_${tokenAddress}`]: 'Invalid addresses' }));
      return "0";
    }

    const addressToCheck = ownerAddress || account;
    if (!addressToCheck) {
      setErrors(prev => ({ ...prev, [`allowance_${tokenAddress}`]: 'No owner address provided' }));
      return "0";
    }

    const cacheKey = `${tokenAddress}_${addressToCheck}_${spenderAddress}`;
    
    try {
      setLoadingAllowance(prev => ({ ...prev, [cacheKey]: true }));
      const allowance = await getTokenAllowance(tokenAddress, addressToCheck, spenderAddress);
      
      // Update cache
      setAllowanceCache(prev => {
        const tokenCache = prev[tokenAddress] || {};
        return {
          ...prev,
          [tokenAddress]: {
            ...tokenCache,
            [spenderAddress]: allowance
          }
        };
      });
      
      return allowance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching allowance';
      logger.error(`Error fetching allowance for ${tokenAddress}:`, error);
      setErrors(prev => ({ ...prev, [`allowance_${tokenAddress}`]: errorMessage }));
      return "0";
    } finally {
      setLoadingAllowance(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [account]);

  /**
   * Approve token spending
   */
  const approve = useCallback(async (
    tokenAddress: string,
    amount: string,
    spenderAddress: string
  ): Promise<boolean> => {
    // 【精华】代币授权流程，包含完整的错误处理与用户反馈
    // 【Essential Highlight】Token approval process with comprehensive error handling and user feedback
    if (!isConnected) {
      setErrors(prev => ({ ...prev, [`approve_${tokenAddress}`]: 'Wallet not connected' }));
      return false;
    }

    if (!ethers.utils.isAddress(tokenAddress) || !ethers.utils.isAddress(spenderAddress)) {
      setErrors(prev => ({ ...prev, [`approve_${tokenAddress}`]: 'Invalid addresses' }));
      return false;
    }

    const cacheKey = `${tokenAddress}_${spenderAddress}`;
    
    try {
      setLoadingApproval(prev => ({ ...prev, [cacheKey]: true }));
      
      // Get token information for better UX
      const tokenInfo = await fetchTokenInfo(tokenAddress);
      logger.log(`Approving ${amount} ${tokenInfo?.symbol || 'tokens'} for ${spenderAddress}`);
      
      const tx = await approveToken(tokenAddress, amount, spenderAddress);
      logger.log(`Approval transaction submitted: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      logger.log(`Approval transaction confirmed in block ${receipt.blockNumber}`);
      
      // Clear any existing errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`approve_${tokenAddress}`];
        return newErrors;
      });
      
      // Update allowance cache
      if (account) {
        await fetchAllowance(tokenAddress, spenderAddress, account);
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error approving token';
      logger.error(`Error approving token ${tokenAddress}:`, error);
      setErrors(prev => ({ ...prev, [`approve_${tokenAddress}`]: errorMessage }));
      return false;
    } finally {
      setLoadingApproval(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [isConnected, fetchTokenInfo, fetchAllowance, account]);

  /**
   * Check if token has sufficient allowance
   */
  const hasSufficientAllowance = useCallback(async (
    tokenAddress: string,
    amount: string,
    spenderAddress: string
  ): Promise<boolean> => {
    if (!account) return false;
    
    try {
      const allowance = await fetchAllowance(tokenAddress, spenderAddress);
      const tokenInfo = await fetchTokenInfo(tokenAddress);
      
      if (!tokenInfo) return false;
      
      const amountBN = ethers.utils.parseUnits(amount, tokenInfo.decimals);
      const allowanceBN = ethers.utils.parseUnits(allowance, tokenInfo.decimals);
      
      return allowanceBN.gte(amountBN);
    } catch (error) {
      logger.error(`Error checking allowance for ${tokenAddress}:`, error);
      return false;
    }
  }, [account, fetchAllowance, fetchTokenInfo]);

  /**
   * Add token to MetaMask
   */
  const addTokenToWallet = useCallback(async (
    tokenAddress: string
  ): Promise<boolean> => {
    if (!window.ethereum?.isMetaMask) {
      setErrors(prev => ({ ...prev, [`addToken_${tokenAddress}`]: 'MetaMask not available' }));
      return false;
    }

    try {
      const tokenInfo = await fetchTokenInfo(tokenAddress);
      if (!tokenInfo) {
        throw new Error("Could not fetch token information");
      }

      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            name: tokenInfo.name || tokenInfo.symbol,
          },
        } as any
      });
      
      logger.log(`Added ${tokenInfo.symbol} to wallet`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error adding token to wallet';
      logger.error(`Error adding token ${tokenAddress} to wallet:`, error);
      setErrors(prev => ({ ...prev, [`addToken_${tokenAddress}`]: errorMessage }));
      return false;
    }
  }, [fetchTokenInfo]);

  return {
    // Known tokens
    TOKENS,
    
    // State
    tokenInfoCache,
    balanceCache,
    allowanceCache,
    errors,
    
    // Loading states
    loadingInfo,
    loadingBalance,
    loadingAllowance,
    loadingApproval,
    
    // Methods
    fetchTokenInfo,
    fetchBalance,
    fetchAllowance,
    approve,
    hasSufficientAllowance,
    addTokenToWallet,
    clearErrors
  };
} 