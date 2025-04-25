/**
 * Type definitions for Ethereum and contract-related interfaces
 */

// Fixing Window interface to properly extend existing ethereum property
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      selectedAddress?: string;
      chainId?: string;
      isConnected?: () => boolean;
      request: (args: {method: string; params?: any}) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Token information interface
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
}

// Pair information interface
export interface PairInfo {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  pairAddress: string;
  lpTokenAddress: string;
  reserveA: string;
  reserveB: string;
  totalSupply: string;
}

// User liquidity position interface
export interface LiquidityPosition {
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenAAmount: string;
  tokenBAmount: string;
  lpBalance: string;
  poolShare: number;
  pairAddress: string;
}

// Farming pool information interface
export interface PoolInfo {
  pid: number;
  lpToken: string;
  allocPoint: number;
  lastRewardTime: number;
  accAIHPerShare: string;
  totalStaked: string;
  tokenA?: string;
  tokenB?: string;
  tokenASymbol?: string;
  tokenBSymbol?: string;
}

// User farming position interface
export interface UserPoolInfo {
  pid: number;
  amount: string;
  rewardDebt: string;
  pendingRewards: string;
  poolInfo?: PoolInfo;
} 