import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import useWeb3 from './useWeb3';
import useTokens from './useTokens';
import { 
  getFarmContract,
  getPoolCount,
  getAllPools,
  getUserPoolInfo,
  getPoolInfo,
  depositToFarm,
  withdrawFromFarm,
  harvestRewards,
  approveForFarming,
  logger,
  PoolInfo,
  UserPoolInfo
} from '../utils/contracts';

/**
 * Hook for farm operations
 */
export default function useFarm() {
  const { account, isConnected } = useWeb3();
  const { fetchTokenInfo } = useTokens();
  
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [userPools, setUserPools] = useState<Record<number, UserPoolInfo>>({});
  const [loadingPools, setLoadingPools] = useState<boolean>(false);
  const [loadingUserPools, setLoadingUserPools] = useState<boolean>(false);
  const [loadingPoolInfo, setLoadingPoolInfo] = useState<Record<number, boolean>>({});
  const [loadingDeposit, setLoadingDeposit] = useState<Record<number, boolean>>({});
  const [loadingWithdraw, setLoadingWithdraw] = useState<Record<number, boolean>>({});
  const [loadingHarvest, setLoadingHarvest] = useState<Record<number, boolean>>({});
  const [loadingApproval, setLoadingApproval] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Clear all error states
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Load all pools in the farm
   */
  const loadPools = useCallback(async () => {
    try {
      setLoadingPools(true);
      clearErrors();
      
      const allPools = await getAllPools();
      setPools(allPools);
      
      logger.log(`Loaded ${allPools.length} pools`);
      return allPools;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading farm pools';
      logger.error(`Error loading farm pools:`, error);
      setErrors(prev => ({ ...prev, loadPools: errorMessage }));
      return [];
    } finally {
      setLoadingPools(false);
    }
  }, [clearErrors]);

  /**
   * Load specific pool info
   */
  const loadPoolInfo = useCallback(async (pid: number): Promise<PoolInfo | null> => {
    try {
      setLoadingPoolInfo(prev => ({ ...prev, [pid]: true }));
      
      const info = await getPoolInfo(pid);
      
      // Update pools array
      setPools(prev => {
        const existingIndex = prev.findIndex(p => p.pid === pid);
        if (existingIndex >= 0 && info) {
          const newPools = [...prev];
          newPools[existingIndex] = info;
          return newPools;
        } else if (info) {
          return [...prev, info];
        }
        return prev;
      });
      
      return info;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Error loading pool ${pid}`;
      logger.error(`Error loading pool ${pid}:`, error);
      setErrors(prev => ({ ...prev, [`loadPool_${pid}`]: errorMessage }));
      return null;
    } finally {
      setLoadingPoolInfo(prev => ({ ...prev, [pid]: false }));
    }
  }, []);

  /**
   * Load user's pool information
   */
  const loadUserPoolInfo = useCallback(async (pid: number): Promise<UserPoolInfo | null> => {
    if (!account) {
      setErrors(prev => ({ ...prev, [`userPool_${pid}`]: 'Wallet not connected' }));
      return null;
    }
    
    try {
      setLoadingUserPools(true);
      
      const userInfo = await getUserPoolInfo(pid, account);
      
      if (userInfo) {
        // Update user pools state
        setUserPools(prev => ({
          ...prev,
          [pid]: userInfo
        }));
      }
      
      return userInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Error loading user info for pool ${pid}`;
      logger.error(`Error loading user pool ${pid}:`, error);
      setErrors(prev => ({ ...prev, [`userPool_${pid}`]: errorMessage }));
      return null;
    } finally {
      setLoadingUserPools(false);
    }
  }, [account]);

  /**
   * Load all user pools
   */
  const loadAllUserPools = useCallback(async () => {
    if (!account || !pools.length) {
      return;
    }
    
    try {
      setLoadingUserPools(true);
      
      const userPoolsPromises = pools.map(pool => getUserPoolInfo(pool.pid, account));
      const userPoolsInfo = await Promise.all(userPoolsPromises);
      
      // Filter out null values and update state
      const validUserPools = userPoolsInfo.filter(Boolean) as UserPoolInfo[];
      const userPoolsMap = validUserPools.reduce((acc, pool) => {
        acc[pool.pid] = pool;
        return acc;
      }, {} as Record<number, UserPoolInfo>);
      
      setUserPools(userPoolsMap);
      
      logger.log(`Loaded ${validUserPools.length} user pools`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading user pools';
      logger.error(`Error loading all user pools:`, error);
      setErrors(prev => ({ ...prev, loadUserPools: errorMessage }));
    } finally {
      setLoadingUserPools(false);
    }
  }, [account, pools]);

  /**
   * Approve LP token for farming
   */
  const approve = useCallback(async (
    lpTokenAddress: string,
    amount: string
  ): Promise<boolean> => {
    if (!isConnected) {
      setErrors(prev => ({ ...prev, [`approve_${lpTokenAddress}`]: 'Wallet not connected' }));
      return false;
    }
    
    if (!ethers.utils.isAddress(lpTokenAddress)) {
      setErrors(prev => ({ ...prev, [`approve_${lpTokenAddress}`]: 'Invalid LP token address' }));
      return false;
    }
    
    try {
      setLoadingApproval(prev => ({ ...prev, [lpTokenAddress]: true }));
      clearErrors();
      
      // Get token info for better UX
      const tokenInfo = await fetchTokenInfo(lpTokenAddress);
      logger.log(`Approving ${amount} ${tokenInfo?.symbol || 'LP tokens'} for farming`);
      
      const tx = await approveForFarming(lpTokenAddress, amount);
      logger.log(`Approval transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Approval confirmed in block ${receipt.blockNumber}`);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error approving LP token';
      logger.error(`Error approving LP token ${lpTokenAddress}:`, error);
      setErrors(prev => ({ ...prev, [`approve_${lpTokenAddress}`]: errorMessage }));
      return false;
    } finally {
      setLoadingApproval(prev => ({ ...prev, [lpTokenAddress]: false }));
    }
  }, [isConnected, clearErrors, fetchTokenInfo]);

  /**
   * Deposit LP tokens to a farm pool
   */
  const deposit = useCallback(async (
    pid: number,
    amount: string
  ): Promise<boolean> => {
    if (!isConnected) {
      setErrors(prev => ({ ...prev, [`deposit_${pid}`]: 'Wallet not connected' }));
      return false;
    }
    
    try {
      setLoadingDeposit(prev => ({ ...prev, [pid]: true }));
      clearErrors();
      
      // Get pool info for better UX
      const poolInfo = pools.find(p => p.pid === pid) || await loadPoolInfo(pid);
      
      if (!poolInfo) {
        throw new Error(`Pool ${pid} not found`);
      }
      
      logger.log(`Depositing ${amount} LP tokens to pool ${pid}`);
      
      // Execute deposit
      const tx = await depositToFarm(pid, amount);
      logger.log(`Deposit transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Deposit confirmed in block ${receipt.blockNumber}`);
      
      // Update user pool info
      await loadUserPoolInfo(pid);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Error depositing to pool ${pid}`;
      logger.error(`Error depositing to pool ${pid}:`, error);
      setErrors(prev => ({ ...prev, [`deposit_${pid}`]: errorMessage }));
      return false;
    } finally {
      setLoadingDeposit(prev => ({ ...prev, [pid]: false }));
    }
  }, [isConnected, clearErrors, pools, loadPoolInfo, loadUserPoolInfo]);

  /**
   * Withdraw LP tokens from a farm pool
   */
  const withdraw = useCallback(async (
    pid: number,
    amount: string
  ): Promise<boolean> => {
    if (!isConnected) {
      setErrors(prev => ({ ...prev, [`withdraw_${pid}`]: 'Wallet not connected' }));
      return false;
    }
    
    try {
      setLoadingWithdraw(prev => ({ ...prev, [pid]: true }));
      clearErrors();
      
      // Get pool info for better UX
      const poolInfo = pools.find(p => p.pid === pid) || await loadPoolInfo(pid);
      
      if (!poolInfo) {
        throw new Error(`Pool ${pid} not found`);
      }
      
      logger.log(`Withdrawing ${amount} LP tokens from pool ${pid}`);
      
      // Execute withdrawal
      const tx = await withdrawFromFarm(pid, amount);
      logger.log(`Withdrawal transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Withdrawal confirmed in block ${receipt.blockNumber}`);
      
      // Update user pool info
      await loadUserPoolInfo(pid);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Error withdrawing from pool ${pid}`;
      logger.error(`Error withdrawing from pool ${pid}:`, error);
      setErrors(prev => ({ ...prev, [`withdraw_${pid}`]: errorMessage }));
      return false;
    } finally {
      setLoadingWithdraw(prev => ({ ...prev, [pid]: false }));
    }
  }, [isConnected, clearErrors, pools, loadPoolInfo, loadUserPoolInfo]);

  /**
   * Harvest rewards from a farm pool
   */
  const harvest = useCallback(async (
    pid: number
  ): Promise<boolean> => {
    if (!isConnected) {
      setErrors(prev => ({ ...prev, [`harvest_${pid}`]: 'Wallet not connected' }));
      return false;
    }
    
    try {
      setLoadingHarvest(prev => ({ ...prev, [pid]: true }));
      clearErrors();
      
      // Get pool info for better UX
      const poolInfo = pools.find(p => p.pid === pid) || await loadPoolInfo(pid);
      
      if (!poolInfo) {
        throw new Error(`Pool ${pid} not found`);
      }
      
      logger.log(`Harvesting rewards from pool ${pid}`);
      
      // Execute harvest
      const tx = await harvestRewards(pid);
      logger.log(`Harvest transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      logger.log(`Harvest confirmed in block ${receipt.blockNumber}`);
      
      // Update user pool info
      await loadUserPoolInfo(pid);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Error harvesting from pool ${pid}`;
      logger.error(`Error harvesting from pool ${pid}:`, error);
      setErrors(prev => ({ ...prev, [`harvest_${pid}`]: errorMessage }));
      return false;
    } finally {
      setLoadingHarvest(prev => ({ ...prev, [pid]: false }));
    }
  }, [isConnected, clearErrors, pools, loadPoolInfo, loadUserPoolInfo]);

  // Load pools on initial mount
  useEffect(() => {
    loadPools();
  }, [loadPools]);

  // Load user pools when account or pools change
  useEffect(() => {
    if (account && pools.length > 0) {
      loadAllUserPools();
    }
  }, [account, pools.length, loadAllUserPools]);

  return {
    // State
    pools,
    userPools,
    errors,
    
    // Loading states
    loadingPools,
    loadingUserPools,
    loadingPoolInfo,
    loadingDeposit,
    loadingWithdraw,
    loadingHarvest,
    loadingApproval,
    
    // Methods
    loadPools,
    loadPoolInfo,
    loadUserPoolInfo,
    loadAllUserPools,
    approve,
    deposit,
    withdraw,
    harvest,
    clearErrors
  };
} 