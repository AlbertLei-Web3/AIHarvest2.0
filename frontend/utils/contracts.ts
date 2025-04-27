import { ethers } from 'ethers';

// LP代币接口ABI (ERC20)
const ERC20ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)"
];

// 简化版UniswapV2 Pair ABI
const PAIR_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() external view returns (uint)",
  "function balanceOf(address owner) external view returns (uint)"
];

// 简化版Farm合约ABI
const FARM_ABI = [
  "function deposit(uint256 _pid, uint256 _amount) external",
  "function withdraw(uint256 _pid, uint256 _amount) external",
  "function emergencyWithdraw(uint256 _pid) external",
  "function pendingReward(uint256 _pid, address _user) external view returns (uint256)",
  "function userInfo(uint256 _pid, address _user) external view returns (uint256 amount, uint256 rewardDebt)",
  "function poolInfo(uint256 _pid) external view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare)"
];

// 流动性头寸接口
export interface LiquidityPosition {
  pairAddress: string;
  token0: {
    address: string;
    symbol: string;
  };
  token1: {
    address: string;
    symbol: string;
  };
  lpBalance: string;
  tokenAmounts: {
    token0Amount: string;
    token1Amount: string;
  };
}

// 检查代币是否已授权
export async function checkAllowance(
  tokenAddress: string, 
  ownerAddress: string, 
  spenderAddress: string
): Promise<boolean> {
  try {
    // 获取提供者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // 创建代币合约实例
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    
    // 获取授权金额
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    
    // 如果授权金额大于0，则已授权
    return allowance.gt(0);
  } catch (error) {
    console.error("检查授权失败:", error);
    return false;
  }
}

// 授权代币
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: string = ethers.constants.MaxUint256.toString()
): Promise<boolean> {
  try {
    // 获取提供者和签名者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // 创建代币合约实例
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
    
    // 发送授权交易
    const tx = await tokenContract.approve(spenderAddress, amount);
    
    // 等待交易确认
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error("授权代币失败:", error);
    return false;
  }
}

// 获取用户流动性头寸
export async function getUserLiquidityPositions(
  userAddress: string,
  tokenPairs: [string, string][]
): Promise<LiquidityPosition[]> {
  // 模拟数据，实际实现中应该从链上查询
  return [
    {
      pairAddress: "0xBD8763c0B53DE00BD4d71511dc4801Fb90bf5687",
      token0: {
        address: "0x5c15514CA3B498510D0CEE0B505F1c603bB3324D",
        symbol: "FHBI"
      },
      token1: {
        address: "0xCa7B8473802716b69fE753a5f9F6D5013a8D8B20",
        symbol: "TD"
      },
      lpBalance: "4321",
      tokenAmounts: {
        token0Amount: "2000",
        token1Amount: "2000"
      }
    }
  ];
}

// 质押LP代币到Farm
export async function stakeLPToken(
  farmAddress: string,
  poolId: number,
  amount: string
): Promise<boolean> {
  try {
    // 获取提供者和签名者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // 创建Farm合约实例
    const farmContract = new ethers.Contract(farmAddress, FARM_ABI, signer);
    
    // 发送质押交易
    const tx = await farmContract.deposit(poolId, ethers.utils.parseEther(amount));
    
    // 等待交易确认
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error("质押LP代币失败:", error);
    return false;
  }
}

// 从Farm解质押LP代币
export async function unstakeLPToken(
  farmAddress: string,
  poolId: number,
  amount: string
): Promise<boolean> {
  try {
    // 获取提供者和签名者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // 创建Farm合约实例
    const farmContract = new ethers.Contract(farmAddress, FARM_ABI, signer);
    
    // 发送解质押交易
    const tx = await farmContract.withdraw(poolId, ethers.utils.parseEther(amount));
    
    // 等待交易确认
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error("解质押LP代币失败:", error);
    return false;
  }
}

// 从Farm中紧急提取LP代币
export async function emergencyWithdraw(
  farmAddress: string,
  poolId: number
): Promise<boolean> {
  try {
    // 获取提供者和签名者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // 创建Farm合约实例
    const farmContract = new ethers.Contract(farmAddress, FARM_ABI, signer);
    
    // 发送紧急提取交易
    const tx = await farmContract.emergencyWithdraw(poolId);
    
    // 等待交易确认
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error("紧急提取LP代币失败:", error);
    return false;
  }
}

// 获取待领取奖励金额
export async function getPendingRewards(
  farmAddress: string,
  poolId: number,
  userAddress: string
): Promise<string> {
  try {
    // 获取提供者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // 创建Farm合约实例
    const farmContract = new ethers.Contract(farmAddress, FARM_ABI, provider);
    
    // 获取待领取奖励
    const pendingReward = await farmContract.pendingReward(poolId, userAddress);
    
    // 转换为ETH单位并返回
    return ethers.utils.formatEther(pendingReward);
  } catch (error) {
    console.error("获取待领取奖励失败:", error);
    return "0";
  }
}

// 获取用户在Farm中的质押信息
export async function getUserStakeInfo(
  farmAddress: string,
  poolId: number,
  userAddress: string
): Promise<{amount: string; rewardDebt: string}> {
  try {
    // 获取提供者
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // 创建Farm合约实例
    const farmContract = new ethers.Contract(farmAddress, FARM_ABI, provider);
    
    // 获取用户信息
    const userInfo = await farmContract.userInfo(poolId, userAddress);
    
    // 转换为ETH单位并返回
    return {
      amount: ethers.utils.formatEther(userInfo.amount),
      rewardDebt: ethers.utils.formatEther(userInfo.rewardDebt)
    };
  } catch (error) {
    console.error("获取用户质押信息失败:", error);
    return {
      amount: "0",
      rewardDebt: "0"
    };
  }
} 