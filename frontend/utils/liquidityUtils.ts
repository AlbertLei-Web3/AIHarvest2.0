import { ethers } from 'ethers';
import { getUserLiquidityPositions } from '@/utils/contracts/liquidity';
import { TOKENS } from '@/utils/contracts/addresses';
import { LPToken } from '@/contexts/LiquidityContext';

/**
 * Fetches a user's liquidity positions and formats them to the LPToken interface
 * @param userAddress The address of the user
 * @returns Promise with array of LP token positions
 */
export async function fetchUserLiquidityPositions(userAddress: string): Promise<LPToken[]> {
  try {
    console.log(`Fetching liquidity positions for user: ${userAddress}`);
    
    // Create all possible token pairs for checking
    const tokenAddresses = Object.values(TOKENS);
    const tokenPairs: [string, string][] = [];
    
    for (let i = 0; i < tokenAddresses.length; i++) {
      for (let j = i + 1; j < tokenAddresses.length; j++) {
        tokenPairs.push([tokenAddresses[i], tokenAddresses[j]]);
      }
    }
    
    // Get user's liquidity positions
    const positions = await getUserLiquidityPositions(userAddress, tokenPairs);
    
    // Map positions to our LPToken format
    return positions.map(position => ({
      id: position.pairAddress,
      token0: {
        symbol: position.tokenASymbol,
        address: position.tokenA,
        name: position.tokenAName || position.tokenASymbol,
      },
      token1: {
        symbol: position.tokenBSymbol,
        address: position.tokenB,
        name: position.tokenBName || position.tokenBSymbol,
      },
      balance: position.lpBalance,
      poolShare: position.poolShare.toString(),
      apr: position.apr?.toString() || '0',
      valueUSD: position.valueUSD?.toString() || '0',
      createdAt: position.createdAt || Math.floor(Date.now() / 1000),
      pairAddress: position.pairAddress,
      lpTokenAddress: position.lpTokenAddress,
    }));
  } catch (error) {
    console.error("Error fetching liquidity positions:", error);
    return [];
  }
}

/**
 * Calculates the estimated APR for a liquidity position
 * @param pairAddress The address of the pair contract
 * @returns Promise with the estimated APR
 */
export async function calculateLiquidityAPR(pairAddress: string): Promise<string> {
  // In a real implementation, this would fetch trading volume, fees, etc.
  // to calculate a realistic APR
  // This is a placeholder implementation
  return Promise.resolve('10.5');
}

/**
 * Formats a liquidity position for display
 * @param lpToken The LP token to format
 * @returns Formatted LP token with additional display properties
 */
export function formatLPTokenForDisplay(lpToken: LPToken) {
  return {
    ...lpToken,
    formattedBalance: ethers.utils.formatUnits(lpToken.balance, 18),
    pairName: `${lpToken.token0.symbol}/${lpToken.token1.symbol}`,
    formattedValueUSD: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(lpToken.valueUSD)),
  };
}

/**
 * Add liquidity to a pool
 * @param token0 First token address
 * @param token1 Second token address
 * @param amount0 Amount of first token
 * @param amount1 Amount of second token
 * @returns Promise<boolean> Success status
 */
export const addLiquidity = async (
  token0: string, 
  token1: string, 
  amount0: string, 
  amount1: string
): Promise<boolean> => {
  try {
    console.log(`Adding liquidity: ${amount0} of ${token0} and ${amount1} of ${token1}`);
    
    // In a real implementation, this would call the router contract
    // to add liquidity to the pool
    
    // For now, this is a placeholder
    return true;
  } catch (error) {
    console.error("Error adding liquidity:", error);
    return false;
  }
};

/**
 * Remove liquidity from a pool
 * @param lpTokenAddress LP token address
 * @param amount Amount of LP tokens to remove
 * @returns Promise<boolean> Success status
 */
export const removeLiquidity = async (
  lpTokenAddress: string, 
  amount: string
): Promise<boolean> => {
  try {
    console.log(`Removing ${amount} liquidity from pool with LP token: ${lpTokenAddress}`);
    
    // In a real implementation, this would call the router contract
    // to remove liquidity from the pool
    
    // For now, this is a placeholder
    return true;
  } catch (error) {
    console.error("Error removing liquidity:", error);
    return false;
  }
};

/**
 * Get pool information for a pair of tokens
 * @param token0 First token address
 * @param token1 Second token address
 * @returns Promise with pool information
 */
export const getPoolInfo = async (token0: string, token1: string) => {
  try {
    console.log(`Getting pool info for ${token0} and ${token1}`);
    
    // In a real implementation, this would query the pair contract
    // to get reserves, fees, etc.
    
    // For now, this is a placeholder
    return {
      token0: {
        address: token0,
        symbol: "TOKEN0",
        name: "Token 0"
      },
      token1: {
        address: token1,
        symbol: "TOKEN1",
        name: "Token 1"
      },
      reserve0: "1000",
      reserve1: "1000",
      totalSupply: "100",
      fee: "0.003"
    };
  } catch (error) {
    console.error("Error getting pool info:", error);
    throw error;
  }
}; 