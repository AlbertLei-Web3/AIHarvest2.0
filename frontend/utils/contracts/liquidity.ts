/**
 * Liquidity provider related functions
 */
import { ethers } from 'ethers';
import { logger, getSigner, getProvider } from './helpers';
import { getRouterContract } from './router';
import { getTokenInfo, getTokenContract } from './erc20';
import { CONTRACTS } from './addresses';
import { LiquidityPosition } from './types';

/**
 * Calculate LP token amount to receive with improved accuracy
 */
export const calculateLPTokenAmount = async (
  tokenAAddress: string,
  tokenBAddress: string,
  amountADesired: string,
  amountBDesired: string
): Promise<string> => {
  try {
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    if (parseFloat(amountADesired) <= 0 || parseFloat(amountBDesired) <= 0) {
      return "0";
    }
    
    const router = getRouterContract();
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      getTokenInfo(tokenAAddress),
      getTokenInfo(tokenBAddress)
    ]);
    
    // Get pair address
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    logger.debug(`Calculating LP tokens for pair at address: ${pairAddress}`);
    
    // If pair doesn't exist, this will be the first LP provider
    if (pairAddress === ethers.constants.AddressZero) {
      // First LP provider gets sqrt(amountA * amountB) - MINIMUM_LIQUIDITY LP tokens
      // Minimum liquidity (1000) is locked in the contract
      const amountAFloat = parseFloat(amountADesired);
      const amountBFloat = parseFloat(amountBDesired);
      const lpTokenAmount = Math.sqrt(amountAFloat * amountBFloat) - 1000;
      
      logger.debug(`New pair LP token calculation: sqrt(${amountADesired} * ${amountBDesired}) - 1000 = ${lpTokenAmount}`);
      return lpTokenAmount > 0 ? lpTokenAmount.toString() : "0";
    } 
    
    // For existing pair, LP tokens = min((amountA * totalSupply) / reserveA, (amountB * totalSupply) / reserveB)
    // Get reserves and total supply
    const [reserveA, reserveB] = await router.getReserves(
      pairAddress,
      tokenAAddress,
      tokenBAddress
    );
      
    const totalSupply = await router.totalSupply(pairAddress);
      
    logger.debug(`Existing pair: ${tokenAInfo.symbol} Reserve=${ethers.utils.formatUnits(reserveA, tokenAInfo.decimals)}, ${tokenBInfo.symbol} Reserve=${ethers.utils.formatUnits(reserveB, tokenBInfo.decimals)}, TotalSupply=${ethers.utils.formatUnits(totalSupply, 18)}`);
      
    // If reserves are very low but totalSupply exists, treat as new pair
    if (reserveA.isZero() || reserveB.isZero() || 
        (reserveA.lt(ethers.utils.parseUnits("0.000001", 18)) && reserveB.lt(ethers.utils.parseUnits("0.000001", 18)))) {
      logger.debug(`Reserves are too low. Treating as new pair.`);
      const lpTokenAmount = Math.sqrt(parseFloat(amountADesired) * parseFloat(amountBDesired)) - 1000;
      return lpTokenAmount > 0 ? lpTokenAmount.toString() : "0";
    }
    
    // Convert inputs to BigNumber with correct decimals
    const amountAWei = ethers.utils.parseUnits(amountADesired, tokenAInfo.decimals);
    const amountBWei = ethers.utils.parseUnits(amountBDesired, tokenBInfo.decimals);
    
    // Calculate LP tokens based on ratio of amounts to reserves
    const lpFromA = amountAWei.mul(totalSupply).div(reserveA);
    const lpFromB = amountBWei.mul(totalSupply).div(reserveB);
    
    // Take the minimum of the two calculations
    const lpTokensWei = lpFromA.lt(lpFromB) ? lpFromA : lpFromB;
    
    logger.debug(`LP token calculation: min(${ethers.utils.formatUnits(lpFromA, 18)}, ${ethers.utils.formatUnits(lpFromB, 18)}) = ${ethers.utils.formatUnits(lpTokensWei, 18)}`);
    
    return ethers.utils.formatUnits(lpTokensWei, 18);
  } catch (error) {
    logger.error("Error calculating LP token amount:", error);
    return "0";
  }
};

/**
 * Approve LP token with better error handling
 */
export const approveLPToken = async (
  tokenAAddress: string,
  tokenBAddress: string,
  amount: string,
  bypassChecks: boolean = false
): Promise<ethers.providers.TransactionResponse> => {
  logger.log(`Approving LP tokens for pair ${tokenAAddress} and ${tokenBAddress}`);
  logger.debug(`Amount: ${amount}, Bypass Checks: ${bypassChecks}`);
  
  try {
    // Validate addresses
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const router = getRouterContract(signer);
    
    // Get pair address
    let pairAddress;
    try {
      pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
      logger.debug(`Pair address: ${pairAddress}`);
      
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error("Pair does not exist. You need to add liquidity first to create the pair.");
      }
    } catch (error) {
      logger.error("Error getting pair address:", error);
      throw new Error(`Failed to get pair address: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Handle bypass mode
    if (bypassChecks) {
      logger.log("BYPASS MODE: Skipping token approval");
      return {
        hash: "bypass-approval-hash",
        wait: async () => ({ status: 1 })
      } as any;
    }
    
    // Get LP token address
    const lpTokenAddress = await router.getLPToken(pairAddress);
    if (lpTokenAddress === ethers.constants.AddressZero) {
      throw new Error("LP token address not found");
    }
    
    // Approve LP token
    const lpTokenContract = getTokenContract(lpTokenAddress, signer);
    
    // Check current allowance
    const currentAllowance = await lpTokenContract.allowance(signerAddress, CONTRACTS.ROUTER_ADDRESS);
    logger.debug(`Current LP token allowance: ${ethers.utils.formatUnits(currentAllowance, 18)}`);
    
    // Parse amount
    const amountToApprove = ethers.utils.parseUnits(amount, 18);
    logger.debug(`Amount to approve (in wei): ${amountToApprove.toString()}`);
    
    // Send approval transaction
    const tx = await lpTokenContract.approve(CONTRACTS.ROUTER_ADDRESS, amountToApprove);
    logger.log(`Approval transaction submitted with hash: ${tx.hash}`);
    return tx;
  } catch (error) {
    logger.error("Error approving LP tokens:", error);
    throw error;
  }
};

/**
 * Add liquidity with improved error handling and gas optimization
 */
export const addLiquidity = async (
  tokenAAddress: string,
  tokenBAddress: string,
  amountADesired: string,
  amountBDesired: string,
  slippageTolerance: number = 0.5 // Default 0.5%
): Promise<ethers.providers.TransactionResponse> => {
  logger.log(`Adding liquidity: ${amountADesired} ${tokenAAddress} and ${amountBDesired} ${tokenBAddress}`);
  
  try {
    // Validate addresses and amounts
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    if (parseFloat(amountADesired) <= 0 || parseFloat(amountBDesired) <= 0) {
      throw new Error("Token amounts must be greater than 0");
    }
    
    // Get signer and ensure connection
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    
    if (!signerAddress || signerAddress === ethers.constants.AddressZero) {
      throw new Error("Invalid signer address");
    }
    
    // Get contracts and token info
    const router = getRouterContract(signer);
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      getTokenInfo(tokenAAddress),
      getTokenInfo(tokenBAddress)
    ]);
    
    logger.debug(`Adding liquidity for ${tokenAInfo.symbol} and ${tokenBInfo.symbol}`);
    
    const amountAWei = ethers.utils.parseUnits(amountADesired, tokenAInfo.decimals);
    const amountBWei = ethers.utils.parseUnits(amountBDesired, tokenBInfo.decimals);
    
    // Check if this is a new pair
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    const isNewPair = pairAddress === ethers.constants.AddressZero;
    
    if (isNewPair) {
      logger.log(`Creating initial liquidity for new pair`);
      
      // For a new pair, check if the amount is sufficient
      const product = parseFloat(amountADesired) * parseFloat(amountBDesired);
      const sqrt = Math.sqrt(product);
      
      if (sqrt < 1000) {
        throw new Error(`Initial liquidity too low. Please add more tokens (minimum sqrt product should be ≥1000).`);
      }
    } else {
      logger.log(`Adding to existing pair at ${pairAddress}`);
      
      // Check reserves to validate the ratio
      const [reserveA, reserveB] = await router.getReserves(
        pairAddress,
        tokenAAddress,
        tokenBAddress
      );
        
      // Validate reserves for existing pairs
      if (reserveA.isZero() !== reserveB.isZero()) {
        throw new Error("Invalid pair state: Unbalanced reserves");
      }
    }
    
    // Calculate minimum amounts based on slippage
    const amountAMin = amountAWei.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    const amountBMin = amountBWei.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    
    // Check token allowances
    const [allowanceA, allowanceB] = await Promise.all([
      getTokenContract(tokenAAddress).allowance(signerAddress, CONTRACTS.ROUTER_ADDRESS),
      getTokenContract(tokenBAddress).allowance(signerAddress, CONTRACTS.ROUTER_ADDRESS)
    ]);
    
    if (allowanceA.lt(amountAWei)) {
      throw new Error(`Insufficient allowance for ${tokenAInfo.symbol}. Please approve first.`);
    }
    
    if (allowanceB.lt(amountBWei)) {
      throw new Error(`Insufficient allowance for ${tokenBInfo.symbol}. Please approve first.`);
    }
    
    // Execute add liquidity transaction
    logger.debug(`Executing addLiquidity with params:
      - tokenA: ${tokenAAddress} (${tokenAInfo.symbol})
      - tokenB: ${tokenBAddress} (${tokenBInfo.symbol})
      - amountA: ${ethers.utils.formatUnits(amountAWei, tokenAInfo.decimals)} ${tokenAInfo.symbol}
      - amountB: ${ethers.utils.formatUnits(amountBWei, tokenBInfo.decimals)} ${tokenBInfo.symbol}
      - minA: ${ethers.utils.formatUnits(amountAMin, tokenAInfo.decimals)} ${tokenAInfo.symbol}
      - minB: ${ethers.utils.formatUnits(amountBMin, tokenBInfo.decimals)} ${tokenBInfo.symbol}
      - recipient: ${signerAddress}
    `);
    
    const tx = await router.addLiquidity(
      tokenAAddress,
      tokenBAddress,
      amountAWei,
      amountBWei,
      amountAMin,
      amountBMin,
      signerAddress
    );
      
    logger.log(`Add liquidity transaction submitted: ${tx.hash}`);
    return tx;
  } catch (error) {
    logger.error("Error adding liquidity:", error);
    throw error;
  }
};

/**
 * Remove liquidity with improved error handling and better validation
 */
export const removeLiquidity = async (
  tokenAAddress: string,
  tokenBAddress: string,
  liquidity: string,
  slippageTolerance: number = 0.5, // Default 0.5%
  bypassChecks: boolean = false
): Promise<ethers.providers.TransactionResponse> => {
  logger.log(`Removing ${liquidity} LP tokens for ${tokenAAddress}/${tokenBAddress} pair`);
  
  try {
    // Validate addresses and amounts
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    if (parseFloat(liquidity) <= 0) {
      throw new Error("Liquidity amount must be greater than 0");
    }
    
    // Get signer and contracts
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const router = getRouterContract(signer);
    
    // Get pair address
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    if (pairAddress === ethers.constants.AddressZero) {
      throw new Error("Pair does not exist");
    }
      
    // Handle direct removal for bypass mode
    if (bypassChecks) {
      logger.log(`Using bypass mode for removal`);
      const liquidityWei = ethers.utils.parseUnits(liquidity, 18);
      const minAmount = ethers.utils.parseUnits("0.0001", 18);
        
      const tx = await router.removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        liquidityWei,
        minAmount,
        minAmount,
        signerAddress
      );
        
      logger.log(`Remove liquidity transaction submitted: ${tx.hash}`);
      return tx;
    }
    
    // Get token info
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      getTokenInfo(tokenAAddress),
      getTokenInfo(tokenBAddress)
    ]);
    
    // Get reserves and total supply
    const [reserveA, reserveB] = await router.getReserves(pairAddress, tokenAAddress, tokenBAddress);
    const totalSupply = await router.totalSupply(pairAddress);
    
    // Parse liquidity amount
    const liquidityWei = ethers.utils.parseUnits(liquidity, 18);
    
    // Calculate expected token amounts
    const amountA = reserveA.mul(liquidityWei).div(totalSupply);
    const amountB = reserveB.mul(liquidityWei).div(totalSupply);

    logger.debug(`Expected tokens: 
      - ${ethers.utils.formatUnits(amountA, tokenAInfo.decimals)} ${tokenAInfo.symbol}
      - ${ethers.utils.formatUnits(amountB, tokenBInfo.decimals)} ${tokenBInfo.symbol}
    `);
    
    // Calculate minimum amounts based on slippage
    const amountAMin = amountA.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    const amountBMin = amountB.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    
    // Check LP token allowance
    const lpTokenAddress = await router.getLPToken(pairAddress);
    const lpTokenContract = getTokenContract(lpTokenAddress, signer);
    const allowance = await lpTokenContract.allowance(signerAddress, CONTRACTS.ROUTER_ADDRESS);
      
    if (allowance.lt(liquidityWei)) {
      throw new Error("Insufficient allowance for LP tokens. Please approve first.");
    }
    
    // Execute remove liquidity transaction
    logger.debug(`Executing removeLiquidity with params:
      - tokenA: ${tokenAAddress} (${tokenAInfo.symbol})
      - tokenB: ${tokenBAddress} (${tokenBInfo.symbol})
      - liquidity: ${ethers.utils.formatUnits(liquidityWei, 18)} LP
      - minA: ${ethers.utils.formatUnits(amountAMin, tokenAInfo.decimals)} ${tokenAInfo.symbol}
      - minB: ${ethers.utils.formatUnits(amountBMin, tokenBInfo.decimals)} ${tokenBInfo.symbol}
      - recipient: ${signerAddress}
    `);
    
    const tx = await router.removeLiquidity(
      tokenAAddress,
      tokenBAddress,
      liquidityWei,
      amountAMin,
      amountBMin,
      signerAddress
    );
    
    logger.log(`Remove liquidity transaction submitted: ${tx.hash}`);
    return tx;
  } catch (error) {
    logger.error("Error removing liquidity:", error);
    throw error;
  }
};

/**
 * Get LP token info with error handling
 */
export const getLPTokenInfo = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<{
  lpTokenAddress: string;
  pairAddress: string;
  exists: boolean;
  totalSupply: string;
}> => {
  try {
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    const router = getRouterContract();
    
    // Get pair address
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      return {
        lpTokenAddress: ethers.constants.AddressZero,
        pairAddress: ethers.constants.AddressZero,
        exists: false,
        totalSupply: "0"
      };
    }
    
    // Get LP token address
    const lpTokenAddress = await router.getLPToken(pairAddress);
    
    // Get total supply
    const totalSupply = await router.totalSupply(pairAddress);
    const formattedSupply = ethers.utils.formatUnits(totalSupply, 18);
    
    return {
      lpTokenAddress,
      pairAddress,
      exists: true,
      totalSupply: formattedSupply
    };
  } catch (error) {
    logger.error("Error getting LP token info:", error);
    return {
      lpTokenAddress: ethers.constants.AddressZero,
      pairAddress: ethers.constants.AddressZero,
      exists: false,
      totalSupply: "0"
    };
  }
};

/**
 * Get LP token balance with improved error handling
 */
export const getLPTokenBalance = async (
  tokenAAddress: string,
  tokenBAddress: string,
  accountAddress: string
): Promise<string> => {
  try {
    if (!ethers.utils.isAddress(tokenAAddress) || 
        !ethers.utils.isAddress(tokenBAddress) || 
        !ethers.utils.isAddress(accountAddress)) {
      throw new Error("Invalid addresses");
    }
    
    const lpInfo = await getLPTokenInfo(tokenAAddress, tokenBAddress);
    
    if (!lpInfo.exists) {
      return "0";
    }
    
    // Get LP token balance
    const lpTokenContract = getTokenContract(lpInfo.lpTokenAddress);
    const balance = await lpTokenContract.balanceOf(accountAddress);
    return ethers.utils.formatUnits(balance, 18);
  } catch (error) {
    logger.error("Error getting LP token balance:", error);
    return "0";
  }
};

/**
 * Get user's liquidity positions with improved performance
 */
export const getUserLiquidityPositions = async (
  userAddress: string,
  tokenPairs: [string, string][]
): Promise<LiquidityPosition[]> => {
  try {
    logger.log(`Getting liquidity positions for user ${userAddress}`);
    logger.debug(`Checking ${tokenPairs.length} token pairs`);
    
    if (!ethers.utils.isAddress(userAddress)) {
      throw new Error("Invalid user address");
    }
    
    const router = getRouterContract();
    const provider = getProvider();
    const positions: LiquidityPosition[] = [];
    
    // Process pairs in batches to avoid overloading the RPC
    const batchSize = 5;
    for (let i = 0; i < tokenPairs.length; i += batchSize) {
      const batch = tokenPairs.slice(i, i + batchSize);
      
      // Process this batch in parallel
      const batchResults = await Promise.all(
        batch.map(async ([tokenA, tokenB]) => {
          try {
            // Skip invalid addresses
            if (!tokenA || !tokenB || !ethers.utils.isAddress(tokenA) || !ethers.utils.isAddress(tokenB)) {
              return null;
            }
        
            // Get pair address - try from factory first (more reliable)
            let pairAddress: string;
            try {
              const factoryContract = getFactoryContract(provider);
              pairAddress = await factoryContract.getPair(tokenA, tokenB);
            } catch (err) {
              // Fallback to router if factory method fails
              pairAddress = await router.getPairAddress(tokenA, tokenB);
            }
            
            if (pairAddress === ethers.constants.AddressZero) {
              return null;
            }
        
            // Get LP token balance
            let lpBalance: ethers.BigNumber;
            try {
              // Try both methods to get balance
              const pairContract = getPairContract(pairAddress, provider);
              lpBalance = await pairContract.balanceOf(userAddress);
            } catch (err) {
              lpBalance = await router.balanceOf(pairAddress, userAddress);
            }
            
            if (lpBalance.isZero()) {
              return null;
            }
            
            // Get token info
            const [tokenAInfo, tokenBInfo] = await Promise.all([
              getTokenInfo(tokenA),
              getTokenInfo(tokenB)
            ]);
            
            // Get token symbols as backup
            let token0Symbol = tokenAInfo.symbol;
            let token1Symbol = tokenBInfo.symbol;
            
            try {
              // Try to get actual tokens from the pair
              const pairContract = getPairContract(pairAddress, provider);
              const token0 = await pairContract.token0();
              const token1 = await pairContract.token1();
              const token0Contract = getERC20Contract(token0, provider);
              const token1Contract = getERC20Contract(token1, provider);
              token0Symbol = await token0Contract.symbol();
              token1Symbol = await token1Contract.symbol();
            } catch (err: any) {
              // Fallback to the original symbols if this fails
              logger.warn(`Couldn't get token symbols from pair contract: ${err.message || 'Unknown error'}`);
            }
            
            // Get reserves and total supply
            const [reserveA, reserveB] = await router.getReserves(pairAddress, tokenA, tokenB);
            const totalSupply = await router.totalSupply(pairAddress);
        
            // Skip if total supply is zero (shouldn't happen but just in case)
            if (totalSupply.isZero()) {
              return null;
            }
            
            // Calculate share of pool
            const poolShare = lpBalance.mul(ethers.BigNumber.from("10000")).div(totalSupply);
        
            // Calculate token amounts based on share
            const tokenAAmount = reserveA.mul(lpBalance).div(totalSupply);
            const tokenBAmount = reserveB.mul(lpBalance).div(totalSupply);
            
            // Calculate estimated value in USD (placeholder - you'd need price feeds for real implementation)
            const valueUSD = 0; // This would need to be calculated with price data
        
            return {
              tokenA,
              tokenB,
              tokenASymbol: token0Symbol || tokenAInfo.symbol,
              tokenBSymbol: token1Symbol || tokenBInfo.symbol,
              tokenAAmount: ethers.utils.formatUnits(tokenAAmount, tokenAInfo.decimals),
              tokenBAmount: ethers.utils.formatUnits(tokenBAmount, tokenBInfo.decimals),
              lpBalance: ethers.utils.formatUnits(lpBalance, 18),
              poolShare: poolShare.toNumber() / 100,
              pairAddress,
              lpTokenAddress: pairAddress, // In most DEXes, the LP token address is the pair address
              valueUSD: valueUSD.toString(),
              createdAt: Math.floor(Date.now() / 1000)
            };
          } catch (error) {
            logger.error(`Error processing pair ${tokenA}-${tokenB}:`, error);
            return null;
          }
        })
      );
      
      // Add valid positions from this batch
      positions.push(...batchResults.filter(Boolean) as LiquidityPosition[]);
    }
    
    logger.log(`Found ${positions.length} positions in total`);
    return positions;
  } catch (error) {
    logger.error("Error getting user's liquidity positions:", error);
    return [];
  }
};

/**
 * Add LP token to wallet (MetaMask)
 */
export const addLPTokenToWallet = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<boolean> => {
  try {
    if (!window.ethereum) {
      throw new Error("No crypto wallet found");
    }
    
    const lpInfo = await getLPTokenInfo(tokenAAddress, tokenBAddress);
    
    if (!lpInfo.exists) {
      throw new Error("LP token doesn't exist");
    }
    
    // Get token info for names and symbols
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      getTokenInfo(tokenAAddress),
      getTokenInfo(tokenBAddress)
    ]);
    
    // Get LP token name and symbol
    const lpTokenContract = getTokenContract(lpInfo.lpTokenAddress);
    let lpTokenSymbol, lpTokenName;
    
    try {
      lpTokenSymbol = await lpTokenContract.symbol();
      lpTokenName = await lpTokenContract.name();
    } catch (error) {
      // Fallback in case the LP token doesn't have symbol/name functions
      lpTokenSymbol = `${tokenAInfo.symbol}-${tokenBInfo.symbol}-LP`;
      lpTokenName = `${tokenAInfo.symbol}-${tokenBInfo.symbol} LP Token`;
    }
    
    // Add token to wallet
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: lpInfo.lpTokenAddress,
            symbol: lpTokenSymbol,
            decimals: 18,
            name: lpTokenName,
          },
        } as any
      });
      
      logger.log(`LP token ${lpTokenSymbol} added to wallet`);
      return true;
    } catch (error) {
      logger.error("Error adding token to wallet:", error);
      return false;
    }
  } catch (error) {
    logger.error("Error adding LP token to wallet:", error);
    return false;
  }
};

/**
 * Helper function to get ERC20 contract instance
 */
export function getERC20Contract(tokenAddress: string, provider: ethers.providers.Provider) {
  const abi = [
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function balanceOf(address) view returns (uint256)'
  ];
  return new ethers.Contract(tokenAddress, abi, provider);
}

// Add a temporary implementation for these functions if they don't exist elsewhere
// These can be replaced once the actual implementations are found
const getPairContract = (pairAddress: string, provider: ethers.providers.Provider): ethers.Contract => {
  return new ethers.Contract(
    pairAddress,
    [
      'function token0() external view returns (address)',
      'function token1() external view returns (address)',
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function totalSupply() external view returns (uint256)',
      'function balanceOf(address owner) external view returns (uint256)'
    ],
    provider
  );
};

// Add FACTORY_ADDRESS to CONTRACTS if it doesn't exist
// Using ROUTER_ADDRESS as a placeholder - in a real implementation, this would be the actual factory address
const FACTORY_ADDRESS = CONTRACTS.ROUTER_ADDRESS; // placeholder

const getFactoryContract = (provider: ethers.providers.Provider): ethers.Contract => {
  return new ethers.Contract(
    FACTORY_ADDRESS,
    [
      'function getPair(address tokenA, address tokenB) external view returns (address pair)',
      'event PairCreated(address indexed token0, address indexed token1, address pair, uint)'
    ],
    provider
  );
}; 