import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import useWeb3 from './useWeb3';
import useTokens from './useTokens';
import { 
  getSwapQuote, 
  executeSwap, 
  logger,
  getPairReserves
} from '../utils/contracts';

/**
 * Hook for token swap operations
 */
export default function useSwap() {
  const { account, isConnected } = useWeb3();
  const { fetchTokenInfo, hasSufficientAllowance, approve } = useTokens();
  
  const [isExecutingSwap, setIsExecutingSwap] = useState<boolean>(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  /**
   * Get price quote for swapping tokens
   */
  const getQuote = useCallback(async (
    fromTokenAddress: string,
    toTokenAddress: string,
    amountIn: string
  ): Promise<string> => {
    if (!ethers.utils.isAddress(fromTokenAddress) || !ethers.utils.isAddress(toTokenAddress)) {
      setQuoteError('Invalid token addresses');
      return "0";
    }

    if (parseFloat(amountIn) <= 0) {
      setQuoteError('Amount must be greater than 0');
      return "0";
    }
    
    try {
      setIsLoadingQuote(true);
      setQuoteError(null);
      
      // Get token info for better logging
      const [fromInfo, toInfo] = await Promise.all([
        fetchTokenInfo(fromTokenAddress),
        fetchTokenInfo(toTokenAddress)
      ]);
      
      logger.debug(`Getting quote for ${amountIn} ${fromInfo?.symbol || 'tokens'} to ${toInfo?.symbol || 'tokens'}`);
      
      // Get the quote
      const outputAmount = await getSwapQuote(fromTokenAddress, toTokenAddress, amountIn);
      
      logger.debug(`Quote: ${outputAmount} ${toInfo?.symbol || 'tokens'}`);
      return outputAmount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error getting swap quote';
      logger.error(`Error getting swap quote:`, error);
      setQuoteError(errorMessage);
      return "0";
    } finally {
      setIsLoadingQuote(false);
    }
  }, [fetchTokenInfo]);

  /**
   * Execute a token swap
   */
  const swap = useCallback(async (
    fromTokenAddress: string,
    toTokenAddress: string,
    amountIn: string,
    minAmountOut: string,
    slippageTolerance: number = 0.5
  ): Promise<{ success: boolean; txHash?: string }> => {
    if (!isConnected || !account) {
      setSwapError('Wallet not connected');
      return { success: false };
    }
    
    if (!ethers.utils.isAddress(fromTokenAddress) || !ethers.utils.isAddress(toTokenAddress)) {
      setSwapError('Invalid token addresses');
      return { success: false };
    }

    if (parseFloat(amountIn) <= 0) {
      setSwapError('Amount must be greater than 0');
      return { success: false };
    }
    
    try {
      setIsExecutingSwap(true);
      setSwapError(null);
      
      // Get token info for better UX
      const [fromInfo, toInfo] = await Promise.all([
        fetchTokenInfo(fromTokenAddress),
        fetchTokenInfo(toTokenAddress)
      ]);
      
      // Check allowance
      const hasAllowance = await hasSufficientAllowance(fromTokenAddress, amountIn, fromInfo?.address || fromTokenAddress);
      
      if (!hasAllowance) {
        logger.log(`Insufficient allowance for ${fromInfo?.symbol || 'token'}, requesting approval`);
        
        // Request approval
        const approved = await approve(fromTokenAddress, amountIn, fromInfo?.address || fromTokenAddress);
        
        if (!approved) {
          throw new Error('Token approval failed');
        }
      }
      
      // Execute the swap
      logger.log(`Swapping ${amountIn} ${fromInfo?.symbol || 'tokens'} for ${toInfo?.symbol || 'tokens'}`);
      
      const tx = await executeSwap(
        fromTokenAddress,
        toTokenAddress,
        amountIn,
        minAmountOut,
        slippageTolerance
      );
      
      logger.log(`Swap transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Swap confirmed in block ${receipt.blockNumber}`);
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error executing swap';
      logger.error(`Swap error:`, error);
      setSwapError(errorMessage);
      return { success: false };
    } finally {
      setIsExecutingSwap(false);
    }
  }, [isConnected, account, fetchTokenInfo, hasSufficientAllowance, approve]);

  /**
   * Get price impact for a swap
   */
  const calculatePriceImpact = useCallback(async (
    fromTokenAddress: string,
    toTokenAddress: string,
    amountIn: string
  ): Promise<number> => {
    try {
      if (!ethers.utils.isAddress(fromTokenAddress) || !ethers.utils.isAddress(toTokenAddress)) {
        return 0;
      }
      
      if (parseFloat(amountIn) <= 0) {
        return 0;
      }
      
      // Get token information
      const [fromInfo, toInfo] = await Promise.all([
        fetchTokenInfo(fromTokenAddress),
        fetchTokenInfo(toTokenAddress)
      ]);
      
      if (!fromInfo || !toInfo) {
        return 0;
      }
      
      // Get reserves
      const [reserveA, reserveB] = await getPairReserves(fromTokenAddress, toTokenAddress);
      
      // Convert to numbers
      const reserveANumber = parseFloat(reserveA);
      const reserveBNumber = parseFloat(reserveB);
      
      if (reserveANumber <= 0 || reserveBNumber <= 0) {
        return 0;
      }
      
      // Get the amount out
      const amountOut = await getQuote(fromTokenAddress, toTokenAddress, amountIn);
      const amountOutNumber = parseFloat(amountOut);
      
      if (amountOutNumber <= 0) {
        return 0;
      }
      
      // Calculate the spot price (without slippage)
      const spotPrice = reserveBNumber / reserveANumber;
      
      // Calculate the execution price
      const amountInNumber = parseFloat(amountIn);
      const executionPrice = amountOutNumber / amountInNumber;
      
      // Calculate price impact
      const priceImpact = Math.abs(1 - executionPrice / spotPrice) * 100;
      
      return Math.min(priceImpact, 100); // Cap at 100%
    } catch (error) {
      logger.error(`Error calculating price impact:`, error);
      return 0;
    }
  }, [fetchTokenInfo, getQuote]);

  return {
    // State
    isExecutingSwap,
    isLoadingQuote,
    swapError,
    quoteError,
    
    // Methods
    getQuote,
    swap,
    calculatePriceImpact,
    
    // Reset errors
    resetErrors: useCallback(() => {
      setSwapError(null);
      setQuoteError(null);
    }, [])
  };
} 