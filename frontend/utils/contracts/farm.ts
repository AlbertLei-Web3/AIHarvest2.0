// 添加全局类型声明
declare global {
  interface Window {
    isHarvestCooldown?: boolean;
  }
}

import { ethers } from 'ethers';
import { CONTRACTS } from './addresses';
import { farmABI } from '@/constants/abis';
import { getTokenPrice, calculateLpTokenPrice, TokenSymbol, isValidTokenSymbol, priceRanges } from '../priceSimulation';

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
    // 先尝试使用专门的pendingAIH函数
    try {
      const pendingAIH = await farmContract.pendingAIH(poolId, userAddress);
      console.log(`Pool ${poolId}: 使用pendingAIH函数获取待领取奖励:`, ethers.utils.formatEther(pendingAIH));
      return ethers.utils.formatEther(pendingAIH);
    } catch (e1) {
      console.log(`Pool ${poolId}: pendingAIH调用失败，尝试getUserInfo`);
      try {
        // 尝试从getUserInfo获取待领取奖励
        const userInfo = await farmContract.getUserInfo(poolId, userAddress);
        console.log(`Pool ${poolId}: 使用getUserInfo获取待领取奖励:`, ethers.utils.formatEther(userInfo.pendingRewards));
        return ethers.utils.formatEther(userInfo.pendingRewards);
      } catch (e2) {
        console.log(`Pool ${poolId}: getUserInfo调用失败，尝试其他方法`);
        // 可能合约没有直接公开的方法获取待领取奖励，尝试手动计算
        // 实际使用时，你需要根据你的合约细节来调整这部分计算逻辑
        try {
          // 尝试计算待领取奖励
          console.log(`Pool ${poolId}: 尝试通过查看用户质押量和池子信息来估算奖励`);
          const poolInfo = await getPoolInfo(provider, poolId);
          const userBalance = await farmContract.userInfo(poolId, userAddress);
          
          if (poolInfo && !userBalance.amount.eq(0)) {
            // 这里的计算逻辑需要根据实际合约来调整
            const estimatedRewards = "0.0000"; // 实际计算替换
            console.log(`Pool ${poolId}: 估算的待领取奖励:`, estimatedRewards);
            return estimatedRewards;
          }
        } catch (e3) {
          console.error(`Pool ${poolId}: 所有获取待领取奖励的尝试都失败`, e1, e2, e3);
        }
      }
    }
    return '0';
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
  amount: string,
  txParams = {}
): Promise<ethers.ContractTransaction> => {
  const farmContract = getFarmContract(signer);
  const parsedAmount = ethers.utils.parseEther(amount);
  
  try {
    console.log(`存入 ${amount} LP 代币到池子 ${poolId}`);
    return await farmContract.deposit(poolId, parsedAmount, {
      gasLimit: 300000, // 明确的gas限制
      ...txParams
    });
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
  amount: string,
  txParams = {}
): Promise<ethers.ContractTransaction> => {
  const farmContract = getFarmContract(signer);
  const parsedAmount = ethers.utils.parseEther(amount);
  
  try {
    console.log(`使用标准withdraw函数，金额: ${amount}`);
    // 添加明确的gas限制和交易参数
    return await farmContract.withdraw(poolId, parsedAmount, {
      gasLimit: 300000,
      ...txParams
    });
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
  poolId: number,
  options: {onCancel?: () => void} = {}
): Promise<ethers.ContractTransaction> => {
  const farmContract = getFarmContract(signer);
  
  // 如果已经在冷却状态，直接拒绝操作
  if (window.isHarvestCooldown) {
    throw new Error('操作太频繁，请稍后再试');
  }
  
  try {
    console.log(`尝试收获池子 ${poolId} 的奖励`);
    
    // 设置标志，防止重复触发
    window.isHarvestCooldown = true;
    
    // 首先尝试使用专门的harvest函数
    try {
      console.log(`尝试方式1: 使用harvest(poolId)函数`);
      const tx = await farmContract.harvest(poolId);
      
      // 操作成功，重置冷却标志
      window.isHarvestCooldown = false;
      return tx;
    } catch (err1: any) {
      // 检查是否是用户拒绝
      if (err1.code === 4001) {
        console.log("用户拒绝了交易，触发冷却期");
        
        // 触发回调函数
        if (options.onCancel) {
          options.onCancel();
        }
        
        // 保持冷却标志3秒
        setTimeout(() => {
          window.isHarvestCooldown = false;
          console.log("冷却期结束，允许新的收获操作");
        }, 3000);
        
        throw new Error('用户取消了交易');
      }
      
      console.warn(`harvest函数调用失败:`, err1);
      
      // 如果没有专门的harvest函数，尝试通过withdraw(0)来收获奖励
      // 许多农场合约允许通过提取0个代币来收获奖励
      try {
        console.log(`尝试方式2: 使用withdraw(poolId, 0)函数`);
        const zeroAmount = ethers.BigNumber.from(0);
        const tx = await farmContract.withdraw(poolId, zeroAmount);
        
        // 操作成功，重置冷却标志
        window.isHarvestCooldown = false;
        return tx;
      } catch (err2: any) {
        // 检查是否是用户拒绝
        if (err2.code === 4001) {
          console.log("用户拒绝了交易，触发冷却期");
          
          // 触发回调函数
          if (options.onCancel) {
            options.onCancel();
          }
          
          // 保持冷却标志
          throw new Error('用户取消了交易');
        }
        
        console.warn(`withdraw(0)调用失败:`, err2);
        
        // 如果上述方法都失败，尝试其他可能的函数名称
        try {
          console.log(`尝试方式3: 使用getReward(poolId)函数`);
          const tx = await farmContract.getReward(poolId);
          
          // 操作成功，重置冷却标志
          window.isHarvestCooldown = false;
          return tx;
        } catch (err3: any) {
          // 检查是否是用户拒绝
          if (err3.code === 4001) {
            console.log("用户拒绝了交易，触发冷却期");
            
            // 触发回调函数
            if (options.onCancel) {
              options.onCancel();
            }
            
            // 保持冷却标志
            throw new Error('用户取消了交易');
          }
          
          console.warn(`getReward调用失败:`, err3);
          console.log(`尝试最后方式: 直接调用合约的harvest函数`);
          
          // 最后，使用低级调用方法尝试
          const tx = await farmContract.functions.harvest(poolId);
          
          // 操作成功，重置冷却标志
          window.isHarvestCooldown = false;
          return tx;
        }
      }
    }
  } catch (error: any) {
    // 对于未捕获的拒绝，也重置冷却
    if (error.code !== 4001) {
      // 非用户拒绝错误，重置冷却标志
      window.isHarvestCooldown = false;
    }
    
    console.error(`无法收获池子 ${poolId} 的奖励, 所有尝试均失败:`, error);
    throw error;
  }
};

/**
 * Add a function to manually calculate totalAllocPoint by iterating through all pools
 * 添加一个函数来手动计算totalAllocPoint，通过迭代所有池子
 */
export const calculateTotalAllocPoint = async (
  provider: ethers.providers.Provider | ethers.Signer
): Promise<ethers.BigNumber> => {
  try {
    const farmContract = getFarmContract(provider);
    
    // First try to get totalAllocPoint directly from the contract
    try {
      const totalAllocPoint = await farmContract.totalAllocPoint();
      console.log("直接获取totalAllocPoint成功:", totalAllocPoint.toString());
      return totalAllocPoint;
    } catch (e) {
      console.log("直接获取totalAllocPoint失败，尝试通过池子计算");
      
      // If direct access fails, calculate by summing all pool allocPoints
      const poolCount = await getPoolCount(provider);
      let total = ethers.BigNumber.from(0);
      
      // Iterate through all pools
      for (let i = 0; i < poolCount; i++) {
        try {
          const poolInfo = await getPoolInfo(provider, i);
          if (poolInfo) {
            total = total.add(poolInfo.allocPoint);
          }
        } catch (error) {
          console.warn(`Error getting pool info for pool ${i}:`, error);
        }
      }
      
      console.log("通过池子计算的totalAllocPoint:", total.toString());
      
      // If total is 0, use a reasonable default based on the number of pools
      if (total.eq(0) && poolCount > 0) {
        // 默认每个池子100点 * 池子数量
        total = ethers.BigNumber.from(100 * Math.max(poolCount, 1));
        console.log("计算结果为0，使用默认值:", total.toString());
      }
      
      return total;
    }
  } catch (error) {
    console.error("Failed to calculate totalAllocPoint:", error);
    return ethers.BigNumber.from(100); // Return a safe default
  }
};

/**
 * Get pool APR based on pool info and simulated token prices
 * 获取基于池子信息和模拟代币价格的池子APR
 */
export const getPoolAPR = async (
  provider: ethers.providers.Provider | ethers.Signer,
  poolId: number,
  lpTokenDetails?: { tokenA: string; tokenB: string }
): Promise<number> => {
  const farmContract = getFarmContract(provider);
  
  try {
    // Get pool info using the getPoolInfo function
    const poolInfo = await farmContract.getPoolInfo(poolId);
    
    // 【精华】获取totalAllocPoint - 所有池子分配点数的总和，决定每个池子的奖励比例
    // 【Essential Highlight】Get totalAllocPoint - sum of all pool allocation points, determines each pool's reward proportion
    let totalAllocPoint;
    let usedDefaultValue = false;
    
    try {
      // 首先，尝试直接获取totalAllocPoint
      totalAllocPoint = await calculateTotalAllocPoint(provider);
      console.log(`Pool ${poolId}: Successfully calculated totalAllocPoint:`, totalAllocPoint.toString());
    } catch (error) {
      console.error(`Pool ${poolId}: 无法计算totalAllocPoint:`, error);
      
      // 使用更保守的估计 - 根据合约逻辑，每个池子添加时会更新totalAllocPoint
      const poolCount = await getPoolCount(provider);
      const poolAllocPoint = poolInfo.allocPoint;
      
      // 如果此池子allocPoint大于0，则估计totalAllocPoint为poolCount*poolAllocPoint
      // 这假设所有池子的allocPoint大致相同
      if (poolAllocPoint.gt(0)) {
        totalAllocPoint = ethers.BigNumber.from(poolAllocPoint).mul(poolCount);
      } else {
        // 如果此池子allocPoint为0，则使用默认值
        totalAllocPoint = ethers.BigNumber.from(poolCount * 100);
      }
      
      // 确保totalAllocPoint不会小于poolAllocPoint
      if (totalAllocPoint.lt(poolAllocPoint)) {
        totalAllocPoint = poolAllocPoint.mul(2); // 至少是池子分配点的2倍
      }
      
      usedDefaultValue = true;
      console.log(`Pool ${poolId}: 使用估计的totalAllocPoint值:`, totalAllocPoint.toString());
    }
    
    // 【精华】获取每秒分配的AIH代币数量，全局奖励速率
    // 【Essential Highlight】Get AIH tokens allocated per second, global reward rate
    let aihPerSecond;
    try {
      aihPerSecond = await farmContract.aihPerSecond();
      console.log(`Pool ${poolId}: aihPerSecond:`, ethers.utils.formatEther(aihPerSecond));
    } catch (error) {
      console.error(`Pool ${poolId}: 无法获取aihPerSecond:`, error);
      // 使用一个更合理的默认值：0.01 AIH每秒 (减小默认值，使APR更合理)
      aihPerSecond = ethers.utils.parseEther("0.01");
      console.log(`Pool ${poolId}: 使用默认aihPerSecond:`, ethers.utils.formatEther(aihPerSecond));
      usedDefaultValue = true;
    }
    
    // If there's no allocation or stake, return 0
    // 如果没有分配或质押，返回0
    if (poolInfo.allocPoint.eq(0) || poolInfo.totalStaked.eq(0) || totalAllocPoint.eq(0)) {
      console.log(`Pool ${poolId}: No rewards (allocPoint=${poolInfo.allocPoint}, totalStaked=${poolInfo.totalStaked}, totalAllocPoint=${totalAllocPoint})`);
      return 0;
    }
    
    // 【精华】计算池子年度奖励：基于池子权重占比和全局奖励率
    // 【Essential Highlight】Calculate pool's annual rewards: Based on pool weight proportion and global reward rate
    const aihPerYear = aihPerSecond.mul(3600 * 24 * 365);
    const poolRewardsPerYear = aihPerYear.mul(poolInfo.allocPoint).div(totalAllocPoint);
    
    console.log(`Pool ${poolId}: 每年奖励:`, ethers.utils.formatEther(poolRewardsPerYear));
    console.log(`Pool ${poolId}: 总质押:`, ethers.utils.formatEther(poolInfo.totalStaked));
    
    // 检查是否有足够的totalStaked以防止除零错误
    if (poolInfo.totalStaked.eq(0)) {
      console.log(`Pool ${poolId}: 总质押为0，无法计算APR`);
      return 0;
    }
    
    // 【精华】使用模拟的价格数据计算APR - 将代币价格考虑在内
    // 【Essential Highlight】Calculate APR using simulated price data - taking token prices into account
    try {
      console.log(`Pool ${poolId}: 使用以下LP代币详情计算价格:`, lpTokenDetails);
      
      // Get AIH price from price simulation
      const aihPrice = getTokenPrice('AIH') || 0.1; // Default to 0.1 if undefined
      console.log(`Pool ${poolId}: AIH价格: ${aihPrice}`);
      
      // Calculate yearly rewards value in USD
      const yearlyRewardsInAIH = parseFloat(ethers.utils.formatEther(poolRewardsPerYear));
      const yearlyRewardsValue = yearlyRewardsInAIH * aihPrice;
      console.log(`Pool ${poolId}: 每年奖励价值: ${yearlyRewardsInAIH} AIH = $${yearlyRewardsValue}`);
      
      // Get LP token value based on token pair
      let lpTokenPrice = 1.0; // Default price if we can't determine token pair
      
      if (lpTokenDetails) {
        const tokenA = lpTokenDetails.tokenA;
        const tokenB = lpTokenDetails.tokenB;
        
        console.log(`Pool ${poolId}: 尝试计算LP价格，使用代币 ${tokenA} 和 ${tokenB}`);
        
        // 检查token是否是有效的TokenSymbol并获取价格
        const priceA = getTokenPrice(tokenA);
        const priceB = getTokenPrice(tokenB);
        
        if (priceA !== undefined && priceB !== undefined) {
          // 如果都是有效的代币符号并能获取价格
          lpTokenPrice = calculateLpTokenPrice(tokenA, tokenB);
          console.log(`Pool ${poolId}: 计算的LP价格: ${lpTokenPrice} (${tokenA}=$${priceA}, ${tokenB}=$${priceB})`);
          
          // 特别检查FHBI-TD pair的情况下，确保价格计算合理
          if ((tokenA === 'FHBI' && tokenB === 'TD') || 
              (tokenA === 'TD' && tokenB === 'FHBI')) {
            // 确保FHBI-TD LP代币价格计算更加合理
            // 通常LP代币价格至少应该反映其所含有的代币价值
            const adjustedLpPrice = Math.max(lpTokenPrice, priceA + priceB);
            if (lpTokenPrice < adjustedLpPrice) {
              console.log(`Pool ${poolId}: 调整FHBI-TD LP价格从 ${lpTokenPrice} 到 ${adjustedLpPrice}`);
              lpTokenPrice = adjustedLpPrice;
            }
          }
        } else {
          // 记录哪些代币没有价格
          if (priceA === undefined) {
            console.log(`Pool ${poolId}: 无法获取 ${tokenA} 的价格`);
          }
          if (priceB === undefined) {
            console.log(`Pool ${poolId}: 无法获取 ${tokenB} 的价格`);
          }
          
          // 列出所有可用的代币符号
          const validTokens = Object.keys(priceRanges).join(', ');
          console.log(`Pool ${poolId}: 有效的代币符号: ${validTokens}`);
          
          // 使用默认LP价格
          lpTokenPrice = 2.5; // Default price for simulation
          console.log(`Pool ${poolId}: 使用默认LP价格: ${lpTokenPrice}`);
        }
      } else {
        console.log(`Pool ${poolId}: 没有提供LP代币详情，使用默认LP价格`);
        lpTokenPrice = 2.5; // Default price for simulation
      }
      
      // 【精华】计算APR：年度奖励价值除以总质押价值乘以100%
      // 【Essential Highlight】Calculate APR: Annual reward value divided by total staked value multiplied by 100%
      const totalStakedLP = parseFloat(ethers.utils.formatEther(poolInfo.totalStaked));
      const totalStakedValue = totalStakedLP * lpTokenPrice;
      console.log(`Pool ${poolId}: 总质押价值: ${totalStakedLP} LP = $${totalStakedValue}`);
      
      // Calculate APR: (yearly rewards value / total staked value) * 100%
      let apr = (yearlyRewardsValue / totalStakedValue) * 100;
      
      // Validate APR but don't cap it artificially
      if (isNaN(apr) || !isFinite(apr)) {
        console.warn(`Pool ${poolId}: APR计算结果是NaN或Infinity，使用默认值350%`);
        apr = 350;
      } else if (apr < 0) {
        console.warn(`Pool ${poolId}: 计算的APR值(${apr}%)为负数，设置为0%`);
        apr = 0;
      } 
      // 移除1000%的上限，显示真实计算的APR值
      
      console.log(`Pool ${poolId}: 最终APR: ${apr}% (AIH价格: ${aihPrice}, LP价格: ${lpTokenPrice})`);
      return apr;
    } catch (calcError) {
      console.error(`Pool ${poolId}: APR计算出错:`, calcError);
      // 返回合理的默认值
      return usedDefaultValue ? 200 : 350;
    }
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

/**
 * Add a new LP token to the farm
 * 向农场添加新的LP代币
 * Note: This function should only be called by the farm owner/admin
 * 注意：此函数应该只由农场所有者/管理员调用
 */
export const addLpTokenToFarm = async (
  signer: ethers.Signer,
  lpTokenAddress: string,
  allocPoint: number = 100
): Promise<ethers.ContractTransaction> => {
  if (!ethers.utils.isAddress(lpTokenAddress)) {
    throw new Error(`Invalid LP token address: ${lpTokenAddress}`);
  }
  
  try {
    const farmContract = getFarmContract(signer);
    
    // Log debugging information
    console.log("Adding LP token to farm:", {
      lpTokenAddress,
      allocPoint,
      signerAddress: await signer.getAddress()
    });
    
    // Verify LP token is a valid ERC20 token
    const lpTokenContract = new ethers.Contract(
      lpTokenAddress,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      signer
    );
    
    try {
      // Test if contract has basic ERC20 functions
      await lpTokenContract.decimals();
      console.log("LP token passed basic ERC20 check");
    } catch (err) {
      console.error("LP token failed basic ERC20 check:", err);
      throw new Error("The address does not appear to be a valid ERC20 token");
    }
    
    // For additional LP token validation, try to check if it's a pair token
    try {
      const pairContract = new ethers.Contract(
        lpTokenAddress,
        ['function token0() view returns (address)', 'function token1() view returns (address)'],
        signer
      );
      
      const token0 = await pairContract.token0();
      const token1 = await pairContract.token1();
      console.log("LP token validation passed. Contains tokens:", { token0, token1 });
    } catch (err) {
      console.warn("Could not verify LP token pair information. It may not be a valid LP token:", err);
      // We don't throw here as some DEXes might have different LP token structures
    }
    
    // Set explicit gas limit to avoid estimation issues
    return await farmContract.add(allocPoint, lpTokenAddress, {
      gasLimit: 500000, // Explicit higher gas limit
    });
  } catch (error) {
    console.error(`Failed to add LP token ${lpTokenAddress} to farm:`, error);
    throw error;
  }
};

/**
 * Check if an address is the farm owner
 * 检查地址是否为农场所有者
 */
export const isFarmOwner = async (
  provider: ethers.providers.Provider | ethers.Signer,
  address: string
): Promise<boolean> => {
  try {
    const farmContract = getFarmContract(provider);
    
    // Different contracts might implement ownership differently
    // Try common patterns
    try {
      // Try Ownable pattern
      if (typeof farmContract.owner === 'function') {
        const owner = await farmContract.owner();
        return owner.toLowerCase() === address.toLowerCase();
      }
    } catch (e) {
      console.error('No owner function:', e);
    }
    
    // If no standard owner function, try other common patterns
    try {
      if (typeof farmContract.getOwner === 'function') {
        const owner = await farmContract.getOwner();
        return owner.toLowerCase() === address.toLowerCase();
      }
    } catch (e) {
      console.error('No getOwner function:', e);
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check farm ownership:', error);
    return false;
  }
};

/**
 * Check if LP token is already in farm
 * 检查LP代币是否已在农场中
 */
export const isLpTokenInFarm = async (
  provider: ethers.providers.Provider | ethers.Signer,
  lpTokenAddress: string
): Promise<{isInFarm: boolean, poolId?: number}> => {
  try {
    const poolCount = await getPoolCount(provider);
    
    for (let pid = 0; pid < poolCount; pid++) {
      const poolInfo = await getPoolInfo(provider, pid);
      if (!poolInfo) continue;
      
      if (poolInfo.lpToken.toLowerCase() === lpTokenAddress.toLowerCase()) {
        return { isInFarm: true, poolId: pid };
      }
    }
    
    return { isInFarm: false };
  } catch (error) {
    console.error(`Failed to check if LP token ${lpTokenAddress} is in farm:`, error);
    return { isInFarm: false };
  }
};

/**
 * Update allocation points for an existing pool
 * 更新现有池的分配点数
 */
export const updatePoolAllocPoints = async (
  signer: ethers.Signer,
  poolId: number,
  allocPoint: number
): Promise<ethers.ContractTransaction> => {
  try {
    const farmContract = getFarmContract(signer);
    return await farmContract.set(poolId, allocPoint);
  } catch (error) {
    console.error(`Failed to update allocation points for pool ${poolId}:`, error);
    throw error;
  }
}; 