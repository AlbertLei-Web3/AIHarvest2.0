import { useContractCall } from './core/useContractCall';
import { useContractTransaction } from './core/useContractTransaction';
import { useAccount, useNetwork } from 'wagmi';
import { SimpleFarmABI } from '../utils/abis';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import { useState, useEffect } from 'react';
import { BigNumber } from 'ethers';

interface PoolInfo {
  lpToken: string;
  allocationPoints: BigNumber;
  lastRewardBlock: BigNumber;
  accAIHPerShare: BigNumber;
  totalStaked: BigNumber;
}

interface UserInfo {
  amount: BigNumber;
  rewardDebt: BigNumber;
}

export const useSimpleFarm = (poolId?: number) => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [farmAddress, setFarmAddress] = useState<`0x${string}`>();

  // Set contract address based on current network
  useEffect(() => {
    if (chain?.id) {
      const addresses = CONTRACT_ADDRESSES[chain.id] || CONTRACT_ADDRESSES[1337]; // Default to hardhat
      setFarmAddress(addresses.FARM as `0x${string}`);
    }
  }, [chain?.id]);

  // Get farm info
  const {
    data: AIHPerBlock,
    isLoading: isAIHPerBlockLoading,
    error: AIHPerBlockError,
  } = useContractCall<BigNumber>({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'AIHPerBlock',
    enabled: !!farmAddress,
  });

  const {
    data: totalAllocationPoints,
    isLoading: isTotalAllocationPointsLoading,
    error: totalAllocationPointsError,
  } = useContractCall<BigNumber>({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'totalAllocationPoints',
    enabled: !!farmAddress,
  });

  const {
    data: poolLength,
    isLoading: isPoolLengthLoading,
    error: poolLengthError,
  } = useContractCall<BigNumber>({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'poolLength',
    enabled: !!farmAddress,
  });

  // Get pool info if poolId is provided
  const {
    data: poolInfo,
    isLoading: isPoolInfoLoading,
    error: poolInfoError,
  } = useContractCall<PoolInfo>({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'poolInfo',
    args: [poolId],
    enabled: !!farmAddress && poolId !== undefined,
  });

  // Get user info if poolId and address are provided
  const {
    data: userInfo,
    isLoading: isUserInfoLoading,
    error: userInfoError,
  } = useContractCall<UserInfo>({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'userInfo',
    args: [poolId, address],
    enabled: !!farmAddress && !!address && poolId !== undefined,
  });

  // Get pending rewards
  const {
    data: pendingReward,
    isLoading: isPendingRewardLoading,
    error: pendingRewardError,
  } = useContractCall<BigNumber>({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'pendingReward',
    args: [poolId, address],
    enabled: !!farmAddress && !!address && poolId !== undefined,
  });

  // Transaction functions
  const depositTransaction = useContractTransaction({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'deposit',
  });

  const withdrawTransaction = useContractTransaction({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'withdraw',
  });

  const harvestTransaction = useContractTransaction({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'harvest',
  });

  const emergencyWithdrawTransaction = useContractTransaction({
    address: farmAddress as `0x${string}`,
    abi: SimpleFarmABI,
    functionName: 'emergencyWithdraw',
  });

  // Deposit LP tokens to farm
  const deposit = async (pid: number, amount: BigNumber) => {
    return depositTransaction.execute([pid, amount]);
  };

  // Withdraw LP tokens from farm
  const withdraw = async (pid: number, amount: BigNumber) => {
    return withdrawTransaction.execute([pid, amount]);
  };

  // Harvest rewards without withdrawing
  const harvest = async (pid: number) => {
    return harvestTransaction.execute([pid]);
  };

  // Emergency withdraw without caring about rewards
  const emergencyWithdraw = async (pid: number) => {
    return emergencyWithdrawTransaction.execute([pid]);
  };

  // Calculate APR for a pool
  const calculatePoolAPR = (pid: number, lpTokenPrice: number): number => {
    if (!poolInfo || !AIHPerBlock || !totalAllocationPoints) return 0;
    
    const blocksPerYear = 2102400; // ~6500 blocks per day * 365
    const AIHPerYear = AIHPerBlock.mul(blocksPerYear);
    const poolWeight = poolInfo.allocationPoints.mul(100).div(totalAllocationPoints);
    
    const AIHPerYearForPool = AIHPerYear.mul(poolWeight).div(100);
    const AIHRewardsInUSD = parseFloat(AIHPerYearForPool.toString()) * 0; // We need AIH token price here
    
    const totalStakedInUSD = parseFloat(poolInfo.totalStaked.toString()) * lpTokenPrice;
    
    if (totalStakedInUSD === 0) return 0;
    
    return (AIHRewardsInUSD / totalStakedInUSD) * 100;
  };

  return {
    farmAddress,
    AIHPerBlock,
    totalAllocationPoints,
    poolLength,
    poolInfo,
    userInfo,
    pendingReward,
    isLoading: 
      isAIHPerBlockLoading || 
      isTotalAllocationPointsLoading || 
      isPoolLengthLoading ||
      isPoolInfoLoading ||
      isUserInfoLoading ||
      isPendingRewardLoading,
    error: 
      AIHPerBlockError || 
      totalAllocationPointsError || 
      poolLengthError ||
      poolInfoError ||
      userInfoError ||
      pendingRewardError,
    
    // Transaction functions
    deposit,
    withdraw,
    harvest,
    emergencyWithdraw,
    calculatePoolAPR,
    
    // Transaction states
    isDepositing: depositTransaction.isPending,
    isWithdrawing: withdrawTransaction.isPending,
    isHarvesting: harvestTransaction.isPending,
    isEmergencyWithdrawing: emergencyWithdrawTransaction.isPending,
    
    // Transaction errors
    depositError: depositTransaction.error,
    withdrawError: withdrawTransaction.error,
    harvestError: harvestTransaction.error,
    emergencyWithdrawError: emergencyWithdrawTransaction.error,
  };
}; 