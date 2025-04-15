import { useContractCall } from './core/useContractCall';
import { useContractTransaction } from './core/useContractTransaction';
import { useAccount, useNetwork } from 'wagmi';
import { AIHTokenABI } from '../utils/abis';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import { useState, useEffect } from 'react';
import { BigNumber } from 'ethers';

export const useAIHToken = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [tokenAddress, setTokenAddress] = useState<`0x${string}`>();

  // Set contract address based on current network
  useEffect(() => {
    if (chain?.id) {
      const addresses = CONTRACT_ADDRESSES[chain.id] || CONTRACT_ADDRESSES[1337]; // Default to hardhat
      setTokenAddress(addresses.AIH_TOKEN as `0x${string}`);
    }
  }, [chain?.id]);

  // Get token info
  const {
    data: name,
    isLoading: isNameLoading,
    error: nameError,
  } = useContractCall<string>({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'name',
    enabled: !!tokenAddress,
  });

  const {
    data: symbol,
    isLoading: isSymbolLoading,
    error: symbolError,
  } = useContractCall<string>({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'symbol',
    enabled: !!tokenAddress,
  });

  const {
    data: decimals,
    isLoading: isDecimalsLoading,
    error: decimalsError,
  } = useContractCall<number>({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'decimals',
    enabled: !!tokenAddress,
  });

  const {
    data: totalSupply,
    isLoading: isTotalSupplyLoading,
    error: totalSupplyError,
  } = useContractCall<BigNumber>({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'totalSupply',
    enabled: !!tokenAddress,
  });

  const {
    data: balance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useContractCall<BigNumber>({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    enabled: !!address && !!tokenAddress,
  });

  // Transaction functions
  const approveTransaction = useContractTransaction({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'approve',
  });

  const transferTransaction = useContractTransaction({
    address: tokenAddress as `0x${string}`,
    abi: AIHTokenABI,
    functionName: 'transfer',
  });

  // Approve another address to spend tokens
  const approve = async (spender: string, amount: BigNumber) => {
    return approveTransaction.execute([spender, amount]);
  };

  // Transfer tokens to another address
  const transfer = async (to: string, amount: BigNumber) => {
    return transferTransaction.execute([to, amount]);
  };

  return {
    tokenAddress,
    name,
    symbol,
    decimals,
    totalSupply,
    balance,
    isLoading: 
      isNameLoading || 
      isSymbolLoading || 
      isDecimalsLoading || 
      isTotalSupplyLoading || 
      isBalanceLoading,
    error: 
      nameError || 
      symbolError || 
      decimalsError || 
      totalSupplyError || 
      balanceError,
    // Actions
    approve,
    transfer,
    // Transaction states
    isApproving: approveTransaction.isPending,
    isTransferring: transferTransaction.isPending,
    approveError: approveTransaction.error,
    transferError: transferTransaction.error,
  };
}; 