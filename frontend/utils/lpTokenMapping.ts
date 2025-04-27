import { ethers } from 'ethers';
import { getRouterContract } from './contracts/router';
import { getProvider } from './contracts/helpers';

// Cache for LP token mappings
interface LPTokenMapping {
  lpTokenAddress: string;
  pairAddress: string;
}

const lpTokenCache: Record<string, LPTokenMapping> = {};

/**
 * Get LP token address from pair address
 * @param pairAddress The pair contract address
 * @returns The LP token address (often the same as pair address in most DEXs)
 */
export const getLpTokenAddressFromPair = async (pairAddress: string): Promise<string> => {
  if (!ethers.utils.isAddress(pairAddress)) {
    throw new Error('Invalid pair address');
  }

  // Check cache first
  if (lpTokenCache[pairAddress.toLowerCase()]) {
    return lpTokenCache[pairAddress.toLowerCase()].lpTokenAddress;
  }

  try {
    const router = getRouterContract();
    
    // In most DEXs like Uniswap, the pair address is the LP token address
    // But we'll add this function in case they're different in your implementation
    const lpTokenAddress = await router.getLPToken(pairAddress);
    
    // Cache the result
    lpTokenCache[pairAddress.toLowerCase()] = {
      pairAddress: pairAddress.toLowerCase(),
      lpTokenAddress: lpTokenAddress.toLowerCase()
    };
    
    return lpTokenAddress;
  } catch (error) {
    console.error('Error getting LP token address:', error);
    // Fallback: in most DEXs, the pair address is also the LP token address
    return pairAddress;
  }
};

/**
 * Get pair address from LP token address
 * @param lpTokenAddress The LP token address
 * @returns The pair contract address
 */
export const getPairAddressFromLpToken = async (lpTokenAddress: string): Promise<string> => {
  if (!ethers.utils.isAddress(lpTokenAddress)) {
    throw new Error('Invalid LP token address');
  }

  // Check cache first (search by LP token address)
  for (const key in lpTokenCache) {
    if (lpTokenCache[key].lpTokenAddress.toLowerCase() === lpTokenAddress.toLowerCase()) {
      return lpTokenCache[key].pairAddress;
    }
  }

  try {
    const router = getRouterContract();
    
    // This is a placeholder - your actual contract might have a different method
    // to get the pair address from the LP token
    const pairAddress = await router.getPairFromLPToken(lpTokenAddress);
    
    // Cache the result
    lpTokenCache[pairAddress.toLowerCase()] = {
      pairAddress: pairAddress.toLowerCase(),
      lpTokenAddress: lpTokenAddress.toLowerCase()
    };
    
    return pairAddress;
  } catch (error) {
    console.error('Error getting pair address:', error);
    // Fallback: in most DEXs, the LP token address is the pair address
    return lpTokenAddress;
  }
};

/**
 * Check if an address is an LP token
 * @param address The address to check
 * @returns True if the address is an LP token
 */
export const isLpToken = async (address: string): Promise<boolean> => {
  if (!ethers.utils.isAddress(address)) {
    return false;
  }

  try {
    const provider = getProvider();
    const contract = new ethers.Contract(
      address,
      [
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
        'function factory() external view returns (address)'
      ],
      provider
    );

    // Try to call token0 and token1 methods - only LP tokens should have these
    const [token0, token1] = await Promise.all([
      contract.token0(),
      contract.token1()
    ]);

    return ethers.utils.isAddress(token0) && ethers.utils.isAddress(token1);
  } catch (error) {
    return false;
  }
};

/**
 * Get the LP token address for a pair of tokens
 * @param token0 The first token address
 * @param token1 The second token address
 * @returns Promise<string> The LP token address
 */
export const getLpTokenAddressForPair = async (token0: string, token1: string): Promise<string> => {
  try {
    // In a real implementation, this would query the factory contract
    // to get the pair address for these tokens
    
    // For now, this is a placeholder
    if (!ethers.utils.isAddress(token0) || !ethers.utils.isAddress(token1)) {
      throw new Error("Invalid token addresses");
    }
    
    // Add logic to get the LP token address for this pair
    // Usually involves calling the factory.getPair(token0, token1) method
    
    // Return dummy address for now
    return "0x0000000000000000000000000000000000000000";
  } catch (error) {
    console.error("Error getting LP token address for pair:", error);
    throw error;
  }
}; 