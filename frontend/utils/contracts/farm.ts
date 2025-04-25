/**
 * SimpleFarm contract related functions
 */
import { ethers } from 'ethers';
import { SimpleFarmABI } from './abis';
import { logger, getSigner, getProvider } from './helpers';
import { CONTRACTS } from './addresses';
import { getTokenInfo, getTokenContract } from './erc20';
import { getRouterContract } from './router';
import { PoolInfo, UserPoolInfo } from './types';

/**
 * Get farm contract instance
 */
export const getFarmContract = (signerOrProvider?: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(CONTRACTS.FARM_ADDRESS, SimpleFarmABI, provider);
};

/**
 * Get the number of pools in the farm
 */
export const getPoolCount = async (): Promise<number> => {
  try {
    const farm = getFarmContract();
    const poolLength = await farm.poolLength();
    return poolLength.toNumber();
  } catch (error) {
    logger.error("Error getting pool count:", error);
    return 0;
  }
};

/**
 * Get information about a specific pool
 */
export const getPoolInfo = async (pid: number): Promise<PoolInfo | null> => {
  try {
    const farm = getFarmContract();
    
    // Get pool info
    const [lpToken, allocPoint, lastRewardTime, accAIHPerShare, totalStaked] = await farm.getPoolInfo(pid);
    
    if (!ethers.utils.isAddress(lpToken)) {
      throw new Error(`Invalid LP token address for pool ${pid}`);
    }
    
    // Get additional information about the LP token
    const router = getRouterContract();
    
    // Attempt to determine if this is a pair LP token
    let tokenA = "";
    let tokenB = "";
    let tokenASymbol = "";
    let tokenBSymbol = "";
    
    try {
      // This is a simplification - in reality, you'd need to check if this is actually an LP token
      // and then find which tokens make up the pair
      const allPairsLength = await router.allPairsLength();
      
      // For simplicity, we'll just check if the LP token matches any pair's LP token
      for (let i = 0; i < Math.min(allPairsLength.toNumber(), 10); i++) {
        // This is pseudocode - your contract might not have a method to look up pairs by index
        // const pairAddress = await router.allPairs(i);
        // const pairLPToken = await router.getLPToken(pairAddress);
        
        // if (pairLPToken.toLowerCase() === lpToken.toLowerCase()) {
        //   // Get the tokens in this pair
        //   [tokenA, tokenB] = await someFunctionToGetTokensInPair(pairAddress);
        //   if (tokenA && tokenB) {
        //     const tokenAInfo = await getTokenInfo(tokenA);
        //     const tokenBInfo = await getTokenInfo(tokenB);
        //     tokenASymbol = tokenAInfo.symbol;
        //     tokenBSymbol = tokenBInfo.symbol;
        //     break;
        //   }
        // }
      }
    } catch (error) {
      logger.error(`Error getting pair info for pool ${pid}:`, error);
    }
    
    return {
      pid,
      lpToken,
      allocPoint: allocPoint.toNumber(),
      lastRewardTime: lastRewardTime.toNumber(),
      accAIHPerShare: ethers.utils.formatUnits(accAIHPerShare, 18),
      totalStaked: ethers.utils.formatUnits(totalStaked, 18),
      tokenA,
      tokenB,
      tokenASymbol,
      tokenBSymbol
    };
  } catch (error) {
    logger.error(`Error getting pool info for pid ${pid}:`, error);
    return null;
  }
};

/**
 * Get all pools in the farm
 */
export const getAllPools = async (): Promise<PoolInfo[]> => {
  try {
    const count = await getPoolCount();
    if (count === 0) {
      return [];
    }
    
    // Get all pools in parallel
    const poolPromises = Array.from({ length: count }, (_, i) => getPoolInfo(i));
    const pools = await Promise.all(poolPromises);
    
    // Filter out null values
    return pools.filter(Boolean) as PoolInfo[];
  } catch (error) {
    logger.error("Error getting all pools:", error);
    return [];
  }
};

/**
 * Get user information for a specific pool
 */
export const getUserPoolInfo = async (pid: number, userAddress: string): Promise<UserPoolInfo | null> => {
  try {
    if (!ethers.utils.isAddress(userAddress)) {
      throw new Error("Invalid user address");
    }
    
    const farm = getFarmContract();
    
    // Get user info
    const [amount, rewardDebt, pendingRewards] = await farm.getUserInfo(pid, userAddress);
    
    // Get pool info
    const poolInfo = await getPoolInfo(pid);
    
    return {
      pid,
      amount: ethers.utils.formatUnits(amount, 18),
      rewardDebt: ethers.utils.formatUnits(rewardDebt, 18),
      pendingRewards: ethers.utils.formatUnits(pendingRewards, 18),
      poolInfo: poolInfo || undefined
    };
  } catch (error) {
    logger.error(`Error getting user info for pid ${pid} and user ${userAddress}:`, error);
    return null;
  }
};

/**
 * Get pending rewards for a user in a specific pool
 */
export const getPendingRewards = async (pid: number, userAddress: string): Promise<string> => {
  try {
    if (!ethers.utils.isAddress(userAddress)) {
      throw new Error("Invalid user address");
    }
    
    const farm = getFarmContract();
    const pendingRewards = await farm.pendingAIH(pid, userAddress);
    
    return ethers.utils.formatUnits(pendingRewards, 18);
  } catch (error) {
    logger.error(`Error getting pending rewards for pid ${pid} and user ${userAddress}:`, error);
    return "0";
  }
};

/**
 * Approve LP token for staking in the farm
 */
export const approveForFarming = async (
  lpTokenAddress: string,
  amount: string
): Promise<ethers.providers.TransactionResponse> => {
  try {
    logger.log(`Approving ${amount} LP tokens for farming`);
    
    if (!ethers.utils.isAddress(lpTokenAddress)) {
      throw new Error("Invalid LP token address");
    }
    
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const lpTokenContract = getTokenContract(lpTokenAddress, signer);
    
    // Get current allowance
    const currentAllowance = await lpTokenContract.allowance(signerAddress, CONTRACTS.FARM_ADDRESS);
    
    // Format amount
    const amountWei = ethers.utils.parseUnits(amount, 18);
    
    // If current allowance is not enough, approve
    if (currentAllowance.lt(amountWei)) {
      logger.debug(`Current allowance is ${ethers.utils.formatUnits(currentAllowance, 18)}, approving ${amount}`);
      
      // First set allowance to 0 for tokens that require it
      if (currentAllowance.gt(0)) {
        logger.log("Resetting allowance to 0 first");
        const resetTx = await lpTokenContract.approve(CONTRACTS.FARM_ADDRESS, 0);
        await resetTx.wait(1);
      }
      
      // Approve new amount
      return lpTokenContract.approve(CONTRACTS.FARM_ADDRESS, amountWei);
    } else {
      logger.log(`Allowance is already sufficient: ${ethers.utils.formatUnits(currentAllowance, 18)}`);
      
      // Return a dummy transaction response
      return {
        hash: "sufficient-allowance",
        wait: async () => ({ status: 1 })
      } as any;
    }
  } catch (error) {
    logger.error("Error approving LP token for farming:", error);
    throw error;
  }
};

/**
 * Deposit LP tokens to a farm pool
 */
export const depositToFarm = async (
  pid: number,
  amount: string
): Promise<ethers.providers.TransactionResponse> => {
  try {
    logger.log(`Depositing ${amount} LP tokens to pool ${pid}`);
    
    const farm = getFarmContract(getSigner());
    const amountWei = ethers.utils.parseUnits(amount, 18);
    
    // Execute deposit
    return farm.deposit(pid, amountWei);
  } catch (error) {
    logger.error(`Error depositing to farm pool ${pid}:`, error);
    throw error;
  }
};

/**
 * Withdraw LP tokens from a farm pool
 */
export const withdrawFromFarm = async (
  pid: number,
  amount: string
): Promise<ethers.providers.TransactionResponse> => {
  try {
    logger.log(`Withdrawing ${amount} LP tokens from pool ${pid}`);
    
    const farm = getFarmContract(getSigner());
    const amountWei = ethers.utils.parseUnits(amount, 18);
    
    // Execute withdrawal
    return farm.withdraw(pid, amountWei);
  } catch (error) {
    logger.error(`Error withdrawing from farm pool ${pid}:`, error);
    throw error;
  }
};

/**
 * Harvest rewards from a farm pool
 */
export const harvestRewards = async (
  pid: number
): Promise<ethers.providers.TransactionResponse> => {
  try {
    logger.log(`Harvesting rewards from pool ${pid}`);
    
    const farm = getFarmContract(getSigner());
    
    // Execute harvest
    return farm.harvest(pid);
  } catch (error) {
    logger.error(`Error harvesting rewards from pool ${pid}:`, error);
    throw error;
  }
};

/**
 * Emergency withdraw from a farm pool (forfeit rewards)
 */
export const emergencyWithdraw = async (
  pid: number
): Promise<ethers.providers.TransactionResponse> => {
  try {
    logger.log(`Emergency withdrawing from pool ${pid}`);
    
    const farm = getFarmContract(getSigner());
    
    // Execute emergency withdrawal
    return farm.emergencyWithdraw(pid);
  } catch (error) {
    logger.error(`Error emergency withdrawing from pool ${pid}:`, error);
    throw error;
  }
}; 