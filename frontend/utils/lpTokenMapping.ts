import { ethers } from 'ethers';
import { getRouterContract } from './contracts/router';
import { getProvider } from './contracts/helpers';

// Cache for LP token mappings 用于缓存LP代币映射
interface LPTokenMapping {
  lpTokenAddress: string;
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
}

const lpTokenCache: Record<string, LPTokenMapping> = {};

/**
 * Get token symbols from pair contract 从配对合约获取代币符号
 * @param pairAddress The pair contract address 配对合约地址
 * @returns Token addresses and symbols 代币地址和符号
 */
const getTokensFromPair = async (pairAddress: string): Promise<{
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
}> => {
  try {
    const provider = getProvider();
    const pairContract = new ethers.Contract(
      pairAddress,
      [
        'function token0() external view returns (address)',
        'function token1() external view returns (address)',
        'function name() external view returns (string)',
        'function symbol() external view returns (string)'
      ],
      provider
    );

    // Get token addresses
    const [token0, token1] = await Promise.all([
      pairContract.token0(),
      pairContract.token1()
    ]);

    // Get token symbols
    const token0Contract = new ethers.Contract(
      token0,
      ['function symbol() external view returns (string)'],
      provider
    );
    const token1Contract = new ethers.Contract(
      token1,
      ['function symbol() external view returns (string)'],
      provider
    );

    const [token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);

    return {
      token0,
      token1,
      token0Symbol,
      token1Symbol
    };
  } catch (error) {
    console.error('Error getting tokens from pair:', error);
    return {
      token0: '',
      token1: '',
      token0Symbol: 'Unknown',
      token1Symbol: 'Unknown'
    };
  }
};

/**
 * Get LP token address from pair address 从配对地址获取LP代币地址
 * @param pairAddress The pair contract address 配对合约地址
 * @returns The LP token address (often the same as pair address in most DEXs) 通常在大多数DEX中与配对地址相同的LP代币地址
 */
export const getLpTokenAddressFromPair = async (pairAddress: string): Promise<string> => {
  if (!ethers.utils.isAddress(pairAddress)) {
    throw new Error('Invalid pair address');
  }

  // Check cache first 首先检查缓存
  if (lpTokenCache[pairAddress.toLowerCase()]) {
    return lpTokenCache[pairAddress.toLowerCase()].lpTokenAddress;
  }

  try {
    const router = getRouterContract();
    
    // In most DEXs like Uniswap, the pair address is the LP token address 在大多数DEX（如Uniswap）中，配对地址是LP代币地址
    // But we'll try to get it from the router if the method exists 但如果方法存在，我们将尝试从路由器获取它
    let lpTokenAddress = pairAddress;
    try {
      // This will only work if your router has this method
      lpTokenAddress = await router.getLPToken(pairAddress);
    } catch (err) {
      // Fallback to using the pair address as the LP token address
      console.warn('Router does not have getLPToken method, using pair address as LP token address');
    }
    
    // Get token information to complete the cache entry
    const { token0, token1, token0Symbol, token1Symbol } = await getTokensFromPair(pairAddress);
    
    // Cache the result 缓存结果
    lpTokenCache[pairAddress.toLowerCase()] = {
      pairAddress: pairAddress.toLowerCase(),
      lpTokenAddress: lpTokenAddress.toLowerCase(),
      token0Address: token0.toLowerCase(),
      token1Address: token1.toLowerCase(),
      token0Symbol,
      token1Symbol
    };
    
    return lpTokenAddress;
  } catch (error) {
    console.error('Error getting LP token address:', error);
    // Fallback: in most DEXs, the pair address is also the LP token address 在大多数DEX中，配对地址也是LP代币地址
    return pairAddress;
  }
};

/**
 * Get pair address from LP token address 从LP代币地址获取配对地址
 * @param lpTokenAddress The LP token address 流动性池代币地址
 * @returns The pair contract address 配对合约地址
 */
export const getPairAddressFromLpToken = async (lpTokenAddress: string): Promise<string> => {
  if (!ethers.utils.isAddress(lpTokenAddress)) {
    throw new Error('Invalid LP token address');
  }

  // Check cache first (search by LP token address) 首先检查缓存（按LP代币地址搜索）
  for (const key in lpTokenCache) {
    if (lpTokenCache[key].lpTokenAddress.toLowerCase() === lpTokenAddress.toLowerCase()) {
      return lpTokenCache[key].pairAddress;
    }
  }

  try {
    const router = getRouterContract();
    
    // Try to get the pair address from the router if the method exists
    let pairAddress = lpTokenAddress;
    try {
      pairAddress = await router.getPairFromLPToken(lpTokenAddress);
    } catch (err) {
      console.warn('Router does not have getPairFromLPToken method, using LP token address as pair address');
      
      // Since we couldn't get the pair from the router, let's check if the LP token itself is a pair
      if (await isLpToken(lpTokenAddress)) {
        pairAddress = lpTokenAddress;
      }
    }
    
    // Get token information
    const { token0, token1, token0Symbol, token1Symbol } = await getTokensFromPair(pairAddress);
    
    // Cache the result 缓存结果
    lpTokenCache[pairAddress.toLowerCase()] = {
      pairAddress: pairAddress.toLowerCase(),
      lpTokenAddress: lpTokenAddress.toLowerCase(),
      token0Address: token0.toLowerCase(),
      token1Address: token1.toLowerCase(),
      token0Symbol,
      token1Symbol
    };
    
    return pairAddress;
  } catch (error) {
    console.error('Error getting pair address:', error);
    // Fallback: in most DEXs, the LP token address is the pair address 在大多数DEX中，LP代币地址是配对地址
    return lpTokenAddress;
  }
};

/**
 * Check if an address is an LP token 检查地址是否为LP代币
 * @param address The address to check 要检查的地址
 * @returns True if the address is an LP token 如果地址是LP代币，则返回true
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
        'function factory() external view returns (address)',
        'function getReserves() external view returns (uint112, uint112, uint32)'
      ],
      provider
    );

    // Try to call token0 and token1 methods - only LP tokens should have these 尝试调用token0和token1方法 - 只有LP代币应该具有这些方法
    const [token0, token1] = await Promise.all([
      contract.token0().catch(() => null),
      contract.token1().catch(() => null)
    ]);

    // Also check if there are reserves - this is even better confirmation it's an LP token
    let hasReserves = false;
    try {
      const [reserve0, reserve1] = await contract.getReserves();
      hasReserves = true;
    } catch (err) {
      // If getReserves fails, it's okay - we'll rely on token0/token1
    }

    return ethers.utils.isAddress(token0) && ethers.utils.isAddress(token1);
  } catch (error) {
    return false;
  }
};

/**
 * Get the LP token address for a pair of tokens 获取一对代币的LP代币地址
 * @param token0 The first token address 第一个代币地址
 * @param token1 The second token address 第二个代币地址
 * @returns Promise<string> The LP token address 返回LP代币地址
 */
export const getLpTokenAddressForPair = async (token0: string, token1: string): Promise<string> => {
  try {
    if (!ethers.utils.isAddress(token0) || !ethers.utils.isAddress(token1)) {
      throw new Error("Invalid token addresses");
    }
    
    // Make sure token0 < token1 (this is how DEXs like Uniswap create pairs)
    // 确保 token0 < token1（这是像 Uniswap 这样的 DEX 创建配对的方式）
    let sortedToken0 = token0;
    let sortedToken1 = token1;
    
    if (token0.toLowerCase() > token1.toLowerCase()) {
      sortedToken0 = token1;
      sortedToken1 = token0;
    }
    
    // Try to get the pair from the router
    const router = getRouterContract();
    let pairAddress;
    
    try {
      pairAddress = await router.getPair(sortedToken0, sortedToken1);
      
      // If pair address is zero, the pair doesn't exist
      if (pairAddress === ethers.constants.AddressZero) {
        return ethers.constants.AddressZero;
      }
    } catch (err) {
      console.warn('Router does not have getPair method:', err);
      return ethers.constants.AddressZero;
    }
    
    // Once we have the pair address, get the LP token address
    return await getLpTokenAddressFromPair(pairAddress);
  } catch (error) {
    console.error("Error getting LP token address for pair:", error);
    return ethers.constants.AddressZero;
  }
};

/**
 * Get token pair from LP token address 从LP代币地址获取代币对
 * @param lpTokenAddress LP token address LP代币地址
 * @returns Promise with token pair info 返回带有代币对信息的Promise
 */
export const getTokenPairFromLpToken = async (lpTokenAddress: string): Promise<{
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
}> => {
  try {
    // First check the cache
    for (const key in lpTokenCache) {
      if (lpTokenCache[key].lpTokenAddress.toLowerCase() === lpTokenAddress.toLowerCase()) {
        return {
          token0: lpTokenCache[key].token0Address,
          token1: lpTokenCache[key].token1Address,
          token0Symbol: lpTokenCache[key].token0Symbol,
          token1Symbol: lpTokenCache[key].token1Symbol
        };
      }
    }
    
    // If not in cache, get the pair address
    const pairAddress = await getPairAddressFromLpToken(lpTokenAddress);
    
    // Get token information
    return await getTokensFromPair(pairAddress);
  } catch (error) {
    console.error("Error getting token pair from LP token:", error);
    return {
      token0: '',
      token1: '',
      token0Symbol: 'Unknown',
      token1Symbol: 'Unknown'
    };
  }
}; 