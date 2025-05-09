/**
 * SimpleSwapRouter contract related functions
 */
import { ethers } from 'ethers';
import { SimpleSwapRouterABI } from './abis';
import { logger, getSigner, getProvider } from './helpers';
import { CONTRACTS } from './addresses';
import { getTokenInfo } from './erc20';

/**
 * Get router contract instance
 */
export const getRouterContract = (signerOrProvider?: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(CONTRACTS.ROUTER_ADDRESS, SimpleSwapRouterABI, provider);
};

/**
 * Get pair address for token pair
 */
export const getPairAddress = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<string> => {
  try {
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    const router = getRouterContract();
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    
    return pairAddress;
  } catch (error) {
    logger.error("Error getting pair address:", error);
    return ethers.constants.AddressZero;
  }
};

/**
 * Get reserves of a pair with error handling
 */
export const getPairReserves = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<[string, string]> => {
  try {
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    const router = getRouterContract();
    
    // Get pair address
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    logger.debug(`Getting reserves for pair at address: ${pairAddress}`);
    
    if (pairAddress === ethers.constants.AddressZero) {
      logger.debug(`Pair does not exist. Returning zero reserves.`);
      return ["0", "0"];
    }
    
    // Get reserves
    const [reserveA, reserveB] = await router.getReserves(
      pairAddress,
      tokenAAddress,
      tokenBAddress
    );
    
    // Get token info for proper formatting
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      getTokenInfo(tokenAAddress),
      getTokenInfo(tokenBAddress)
    ]);
    
    // Check if reserves are very small
    if (reserveA.isZero() || reserveB.isZero() || 
        (reserveA.lt(ethers.utils.parseUnits("0.000001", 18)) && 
         reserveB.lt(ethers.utils.parseUnits("0.000001", 18)))) {
      logger.debug(`Reserves are too small to be meaningful. Returning zero reserves.`);
      return ["0", "0"];
    }
    
    const formattedReserveA = ethers.utils.formatUnits(reserveA, tokenAInfo.decimals);
    const formattedReserveB = ethers.utils.formatUnits(reserveB, tokenBInfo.decimals);
    
    logger.debug(`Reserves - ${tokenAInfo.symbol}: ${formattedReserveA}, ${tokenBInfo.symbol}: ${formattedReserveB}`);
    
    return [formattedReserveA, formattedReserveB];
  } catch (error) {
    logger.error("Error getting pair reserves:", error);
    return ["0", "0"];
  }
};

/**
 * Get price quote for swap with improved error handling
 * 获取交换价格报价，并改进了错误处理
 */
export const getSwapQuote = async (
  fromTokenAddress: string,
  toTokenAddress: string,
  amountIn: string
): Promise<string> => {
  try {
    if (!ethers.utils.isAddress(fromTokenAddress) || !ethers.utils.isAddress(toTokenAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    if (parseFloat(amountIn) <= 0) {
      return "0";
    }
    
    // Get router contract instance
    // 获取路由合约实例
    const router = getRouterContract();
    
    // Get token information (symbol, decimals, etc.)
    // 获取代币信息（符号、小数位等）
    const [fromTokenInfo, toTokenInfo] = await Promise.all([
      getTokenInfo(fromTokenAddress),
      getTokenInfo(toTokenAddress)
    ]);
    
    // Get liquidity pair address for the token pair
    // 获取代币对的流动性对地址
    const pairAddress = await router.getPairAddress(fromTokenAddress, toTokenAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      throw new Error(`Liquidity pair does not exist for ${fromTokenInfo.symbol}/${toTokenInfo.symbol}`);
    }
    
    // Get current reserves of both tokens in the liquidity pool
    // 获取流动性池中两种代币的当前储备量
    const [reserveA, reserveB] = await router.getReserves(
      pairAddress,
      fromTokenAddress,
      toTokenAddress
    );

    // Fix: Ensure input amount doesn't exceed token decimals to avoid BigNumber errors
    // 修复: 确保输入金额不超过代币精度，避免BigNumber错误
    try {
      // Step 1: Parse the input as a number to handle scientific notation
      // 第1步：将输入解析为数字以处理科学计数法
      const amountValue = parseFloat(amountIn);
      
      // Step 2: Format with exactly the number of decimals the token supports
      // 第2步：使用代币支持的精确小数位数格式化
      const safeAmountIn = amountValue.toFixed(fromTokenInfo.decimals);
      
      // Step 3: Convert to BigNumber (wei) for on-chain calculations
      // 第3步：转换为BigNumber（wei）用于链上计算
      const amountInWei = ethers.utils.parseUnits(safeAmountIn, fromTokenInfo.decimals);
      
      // Step 4: Call the getAmountOut function to calculate output based on constant product formula
      // 第4步：调用getAmountOut函数基于恒定乘积公式计算输出量
      // Formula: amountOut = (reserveOut * amountIn * (1 - fee)) / (reserveIn + amountIn * (1 - fee))
      // 公式：输出量 = (输出储备 * 输入量 * (1 - 手续费)) / (输入储备 + 输入量 * (1 - 手续费))
      const amountOut = await router.getAmountOut(amountInWei, reserveA, reserveB);
      
      // Step 5: Convert result from wei back to human-readable format
      // 第5步：将结果从wei转换回人类可读格式
      return ethers.utils.formatUnits(amountOut, toTokenInfo.decimals);
    } catch (parseError: any) {
      logger.error(`Error parsing amount "${amountIn}" to BigNumber:`, parseError);
      throw new Error(`Invalid amount format: ${parseError.message}`);
    }
  } catch (error) {
    logger.error("Error getting swap quote:", error);
    return "0";
  }
};

/**
 * Execute token swap with improved error handling and validation
 */
export const executeSwap = async (
  fromTokenAddress: string,
  toTokenAddress: string,
  amountIn: string,
  amountOutMin: string,
  slippageTolerance: number = 0.5 // Default 0.5%
): Promise<ethers.providers.TransactionResponse> => {
  logger.log(`Executing swap: ${amountIn} ${fromTokenAddress} to ${toTokenAddress}`);
  
  try {
    if (!ethers.utils.isAddress(fromTokenAddress) || !ethers.utils.isAddress(toTokenAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    if (parseFloat(amountIn) <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const router = getRouterContract(signer);
    
    // Get token info
    const [fromTokenInfo, toTokenInfo] = await Promise.all([
      getTokenInfo(fromTokenAddress),
      getTokenInfo(toTokenAddress)
    ]);
    
    // Format amounts with proper decimals
    const amountInWei = ethers.utils.parseUnits(amountIn, fromTokenInfo.decimals);
    
    // If amountOutMin is not provided, calculate it based on slippage
    let minOutWei: ethers.BigNumber;
    if (parseFloat(amountOutMin) > 0) {
      minOutWei = ethers.utils.parseUnits(amountOutMin, toTokenInfo.decimals);
    } else {
      // Get price quote and apply slippage
      const quote = await getSwapQuote(fromTokenAddress, toTokenAddress, amountIn);
      const quoteWithSlippage = parseFloat(quote) * (1 - slippageTolerance / 100);
      minOutWei = ethers.utils.parseUnits(quoteWithSlippage.toFixed(toTokenInfo.decimals), toTokenInfo.decimals);
    }
    
    // Check allowance for the input token
    const tokenContract = new ethers.Contract(fromTokenAddress, ["function allowance(address owner, address spender) view returns (uint256)"], signer);
    const allowance = await tokenContract.allowance(signerAddress, CONTRACTS.ROUTER_ADDRESS);
    if (allowance.lt(amountInWei)) {
      logger.error("Insufficient allowance", { allowance: ethers.utils.formatUnits(allowance, fromTokenInfo.decimals) });
      throw new Error(`Insufficient allowance for ${fromTokenInfo.symbol}. Please approve first.`);
    }
    
    // Execute swap
    logger.debug(`Swapping ${ethers.utils.formatUnits(amountInWei, fromTokenInfo.decimals)} ${fromTokenInfo.symbol} for minimum ${ethers.utils.formatUnits(minOutWei, toTokenInfo.decimals)} ${toTokenInfo.symbol}`);
    
    return router.swapExactTokensForTokens(
      amountInWei,
      minOutWei,
      [fromTokenAddress, toTokenAddress],
      signerAddress
    );
  } catch (error) {
    logger.error("Error executing swap:", error);
    throw error;
  }
};

/**
 * Create a new liquidity pair with improved error handling
 */
export const createTokenPair = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<string> => {
  logger.log(`Creating token pair between ${tokenAAddress} and ${tokenBAddress}`);
  
  try {
    if (!ethers.utils.isAddress(tokenAAddress) || !ethers.utils.isAddress(tokenBAddress)) {
      throw new Error("Invalid token addresses");
    }
    
    const signer = getSigner();
    const router = getRouterContract(signer);
    
    // Check if pair already exists
    const existingPair = await router.getPairAddress(tokenAAddress, tokenBAddress);
    if (existingPair !== ethers.constants.AddressZero) {
      logger.log(`Pair already exists at ${existingPair}`);
      return existingPair;
    }
    
    // Create new pair
    const tx = await router.createPair(tokenAAddress, tokenBAddress);
    logger.log(`Pair creation transaction submitted: ${tx.hash}`);
    
    const receipt = await tx.wait();
    logger.log(`Pair creation confirmed in block ${receipt.blockNumber}`);
    
    // Get the new pair address
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    logger.log(`New pair created at ${pairAddress}`);
    
    return pairAddress;
  } catch (error) {
    logger.error("Error creating token pair:", error);
    throw error;
  }
}; 