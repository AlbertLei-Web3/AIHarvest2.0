import { ethers } from 'ethers';
import { CONTRACTS } from './addresses';
import { farmABI } from '@/constants/abis';

// Pool info interface - 池子信息接口
interface PoolInfo {
  lpToken: string;
  allocPoint: number;
  lastRewardTime: number;
  accAIHPerShare: string;
  totalStaked: string;
}

// User info interface - 用户信息接口
interface UserInfo {
  amount: string;
  rewardDebt: string;
  pendingRewards: string;
}

// Farm position interface - 农场仓位接口
export interface FarmPosition {
  pid: number;
  lpToken: string;
  lpTokenName: string;
  lpTokenSymbol: string;
  stakedAmount: string;
  pendingRewards: string;
  poolShare: number;
  allocPoint: number;
  apr: number;
  tokenASymbol: string;
  tokenBSymbol: string;
}

/**
 * Get farm contract
 * 获取农场合约
 */
export const getFarmContract = (provider: ethers.providers.Provider | ethers.Signer) => {
  return new ethers.Contract(CONTRACTS.FARM_ADDRESS, farmABI, provider);
};

/**
 * Get the number of pools in the farm
 * 获取农场中的池子数量
 */
export const getPoolCount = async (provider: ethers.providers.Provider | ethers.Signer): Promise<number> => {
  const farmContract = getFarmContract(provider);
  try {
    const count = await farmContract.poolLength();
    return count.toNumber();
  } catch (error) {
    console.error('Failed to get pool count:', error);
    return 0;
  }
};

/**
 * Get pool info for a specific pool
 * 获取特定池子的信息
 */
export const getPoolInfo = async (
  provider: ethers.providers.Provider | ethers.Signer,
  poolId: number
): Promise<PoolInfo | null> => {
  const farmContract = getFarmContract(provider);
  try {
    // Using getPoolInfo function from updated ABI
    const poolInfo = await farmContract.getPoolInfo(poolId);
    return {
      lpToken: poolInfo.lpToken,
      allocPoint: poolInfo.allocPoint.toNumber(),
      lastRewardTime: poolInfo.lastRewardTime.toNumber(),
      accAIHPerShare: poolInfo.accAIHPerShare.toString(),
      totalStaked: poolInfo.totalStaked.toString(),
    };
  } catch (error) {
    console.error(`Failed to get pool info for pool ${poolId}:`, error);
    return null;
  }
};

/**
 * Get user info for a specific pool
 * 获取用户在特定池子的信息
 */
export const getUserInfo = async (
  provider: ethers.providers.Provider | ethers.Signer,
  poolId: number,
  userAddress: string
): Promise<UserInfo | null> => {
  const farmContract = getFarmContract(provider);
  try {
    // Using getUserInfo function from updated ABI
    const userInfo = await farmContract.getUserInfo(poolId, userAddress);
    return {
      amount: userInfo.amount.toString(),
      rewardDebt: userInfo.rewardDebt.toString(),
      pendingRewards: userInfo.pendingRewards.toString(),
    };
  } catch (error) {
    console.error(`Failed to get user info for pool ${poolId} and user ${userAddress}:`, error);
    return null;
  }
};

/**
 * Get pending rewards for a user in a specific pool
 * 获取用户在特定池子的待领取奖励
 */
export const getPendingRewards = async (
  provider: ethers.providers.Provider | ethers.Signer,
  poolId: number,
  userAddress: string
): Promise<string> => {
  const farmContract = getFarmContract(provider);
  try {
    const pendingAIH = await farmContract.pendingAIH(poolId, userAddress);
    return ethers.utils.formatEther(pendingAIH);
  } catch (error) {
    console.error(`Failed to get pending rewards for pool ${poolId} and user ${userAddress}:`, error);
    return '0';
  }
};

/**
 * Deposit LP tokens into a farming pool
 * 将LP代币存入农场池
 */
export const deposit = async (
  signer: ethers.Signer,
  poolId: number,
  amount: string
): Promise<ethers.ContractTransaction> => {
  const farmContract = getFarmContract(signer);
  const parsedAmount = ethers.utils.parseEther(amount);
  
  try {
    return await farmContract.deposit(poolId, parsedAmount);
  } catch (error) {
    console.error(`Failed to deposit ${amount} LP tokens to pool ${poolId}:`, error);
    throw error;
  }
};

/**
 * Withdraw LP tokens from a farming pool
 * 从农场池中提取LP代币
 */
export const withdraw = async (
  signer: ethers.Signer,
  poolId: number,
  amount: string
): Promise<ethers.ContractTransaction> => {
  const farmContract = getFarmContract(signer);
  const parsedAmount = ethers.utils.parseEther(amount);
  
  try {
    return await farmContract.withdraw(poolId, parsedAmount);
  } catch (error) {
    console.error(`Failed to withdraw ${amount} LP tokens from pool ${poolId}:`, error);
    throw error;
  }
};

/**
 * Harvest pending rewards from a farming pool
 * 从农场池中收获待领取奖励
 */
export const harvest = async (
  signer: ethers.Signer,
  poolId: number
): Promise<ethers.ContractTransaction> => {
  const farmContract = getFarmContract(signer);
  
  try {
    // Using dedicated harvest function from updated ABI
    return await farmContract.harvest(poolId);
  } catch (error) {
    console.error(`Failed to harvest rewards from pool ${poolId}:`, error);
    throw error;
  }
};

/**
 * Get the APR (Annual Percentage Rate) for a specific pool
 * 获取特定池子的年化收益率
 */
export const getPoolAPR = async (
  provider: ethers.providers.Provider | ethers.Signer,
  poolId: number
): Promise<number> => {
  const farmContract = getFarmContract(provider);
  
  try {
    // Get pool info using the new getPoolInfo function
    const poolInfo = await farmContract.getPoolInfo(poolId);
    const totalAllocPoint = await farmContract.totalAllocPoint(0); // Passing 0 as per the ABI
    const aihPerSecond = await farmContract.aihPerSecond();
    
    // If there's no allocation or stake, return 0
    // 如果没有分配或质押，返回0
    if (poolInfo.allocPoint.eq(0) || poolInfo.totalStaked.eq(0) || totalAllocPoint.eq(0)) {
      return 0;
    }
    
    // Calculate AIH rewards per year for this pool
    // 计算这个池子每年的AIH奖励
    const aihPerYear = aihPerSecond.mul(3600 * 24 * 365);
    const poolRewardsPerYear = aihPerYear.mul(poolInfo.allocPoint).div(totalAllocPoint);
    
    // Calculate APR (rewards per year / total staked)
    // 计算APR（每年奖励/总质押）
    const apr = poolRewardsPerYear.mul(100).div(poolInfo.totalStaked);
    
    return apr.toNumber();
  } catch (error) {
    console.error(`Failed to calculate APR for pool ${poolId}:`, error);
    return 0;
  }
};

/**
 * Get a user's farm positions across all pools
 * 获取用户在所有池子的农场仓位
 */
export const getUserFarmPositions = async (
  provider: ethers.providers.Provider | ethers.Signer,
  userAddress: string,
  lpTokenNames: Record<string, { name: string, symbol: string, tokenA: string, tokenB: string }>
): Promise<FarmPosition[]> => {
  const farmContract = getFarmContract(provider);
  const positions: FarmPosition[] = [];
  
  try {
    const poolCount = await getPoolCount(provider);
    
    for (let pid = 0; pid < poolCount; pid++) {
      const poolInfo = await getPoolInfo(provider, pid);
      if (!poolInfo) continue;
      
      const userInfo = await getUserInfo(provider, pid, userAddress);
      if (!userInfo || ethers.BigNumber.from(userInfo.amount).eq(0)) continue;
      
      const pendingRewards = await getPendingRewards(provider, pid, userAddress);
      const apr = await getPoolAPR(provider, pid);
      
      // Calculate pool share
      // 计算池子份额
      const totalStaked = ethers.BigNumber.from(poolInfo.totalStaked);
      const userStaked = ethers.BigNumber.from(userInfo.amount);
      const poolShare = totalStaked.eq(0) ? 0 : userStaked.mul(100).div(totalStaked).toNumber();
      
      // Get token details from the lookup or contract
      // 从查询表或合约获取代币详情
      let lpTokenName = "LP Token";
      let lpTokenSymbol = "LP";
      let tokenASymbol = "TKA";
      let tokenBSymbol = "TKB";
      
      // If details are available in the lookup table, use them
      // 如果查询表中有详情，使用它们
      const lpTokenLower = poolInfo.lpToken.toLowerCase();
      if (lpTokenNames[lpTokenLower]) {
        lpTokenName = lpTokenNames[lpTokenLower].name;
        lpTokenSymbol = lpTokenNames[lpTokenLower].symbol;
        tokenASymbol = lpTokenNames[lpTokenLower].tokenA;
        tokenBSymbol = lpTokenNames[lpTokenLower].tokenB;
      }
      
      positions.push({
        pid,
        lpToken: poolInfo.lpToken,
        lpTokenName,
        lpTokenSymbol,
        stakedAmount: ethers.utils.formatEther(userInfo.amount),
        pendingRewards,
        poolShare,
        allocPoint: poolInfo.allocPoint,
        apr,
        tokenASymbol,
        tokenBSymbol
      });
    }
    
    return positions;
  } catch (error) {
    console.error('Failed to get user farm positions:', error);
    return [];
  }
};

/**
 * Approve an LP token for the farm contract
 * 批准LP代币用于农场合约
 */
export const approveLPTokenForFarm = async (
  signer: ethers.Signer,
  lpTokenAddress: string,
  amount: string = ethers.constants.MaxUint256.toString()
): Promise<ethers.ContractTransaction | null> => {
  if (!ethers.utils.isAddress(lpTokenAddress)) {
    throw new Error(`Invalid LP token address: ${lpTokenAddress}`);
  }
  
  try {
    const lpTokenContract = new ethers.Contract(
      lpTokenAddress,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ],
      signer
    );
    
    const signerAddress = await signer.getAddress();
    const farmAddress = CONTRACTS.FARM_ADDRESS;
    
    // Check current allowance
    const currentAllowance = await lpTokenContract.allowance(signerAddress, farmAddress);
    const amountBN = ethers.constants.MaxUint256;
    
    // If current allowance is less than the amount, approve
    if (currentAllowance.lt(amountBN)) {
      return await lpTokenContract.approve(farmAddress, amountBN);
    } else {
      // If already approved, return null to indicate no approval needed
      console.log("LP token already approved for farm");
      return null;
    }
  } catch (error) {
    console.error(`Failed to approve LP token ${lpTokenAddress} for farm:`, error);
    throw error;
  }
}; 