import { ethers } from 'ethers';
import { getSigner } from './contracts';
import { farmABI } from '../constants/abis';
import { contractAddresses } from '../constants/addresses';

/**
 * Gets the farm contract with the given signer or provider
 * @param signerOrProvider Optional signer or provider
 * @returns The farm contract instance
 */
export const getFarmContract = (signerOrProvider?: ethers.Signer | ethers.providers.Provider) => {
  const signer = signerOrProvider || getSigner();
  return new ethers.Contract(contractAddresses.farm, farmABI, signer);
};

/**
 * Gets the number of pools in the farm
 * @returns The number of pools
 */
export const getPoolLength = async (): Promise<number> => {
  try {
    const farm = getFarmContract();
    const poolLength = await farm.poolLength();
    return poolLength.toNumber();
  } catch (error) {
    console.error('Error getting pool length:', error);
    return 0;
  }
};

/**
 * Adds a new pool to the farm contract (admin only)
 * @param lpToken The LP token address
 * @param allocPoint The allocation points for the pool
 * @returns The transaction response
 */
export const addPool = async (
  lpToken: string,
  allocPoint: number
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const farm = getFarmContract();
    
    console.log(`Adding new pool for LP token ${lpToken} with ${allocPoint} allocation points`);
    const tx = await farm.add(allocPoint, lpToken, false);
    
    return tx;
  } catch (error) {
    console.error(`Error adding new pool:`, error);
    throw error;
  }
};

/**
 * Updates the allocation points for a specific pool (admin only)
 * @param poolId The ID of the pool to update
 * @param allocPoint The new allocation points
 * @returns The transaction response
 */
export const updatePoolAllocation = async (
  poolId: number,
  allocPoint: number
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const farm = getFarmContract();
    
    console.log(`Updating pool ${poolId} with ${allocPoint} allocation points`);
    const tx = await farm.set(poolId, allocPoint, false);
    
    return tx;
  } catch (error) {
    console.error(`Error updating pool allocation:`, error);
    throw error;
  }
};

/**
 * Sets the AIH tokens distributed per second (admin only)
 * @param aihPerSecond Amount of AIH tokens to distribute per second (in wei)
 * @returns The transaction response
 */
export const setRewardRate = async (
  aihPerSecond: string
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const farm = getFarmContract();
    
    console.log(`Setting AIH per second to ${aihPerSecond}`);
    const tx = await farm.setAIHPerSecond(aihPerSecond);
    
    return tx;
  } catch (error) {
    console.error(`Error setting AIH per second:`, error);
    throw error;
  }
};

/**
 * Gets the details of a specific pool
 * @param poolId The ID of the pool
 * @returns Pool information
 */
export const getPoolInfo = async (poolId: number): Promise<any> => {
  try {
    const farm = getFarmContract();
    const poolInfo = await farm.getPoolInfo(poolId);
    
    return {
      lpToken: poolInfo.lpToken,
      allocPoint: poolInfo.allocPoint.toString(),
      lastRewardTime: poolInfo.lastRewardTime.toString(),
      accAIHPerShare: poolInfo.accAIHPerShare.toString(),
      totalStaked: ethers.utils.formatUnits(poolInfo.totalStaked, 18)
    };
  } catch (error) {
    console.error(`Error getting pool info for pool ${poolId}:`, error);
    return null;
  }
};

/**
 * Gets user information for a specific pool
 * @param poolId The ID of the pool
 * @param userAddress The user's address
 * @returns User information for the pool
 */
export const getUserInfo = async (poolId: number, userAddress: string): Promise<any> => {
  try {
    const farm = getFarmContract();
    const userInfo = await farm.getUserInfo(poolId, userAddress);
    
    return {
      amount: ethers.utils.formatUnits(userInfo.amount, 18),
      rewardDebt: ethers.utils.formatUnits(userInfo.rewardDebt, 18),
      pendingRewards: ethers.utils.formatUnits(userInfo.pendingRewards, 18)
    };
  } catch (error) {
    console.error(`Error getting user info for pool ${poolId}:`, error);
    return {
      amount: '0',
      rewardDebt: '0',
      pendingRewards: '0'
    };
  }
};

/**
 * Gets the pending rewards for a user in a specific pool
 * @param poolId The ID of the pool
 * @param userAddress The user's address
 * @returns The pending rewards
 */
export const getPendingRewards = async (poolId: number, userAddress: string): Promise<string> => {
  try {
    const farm = getFarmContract();
    const pendingRewards = await farm.pendingAIH(poolId, userAddress);
    return ethers.utils.formatUnits(pendingRewards, 18);
  } catch (error) {
    console.error(`Error getting pending rewards for pool ${poolId}:`, error);
    return '0';
  }
};

/**
 * Deposits LP tokens into a farm pool
 * @param poolId The ID of the pool
 * @param amount The amount to deposit (in LP tokens)
 * @returns The transaction response
 */
export const depositToFarm = async (
  poolId: number,
  amount: string
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const farm = getFarmContract();
    const amountInWei = ethers.utils.parseUnits(amount, 18);
    
    console.log(`Depositing ${amount} LP tokens to pool ${poolId}`);
    const tx = await farm.deposit(poolId, amountInWei);
    
    return tx;
  } catch (error) {
    console.error(`Error depositing to farm pool ${poolId}:`, error);
    throw error;
  }
};

/**
 * Withdraws LP tokens from a farm pool
 * @param poolId The ID of the pool
 * @param amount The amount to withdraw (in LP tokens)
 * @returns The transaction response
 */
export const withdrawFromFarm = async (
  poolId: number,
  amount: string
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const farm = getFarmContract();
    const amountInWei = ethers.utils.parseUnits(amount, 18);
    
    console.log(`Withdrawing ${amount} LP tokens from pool ${poolId}`);
    const tx = await farm.withdraw(poolId, amountInWei);
    
    return tx;
  } catch (error) {
    console.error(`Error withdrawing from farm pool ${poolId}:`, error);
    throw error;
  }
};

/**
 * Harvests rewards from a farm pool without withdrawing LP tokens
 * @param poolId The ID of the pool
 * @returns The transaction response
 */
export const harvestRewards = async (
  poolId: number
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const farm = getFarmContract();
    
    console.log(`Harvesting rewards from pool ${poolId}`);
    const tx = await farm.harvest(poolId);
    
    return tx;
  } catch (error) {
    console.error(`Error harvesting rewards from pool ${poolId}:`, error);
    throw error;
  }
};

/**
 * Gets all farming pools with user data
 * @param userAddress The user's address
 * @returns Array of pool information with user data
 */
export const getAllPools = async (userAddress: string): Promise<any[]> => {
  try {
    const poolLength = await getPoolLength();
    const pools = [];
    
    for (let i = 0; i < poolLength; i++) {
      const poolInfo = await getPoolInfo(i);
      
      if (!poolInfo) continue;
      
      let userInfo = null;
      let pendingRewards = '0';
      
      if (userAddress) {
        userInfo = await getUserInfo(i, userAddress);
        pendingRewards = await getPendingRewards(i, userAddress);
      }
      
      pools.push({
        id: i,
        lpToken: poolInfo.lpToken,
        allocPoint: poolInfo.allocPoint,
        totalStaked: poolInfo.totalStaked,
        userStaked: userInfo ? userInfo.amount : '0',
        pendingRewards: pendingRewards
      });
    }
    
    return pools;
  } catch (error) {
    console.error('Error getting all pools:', error);
    return [];
  }
};

/**
 * Emergency withdraw from a farm without harvesting rewards
 * @param poolId - The pool ID to emergency withdraw from
 * @returns Transaction response
 */
export const emergencyWithdraw = async (poolId: number): Promise<ethers.providers.TransactionResponse> => {
  try {
    console.log(`Emergency withdrawing from pool ${poolId}`);
    const farmContract = await getFarmContract();
    
    const tx = await farmContract.emergencyWithdraw(poolId);
    console.log('Emergency withdraw transaction:', tx);
    return tx;
  } catch (error) {
    console.error('Error in emergency withdraw:', error);
    throw error;
  }
}; 