import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import useWeb3 from './useWeb3';
import useTokens from './useTokens';
import { 
  addLiquidity,
  removeLiquidity,
  approveLPToken,
  calculateLPTokenAmount,
  getLPTokenInfo,
  getLPTokenBalance,
  getPairReserves,
  getUserLiquidityPositions,
  createTokenPair,
  addLPTokenToWallet,
  logger,
  LiquidityPosition,
  CONTRACTS
} from '../utils/contracts';

/**
 * Hook for liquidity pool operations
 */
export default function useLiquidity() {
  const { account, isConnected } = useWeb3();
  const { approve, fetchTokenInfo } = useTokens();
  
  const [isAddingLiquidity, setIsAddingLiquidity] = useState<boolean>(false);
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState<boolean>(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState<boolean>(false);
  const [isApprovingLPToken, setIsApprovingLPToken] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Clear all error states
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Load user's liquidity positions
   */
  const loadPositions = useCallback(async (
    tokenPairs?: [string, string][]
  ): Promise<LiquidityPosition[]> => {
    if (!account) {
      setErrors(prev => ({ ...prev, loadPositions: 'Wallet not connected' }));
      return [];
    }
    
    try {
      setIsLoadingPositions(true);
      clearErrors();
      
      // If no pairs specified, load predefined pairs or all positions
      const pairsToCheck = tokenPairs || [];
      
      const userPositions = await getUserLiquidityPositions(account, pairsToCheck);
      setPositions(userPositions);
      
      logger.log(`Loaded ${userPositions.length} liquidity positions`);
      return userPositions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading liquidity positions';
      logger.error(`Error loading liquidity positions:`, error);
      setErrors(prev => ({ ...prev, loadPositions: errorMessage }));
      return [];
    } finally {
      setIsLoadingPositions(false);
    }
  }, [account, clearErrors]);

  /**
   * Create a token pair
   */
  const createPair = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string
  ): Promise<string | null> => {
    if (!isConnected) {
      setErrors(prev => ({ ...prev, createPair: 'Wallet not connected' }));
      return null;
    }
    
    try {
      // Get token info for better UX
      const [tokenAInfo, tokenBInfo] = await Promise.all([
        fetchTokenInfo(tokenAAddress),
        fetchTokenInfo(tokenBAddress)
      ]);
      
      logger.log(`Creating pair for ${tokenAInfo?.symbol || tokenAAddress} and ${tokenBInfo?.symbol || tokenBAddress}`);
      
      const pairAddress = await createTokenPair(tokenAAddress, tokenBAddress);
      logger.log(`Pair created at ${pairAddress}`);
      
      return pairAddress;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating token pair';
      logger.error(`Error creating token pair:`, error);
      setErrors(prev => ({ ...prev, createPair: errorMessage }));
      return null;
    }
  }, [isConnected, fetchTokenInfo]);

  /**
   * Get reserves for a token pair
   */
  const getReserves = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string
  ): Promise<[string, string]> => {
    try {
      return await getPairReserves(tokenAAddress, tokenBAddress);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error getting reserves';
      logger.error(`Error getting reserves:`, error);
      setErrors(prev => ({ ...prev, getReserves: errorMessage }));
      return ["0", "0"];
    }
  }, []);

  /**
   * Calculate LP token amount for adding liquidity
   */
  const calculateLP = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string,
    amountADesired: string,
    amountBDesired: string
  ): Promise<string> => {
    const cacheKey = `${tokenAAddress}_${tokenBAddress}_${amountADesired}_${amountBDesired}`;
    
    try {
      setIsCalculating(prev => ({ ...prev, [cacheKey]: true }));
      
      return await calculateLPTokenAmount(
        tokenAAddress,
        tokenBAddress,
        amountADesired,
        amountBDesired
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error calculating LP amount';
      logger.error(`Error calculating LP amount:`, error);
      setErrors(prev => ({ ...prev, calculateLP: errorMessage }));
      return "0";
    } finally {
      setIsCalculating(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, []);

  /**
   * Approve LP token
   */
  const approveLP = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string,
    amount: string,
    bypassChecks: boolean = false
  ): Promise<boolean> => {
    if (!isConnected) {
      setErrors(prev => ({ ...prev, approveLP: 'Wallet not connected' }));
      return false;
    }
    
    try {
      setIsApprovingLPToken(true);
      clearErrors();
      
      // Get token info for better logging
      const [tokenAInfo, tokenBInfo] = await Promise.all([
        fetchTokenInfo(tokenAAddress),
        fetchTokenInfo(tokenBAddress)
      ]);
      
      logger.log(`Approving LP token for ${tokenAInfo?.symbol || 'token A'} and ${tokenBInfo?.symbol || 'token B'}`);
      
      const tx = await approveLPToken(tokenAAddress, tokenBAddress, amount, bypassChecks);
      logger.log(`LP token approval transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`LP token approval confirmed in block ${receipt.blockNumber}`);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error approving LP token';
      logger.error(`Error approving LP token:`, error);
      setErrors(prev => ({ ...prev, approveLP: errorMessage }));
      return false;
    } finally {
      setIsApprovingLPToken(false);
    }
  }, [isConnected, clearErrors, fetchTokenInfo]);

  /**
   * Add liquidity to a pair
   */
  const addLP = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string,
    amountADesired: string,
    amountBDesired: string,
    slippageTolerance: number = 0.5
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!isConnected || !account) {
      setErrors(prev => ({ ...prev, addLiquidity: 'Wallet not connected' }));
      return { success: false };
    }
    
    try {
      setIsAddingLiquidity(true);
      clearErrors();
      
      // Get token info for better UX
      const [tokenAInfo, tokenBInfo] = await Promise.all([
        fetchTokenInfo(tokenAAddress),
        fetchTokenInfo(tokenBAddress)
      ]);
      
      // Approve token A spending if needed
      const approvedA = await approve(
        tokenAAddress,
        amountADesired,
        CONTRACTS.ROUTER_ADDRESS
      );
      
      if (!approvedA) {
        throw new Error(`Failed to approve ${tokenAInfo?.symbol || 'token A'}`);
      }
      
      // Approve token B spending if needed
      const approvedB = await approve(
        tokenBAddress,
        amountBDesired,
        CONTRACTS.ROUTER_ADDRESS
      );
      
      if (!approvedB) {
        throw new Error(`Failed to approve ${tokenBInfo?.symbol || 'token B'}`);
      }
      
      // Add liquidity
      logger.log(`Adding liquidity: ${amountADesired} ${tokenAInfo?.symbol || 'tokens'} and ${amountBDesired} ${tokenBInfo?.symbol || 'tokens'}`);
      
      const tx = await addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountADesired,
        amountBDesired,
        slippageTolerance
      );
      
      logger.log(`Add liquidity transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Add liquidity confirmed in block ${receipt.blockNumber}`);
      
      // Refresh positions
      if (account) {
        await loadPositions([[tokenAAddress, tokenBAddress]]);
      }
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error adding liquidity';
      logger.error(`Error adding liquidity:`, error);
      setErrors(prev => ({ ...prev, addLiquidity: errorMessage }));
      return { success: false };
    } finally {
      setIsAddingLiquidity(false);
    }
  }, [isConnected, account, clearErrors, fetchTokenInfo, approve, loadPositions]);

  /**
   * Remove liquidity from a pair
   */
  const removeLP = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string,
    liquidityAmount: string,
    slippageTolerance: number = 0.5,
    bypassChecks: boolean = false
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!isConnected || !account) {
      setErrors(prev => ({ ...prev, removeLiquidity: 'Wallet not connected' }));
      return { success: false };
    }
    
    try {
      setIsRemovingLiquidity(true);
      clearErrors();
      
      // Get token info for better UX
      const [tokenAInfo, tokenBInfo] = await Promise.all([
        fetchTokenInfo(tokenAAddress),
        fetchTokenInfo(tokenBAddress)
      ]);
      
      // Approve LP token spending if needed
      const approvedLP = await approveLP(
        tokenAAddress,
        tokenBAddress,
        liquidityAmount,
        bypassChecks
      );
      
      if (!approvedLP) {
        throw new Error(`Failed to approve LP token`);
      }
      
      // Remove liquidity
      logger.log(`Removing ${liquidityAmount} LP tokens for ${tokenAInfo?.symbol || 'token A'} and ${tokenBInfo?.symbol || 'token B'}`);
      
      const tx = await removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        liquidityAmount,
        slippageTolerance,
        bypassChecks
      );
      
      logger.log(`Remove liquidity transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Remove liquidity confirmed in block ${receipt.blockNumber}`);
      
      // Refresh positions
      if (account) {
        await loadPositions([[tokenAAddress, tokenBAddress]]);
      }
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error removing liquidity';
      logger.error(`Error removing liquidity:`, error);
      setErrors(prev => ({ ...prev, removeLiquidity: errorMessage }));
      return { success: false };
    } finally {
      setIsRemovingLiquidity(false);
    }
  }, [isConnected, account, clearErrors, fetchTokenInfo, approveLP, loadPositions]);

  /**
   * Get pair information
   */
  const getPairInfo = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string
  ) => {
    try {
      return await getLPTokenInfo(tokenAAddress, tokenBAddress);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error getting LP token info';
      logger.error(`Error getting LP token info:`, error);
      setErrors(prev => ({ ...prev, getPairInfo: errorMessage }));
      return {
        lpTokenAddress: ethers.constants.AddressZero,
        pairAddress: ethers.constants.AddressZero,
        exists: false,
        totalSupply: "0"
      };
    }
  }, []);

  /**
   * Get LP token balance
   */
  const getLPBalance = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string,
    userAddress?: string
  ): Promise<string> => {
    const addressToCheck = userAddress || account;
    
    if (!addressToCheck) {
      setErrors(prev => ({ ...prev, getLPBalance: 'No user address provided' }));
      return "0";
    }
    
    try {
      return await getLPTokenBalance(tokenAAddress, tokenBAddress, addressToCheck);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error getting LP token balance';
      logger.error(`Error getting LP token balance:`, error);
      setErrors(prev => ({ ...prev, getLPBalance: errorMessage }));
      return "0";
    }
  }, [account]);

  /**
   * Add LP token to wallet (MetaMask)
   */
  const addToWallet = useCallback(async (
    tokenAAddress: string,
    tokenBAddress: string
  ): Promise<boolean> => {
    try {
      return await addLPTokenToWallet(tokenAAddress, tokenBAddress);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error adding LP token to wallet';
      logger.error(`Error adding LP token to wallet:`, error);
      setErrors(prev => ({ ...prev, addToWallet: errorMessage }));
      return false;
    }
  }, []);

  return {
    // State
    positions,
    errors,
    
    // Loading states
    isAddingLiquidity,
    isRemovingLiquidity,
    isLoadingPositions,
    isApprovingLPToken,
    isCalculating,
    
    // Methods
    createPair,
    getReserves,
    calculateLP,
    addLP,
    approveLP,
    removeLP,
    getPairInfo,
    getLPBalance,
    loadPositions,
    addToWallet,
    clearErrors
  };
} 