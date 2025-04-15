import { useContractCall } from './core/useContractCall';
import { useContractTransaction } from './core/useContractTransaction';
import { useAccount, useNetwork, useContractRead } from 'wagmi';
import { SimpleSwapRouterABI } from '../utils/abis';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import { useState, useEffect, useCallback } from 'react';
import { BigNumber } from 'ethers';
import { getDeadlineTimestamp } from '../utils/helpers';

export const useSimpleSwap = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [routerAddress, setRouterAddress] = useState<`0x${string}`>();

  // Set contract address based on current network
  useEffect(() => {
    if (chain?.id) {
      const addresses = CONTRACT_ADDRESSES[chain.id] || CONTRACT_ADDRESSES[1337]; // Default to hardhat
      setRouterAddress(addresses.SWAP_ROUTER as `0x${string}`);
    }
  }, [chain?.id]);

  // Get fee information
  const {
    data: swapFee,
    isLoading: isSwapFeeLoading,
    error: swapFeeError,
  } = useContractCall<BigNumber>({
    address: routerAddress as `0x${string}`,
    abi: SimpleSwapRouterABI,
    functionName: 'swapFee',
    enabled: !!routerAddress,
  });

  const {
    data: protocolFeeCut,
    isLoading: isProtocolFeeCutLoading,
    error: protocolFeeCutError,
  } = useContractCall<BigNumber>({
    address: routerAddress as `0x${string}`,
    abi: SimpleSwapRouterABI,
    functionName: 'protocolFeeCut',
    enabled: !!routerAddress,
  });

  // Transaction functions
  const swapTransaction = useContractTransaction({
    address: routerAddress as `0x${string}`,
    abi: SimpleSwapRouterABI,
    functionName: 'swapExactTokensForTokens',
  });

  const addLiquidityTransaction = useContractTransaction({
    address: routerAddress as `0x${string}`,
    abi: SimpleSwapRouterABI,
    functionName: 'addLiquidity',
  });

  const removeLiquidityTransaction = useContractTransaction({
    address: routerAddress as `0x${string}`,
    abi: SimpleSwapRouterABI,
    functionName: 'removeLiquidity',
  });

  const createPairTransaction = useContractTransaction({
    address: routerAddress as `0x${string}`,
    abi: SimpleSwapRouterABI,
    functionName: 'createPair',
  });

  // Get pair address
  const getPair = useCallback(async (tokenA: string, tokenB: string): Promise<string | null> => {
    if (!routerAddress) return null;

    try {
      const result = await useContractRead({
        address: routerAddress,
        abi: SimpleSwapRouterABI,
        functionName: 'getPair',
        args: [tokenA, tokenB],
      });
      
      return result.data as string;
    } catch (error) {
      console.error('Error getting pair:', error);
      return null;
    }
  }, [routerAddress]);

  // Get pool reserves
  const getReserves = useCallback(async (pairAddress: string, tokenA: string, tokenB: string) => {
    if (!routerAddress) return { reserveA: BigNumber.from(0), reserveB: BigNumber.from(0) };

    try {
      const result = await useContractRead({
        address: routerAddress,
        abi: SimpleSwapRouterABI,
        functionName: 'getReserves',
        args: [pairAddress, tokenA, tokenB],
      });
      
      if (result.data) {
        const data = result.data as [BigNumber, BigNumber];
        return { reserveA: data[0], reserveB: data[1] };
      }
      
      return { reserveA: BigNumber.from(0), reserveB: BigNumber.from(0) };
    } catch (error) {
      console.error('Error getting reserves:', error);
      return { reserveA: BigNumber.from(0), reserveB: BigNumber.from(0) };
    }
  }, [routerAddress]);

  // Get amount out
  const getAmountOut = useCallback(async (amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) => {
    if (!routerAddress) return BigNumber.from(0);

    try {
      const result = await useContractRead({
        address: routerAddress,
        abi: SimpleSwapRouterABI,
        functionName: 'getAmountOut',
        args: [amountIn, reserveIn, reserveOut],
      });
      
      return (result.data as BigNumber) || BigNumber.from(0);
    } catch (error) {
      console.error('Error getting amount out:', error);
      return BigNumber.from(0);
    }
  }, [routerAddress]);

  // Execute a swap
  const swap = async (
    amountIn: BigNumber,
    amountOutMin: BigNumber,
    path: string[],
  ) => {
    if (!address) throw new Error('No account connected');
    
    return swapTransaction.execute([
      amountIn,
      amountOutMin,
      path,
      address,
    ]);
  };

  // Add liquidity
  const addLiquidity = async (
    tokenA: string,
    tokenB: string,
    amountADesired: BigNumber,
    amountBDesired: BigNumber,
    amountAMin: BigNumber,
    amountBMin: BigNumber,
  ) => {
    if (!address) throw new Error('No account connected');
    
    return addLiquidityTransaction.execute([
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      address,
    ]);
  };

  // Remove liquidity
  const removeLiquidity = async (
    tokenA: string,
    tokenB: string,
    liquidity: BigNumber,
    amountAMin: BigNumber,
    amountBMin: BigNumber,
  ) => {
    if (!address) throw new Error('No account connected');
    
    return removeLiquidityTransaction.execute([
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      address,
    ]);
  };

  // Create liquidity pair
  const createPair = async (tokenA: string, tokenB: string) => {
    return createPairTransaction.execute([tokenA, tokenB]);
  };

  return {
    routerAddress,
    swapFee,
    protocolFeeCut,
    isLoading: isSwapFeeLoading || isProtocolFeeCutLoading,
    error: swapFeeError || protocolFeeCutError,
    
    // View functions
    getPair,
    getReserves,
    getAmountOut,
    
    // Transaction functions
    swap,
    addLiquidity,
    removeLiquidity,
    createPair,
    
    // Transaction states
    isSwapping: swapTransaction.isPending,
    isAddingLiquidity: addLiquidityTransaction.isPending,
    isRemovingLiquidity: removeLiquidityTransaction.isPending,
    isCreatingPair: createPairTransaction.isPending,
    
    // Transaction errors
    swapError: swapTransaction.error,
    addLiquidityError: addLiquidityTransaction.error,
    removeLiquidityError: removeLiquidityTransaction.error,
    createPairError: createPairTransaction.error,
  };
}; 