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

// Farm-related ABI and functions have been removed

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