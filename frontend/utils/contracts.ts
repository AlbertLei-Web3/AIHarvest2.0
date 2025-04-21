import { ethers } from 'ethers';

// Define ethereum window type
declare global {
  interface Window {
    ethereum: any;
  }
}

// ABI imports
const SimpleSwapRouterABI = [
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to) returns (uint256[] amounts)",
  "function getReserves(address pair, address tokenA, address tokenB) view returns (uint256 reserveA, uint256 reserveB)",
  "function getPairAddress(address tokenA, address tokenB) view returns (address)",
  "function createPair(address tokenA, address tokenB) returns (address pair)",
  "function allPairsLength() view returns (uint256)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to) returns (uint256 amountA, uint256 amountB)",
  "function balanceOf(address pair, address account) view returns (uint256)",
  "function totalSupply(address pair) view returns (uint256)"
];

const IERC20ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

// Testnet contract addresses 测试网合约地址
export const ROUTER_ADDRESS = "0x6252F147Accf98c2527EFbd7446955b51A3f2Cf4"; // SimpleSwapRouter地址

// 注意：部署后，请使用部署生成的AIHToken地址替换AIH的值
export const TOKENS = {
  ETH: "0xEthTokenAddress",  // 可以保留为占位符或使用Sepolia的ETH代币地址
  AIH: "0x23572E77d0Ba0893b4d83757eB23137729decd87",  // AIH代币地址
  USDT: "0xUsdtTokenAddress", // 可以保留为占位符或使用Sepolia的USDT代币地址
  DAI: "0xDaiTokenAddress",   // 可以保留为占位符或使用Sepolia的DAI代币地址
  
  // 添加用户的自定义代币
  TD: "0xCa7B8473802716b69fE753a5f9F6D5013a8D8B20",
  FHBI: "0x5c15514CA3B498510D0CEE0B505F1c603bB3324D",
  FHBI2: "0x3746A42C0281c874Cb3796E3d15fb035c8a585b9",
  FHBI3: "0xa7525f69cbc47dF69d26EF2426993604d7C2D07F",
  RTK: "0xa447E2f8BBC54eB13134b02f69bE3401E10BD0A3"
};

// Get signer from connected wallet 从连接的钱包获取签名者
export const getSigner = () => {
  if (!window.ethereum) throw new Error("No crypto wallet found");
  return new ethers.providers.Web3Provider(window.ethereum).getSigner();
};

// Get router contract instance 获取路由合约实例
export const getRouterContract = (signerOrProvider?: ethers.Signer | ethers.providers.Provider) => {
  const provider = signerOrProvider || new ethers.providers.Web3Provider(window.ethereum);
  return new ethers.Contract(ROUTER_ADDRESS, SimpleSwapRouterABI, provider);
};

// Get ERC20 token contract instance 获取ERC20代币合约实例
export const getTokenContract = (tokenAddress: string, signerOrProvider?: ethers.Signer | ethers.providers.Provider) => {
  const provider = signerOrProvider || new ethers.providers.Web3Provider(window.ethereum);
  return new ethers.Contract(tokenAddress, IERC20ABI, provider);
};

// Get token balance 获取代币余额
export const getTokenBalance = async (tokenAddress: string, accountAddress: string): Promise<string> => {
  const tokenContract = getTokenContract(tokenAddress);
  const balance = await tokenContract.balanceOf(accountAddress);
  const decimals = await tokenContract.decimals();
  return ethers.utils.formatUnits(balance, decimals);
};

// Get token allowance 获取代币授权
export const getTokenAllowance = async (tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> => {
  const tokenContract = getTokenContract(tokenAddress);
  const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
  const decimals = await tokenContract.decimals();
  return ethers.utils.formatUnits(allowance, decimals);
};

// Approve router to spend tokens 批准路由合约花费代币
export const approveToken = async (tokenAddress: string, amount: string): Promise<ethers.providers.TransactionResponse> => {
  const signer = getSigner();
  const tokenContract = getTokenContract(tokenAddress, signer);
  const tokenDecimals = await tokenContract.decimals();
  const amountToApprove = ethers.utils.parseUnits(amount, tokenDecimals);
  return tokenContract.approve(ROUTER_ADDRESS, amountToApprove);
};

// Approve router to spend LP tokens 批准路由合约花费LP代币
export const approveLPToken = async (
  tokenAAddress: string,
  tokenBAddress: string,
  amount: string,
  bypassChecks: boolean = false
): Promise<ethers.providers.TransactionResponse> => {
  console.log(`\n-------- APPROVE LP TOKEN TRANSACTION START --------`);
  console.log(`Approving LP tokens for pair ${tokenAAddress} and ${tokenBAddress}`);
  console.log(`Amount: ${amount}, Bypass Checks: ${bypassChecks}`);
  
  const DEBUG = true; // Set to true to enable verbose logging
  
  try {
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    console.log(`Using signer address: ${signerAddress}`);
    
    const provider = signer.provider;
    if (DEBUG) console.log(`Provider: ${provider?.connection?.url || 'No provider URL'}`);
    
    const router = getRouterContract(signer);
    if (DEBUG) console.log(`Router address: ${ROUTER_ADDRESS}`);
    
    // Get pair address 获取代币对地址
    let pairAddress;
    try {
      // First, check if both tokens are valid contract addresses
      if (DEBUG && !bypassChecks) {
        const codeA = await provider.getCode(tokenAAddress);
        const codeB = await provider.getCode(tokenBAddress);
        console.log(`Token A contract code length: ${codeA.length}`);
        console.log(`Token B contract code length: ${codeB.length}`);
        if (codeA.length <= 2) console.log(`WARNING: Token A does not appear to be a valid contract!`);
        if (codeB.length <= 2) console.log(`WARNING: Token B does not appear to be a valid contract!`);
      }
      
      pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
      console.log(`Pair address: ${pairAddress}`);
      
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error("Pair does not exist. You need to add liquidity first to create the pair.");
      }
      
      // Verify if pair address is a valid contract
      if (DEBUG && !bypassChecks) {
        const code = await provider.getCode(pairAddress);
        console.log(`Pair contract code length: ${code.length}`);
        if (code.length <= 2 && !bypassChecks) {
          console.log("WARNING: Pair contract appears empty but router knows about it. Continuing with caution...");
        }
      }
    } catch (error) {
      console.error("Error getting pair address:", error);
      throw new Error(`Failed to get pair address: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log(`Approving LP tokens for pair: ${pairAddress}`);
    
    if (bypassChecks) {
      console.log(`BYPASS MODE: Skipping token approval and proceeding directly to removal.`);
      // Create a mock transaction to satisfy the interface requirement
      return {
        hash: "bypass-approval-hash",
        wait: async () => ({ status: 1 })
      } as any;
    }
    
    // Get LP token contract
    try {
      // Use custom safer approach to check if the contract is valid
      const lpTokenContract = getTokenContract(pairAddress, signer);
      console.log("LP token contract created");
      
      // Safely check if the contract has the proper methods we need
      if (DEBUG && !bypassChecks) {
        try {
          console.log("Trying to get token name...");
          const name = await lpTokenContract.name();
          console.log(`LP Token name: ${name}`);
        } catch (e) {
          console.warn("WARNING: Could not get token name. This might not be a standard ERC20 token.", e);
        }
        
        try {
          console.log("Trying to get token symbol...");
          const symbol = await lpTokenContract.symbol();
          console.log(`LP Token symbol: ${symbol}`);
        } catch (e) {
          console.warn("WARNING: Could not get token symbol. This might not be a standard ERC20 token.", e);
        }
      }
      
      // Check current allowance - this is where the previous error occurred
      console.log("Checking current allowance...");
      let currentAllowance;
      try {
        currentAllowance = await lpTokenContract.allowance(signerAddress, ROUTER_ADDRESS);
        console.log(`Current allowance: ${ethers.utils.formatUnits(currentAllowance, 18)}`);
      } catch (e) {
        console.error("Error checking allowance:", e);
        if (bypassChecks) {
          console.log("Bypassing allowance check error due to bypass flag");
        } else {
          throw new Error(`Failed to check allowance. This may not be a valid LP token contract: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      
      // Parse amount with 18 decimals (LP tokens typically have 18 decimals)
      const amountToApprove = ethers.utils.parseUnits(amount, 18);
      console.log(`Amount to approve (in wei): ${amountToApprove.toString()}`);
      
      // Approve router to spend LP tokens
      console.log(`Sending approval transaction...`);
      try {
        const tx = await lpTokenContract.approve(ROUTER_ADDRESS, amountToApprove);
        console.log(`Approval transaction submitted with hash: ${tx.hash}`);
        console.log(`-------- APPROVE LP TOKEN TRANSACTION END --------\n`);
        return tx;
      } catch (e) {
        console.error("Error sending approve transaction:", e);
        throw new Error(`Failed to send approval transaction: ${e instanceof Error ? e.message : String(e)}`);
      }
    } catch (error) {
      console.error("Error during LP token approval:", error);
      console.log(`-------- APPROVE LP TOKEN TRANSACTION FAILED --------\n`);
      throw new Error(`LP token approval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error("Error approving LP tokens:", error);
    console.log(`-------- APPROVE LP TOKEN TRANSACTION FAILED --------\n`);
    throw error;
  }
};

// Get price quote for swap 获取交换价格报价
export const getSwapQuote = async (
  fromTokenAddress: string,
  toTokenAddress: string,
  amountIn: string
): Promise<string> => {
  try {
    const router = getRouterContract();
    const fromTokenContract = getTokenContract(fromTokenAddress);
    const fromTokenDecimals = await fromTokenContract.decimals();
    const toTokenContract = getTokenContract(toTokenAddress);
    const toTokenDecimals = await toTokenContract.decimals();
    
    // Get pair address 获取代币对地址
    const pairAddress = await router.getPairAddress(fromTokenAddress, toTokenAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      throw new Error("Liquidity pair does not exist");
    }
    
    // Get reserves 获取储备量
    const [reserveA, reserveB] = await router.getReserves(
      pairAddress,
      fromTokenAddress,
      toTokenAddress
    );

    // Calculate output amount 计算输出数量
    const amountInWei = ethers.utils.parseUnits(amountIn, fromTokenDecimals);
    const amountOut = await router.getAmountOut(amountInWei, reserveA, reserveB);
    
    return ethers.utils.formatUnits(amountOut, toTokenDecimals);
  } catch (error) {
    console.error("Error getting swap quote:", error);
    return "0";
  }
};

// Execute swap 执行交换
export const executeSwap = async (
  fromTokenAddress: string,
  toTokenAddress: string,
  amountIn: string,
  amountOutMin: string
): Promise<ethers.providers.TransactionResponse> => {
  const signer = getSigner();
  const signerAddress = await signer.getAddress();
  const router = getRouterContract(signer);
  
  const fromTokenContract = getTokenContract(fromTokenAddress, signer);
  const fromTokenDecimals = await fromTokenContract.decimals();
  const toTokenContract = getTokenContract(toTokenAddress, signer);
  const toTokenDecimals = await toTokenContract.decimals();
  
  const amountInWei = ethers.utils.parseUnits(amountIn, fromTokenDecimals);
  const minOutWei = ethers.utils.parseUnits(amountOutMin, toTokenDecimals);
  
  // Check allowance 检查授权
  const allowance = await fromTokenContract.allowance(signerAddress, ROUTER_ADDRESS);
  if (allowance.lt(amountInWei)) {
    throw new Error("Insufficient allowance. Please approve token first.");
  }
  
  // Execute swap 执行交换      
  return router.swapExactTokensForTokens(
    amountInWei,
    minOutWei,
    [fromTokenAddress, toTokenAddress],
    signerAddress
  );
};

// Get reserves of a pair 获得代币对储备量
export const getPairReserves = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<[string, string]> => {
  try {
    const router = getRouterContract();
    
    // Get pair address 获取代币对地址
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    console.log(`Getting reserves for pair at address: ${pairAddress}`);
    
    if (pairAddress === ethers.constants.AddressZero) {
      console.log(`Pair does not exist. Returning zero reserves.`);
      return ["0", "0"];
    }
    
    // Get reserves 获取储备量
    const [reserveA, reserveB] = await router.getReserves(
      pairAddress,
      tokenAAddress,
      tokenBAddress
    );
    
    const tokenAContract = getTokenContract(tokenAAddress);
    const tokenBContract = getTokenContract(tokenBAddress);
    const tokenADecimals = await tokenAContract.decimals();
    const tokenBDecimals = await tokenBContract.decimals();
    
    // Check if reserves are very small
    if (reserveA.isZero() || reserveB.isZero() || 
        (reserveA.lt(ethers.utils.parseUnits("0.000001", 18)) && 
         reserveB.lt(ethers.utils.parseUnits("0.000001", 18)))) {
      console.log(`Reserves are too small to be meaningful. Returning zero reserves.`);
      console.log(`Actual reserves - A: ${reserveA.toString()}, B: ${reserveB.toString()}`);
      return ["0", "0"];
    }
    
    const formattedReserveA = ethers.utils.formatUnits(reserveA, tokenADecimals);
    const formattedReserveB = ethers.utils.formatUnits(reserveB, tokenBDecimals);
    
    console.log(`Reserves - A: ${formattedReserveA}, B: ${formattedReserveB}`);
    
    return [formattedReserveA, formattedReserveB];
  } catch (error) {
    console.error("Error getting pair reserves:", error);
    return ["0", "0"];
  }
};

// Create a new pair 创建新的代币对
export const createTokenPair = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<string> => {
  try {
    const signer = getSigner();
    const router = getRouterContract(signer);
    
    const tx = await router.createPair(tokenAAddress, tokenBAddress);
    const receipt = await tx.wait();
    
    // Extract pair address from logs 从日志中提取代币对地址
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    return pairAddress;
  } catch (error) {
    console.error("Error creating pair:", error);
    throw error;
  }
};

// Get LP token balance 获取LP代币余额
export const getLPTokenBalance = async (
  tokenAAddress: string,
  tokenBAddress: string,
  accountAddress: string
): Promise<string> => {
  try {
    const router = getRouterContract();
    
    // Get pair address 获取代币对地址
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      return "0";
    }
    
    // Get LP token balance 获取LP代币余额
    const balance = await router.balanceOf(pairAddress, accountAddress);
    return ethers.utils.formatUnits(balance, 18); // LP tokens typically have 18 decimals
  } catch (error) {
    console.error("Error getting LP token balance:", error);
    return "0";
  }
};

// Get total LP tokens 获取总LP代币
export const getLPTokenTotalSupply = async (
  tokenAAddress: string,
  tokenBAddress: string
): Promise<string> => {
  try {
    const router = getRouterContract();
    
    // Get pair address 获取代币对地址
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      return "0";
    }
    
    // Get total LP token supply 获取总LP代币供应量
    const totalSupply = await router.totalSupply(pairAddress);
    return ethers.utils.formatUnits(totalSupply, 18); // LP tokens typically have 18 decimals LP代币通常有18个数量级
  } catch (error) {
    console.error("Error getting LP token total supply:", error);
    return "0";
  }
};

// Calculate LP token amount to receive 计算LP代币数量
export const calculateLPTokenAmount = async (
  tokenAAddress: string,
  tokenBAddress: string,
  amountADesired: string,
  amountBDesired: string
): Promise<string> => {
  try {
    const router = getRouterContract();
    
    // Get pair address 获取代币对地址
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    console.log(`Calculating LP tokens for pair at address: ${pairAddress}`);
    
    if (pairAddress === ethers.constants.AddressZero) {
      // First LP provider gets sqrt(amountA * amountB) LP tokens 第一个LP提供者获得sqrt(amountA * amountB) LP代币
      const tokenAContract = getTokenContract(tokenAAddress);
      const tokenBContract = getTokenContract(tokenBAddress);
      const tokenADecimals = await tokenAContract.decimals();
      const tokenBDecimals = await tokenBContract.decimals();
      
      const amountAWei = ethers.utils.parseUnits(amountADesired, tokenADecimals);
      const amountBWei = ethers.utils.parseUnits(amountBDesired, tokenBDecimals);
      
      const lpTokenAmount = Math.sqrt(
        parseFloat(amountADesired) * parseFloat(amountBDesired)
      ).toString();
      
      console.log(`New pair LP token calculation: sqrt(${amountADesired} * ${amountBDesired}) = ${lpTokenAmount}`);
      return lpTokenAmount;
    } else {
      // Get reserves 获取储备量
      const [reserveA, reserveB] = await router.getReserves(
        pairAddress,
        tokenAAddress,
        tokenBAddress
      );
      
      const totalSupply = await router.totalSupply(pairAddress);
      
      console.log(`Existing pair: ReserveA=${reserveA.toString()}, ReserveB=${reserveB.toString()}, TotalSupply=${totalSupply.toString()}`);
      
      // If reserves are zero or very low but totalSupply exists, treat as new pair
      if (reserveA.isZero() || reserveB.isZero() || 
          (reserveA.lt(ethers.utils.parseUnits("0.000001", 18)) && reserveB.lt(ethers.utils.parseUnits("0.000001", 18)))) {
        console.log(`Reserves are too low or zero. Treating as new pair.`);
        const lpTokenAmount = Math.sqrt(
          parseFloat(amountADesired) * parseFloat(amountBDesired)
        ).toString();
        console.log(`New pair LP token calculation: sqrt(${amountADesired} * ${amountBDesired}) = ${lpTokenAmount}`);
        return lpTokenAmount;
      }
      
      const tokenAContract = getTokenContract(tokenAAddress);
      const tokenADecimals = await tokenAContract.decimals();
      const amountAWei = ethers.utils.parseUnits(amountADesired, tokenADecimals);
      
      // LP tokens = totalSupply * amountA / reserveA LP代币 = 总供应量 * amountA / 储备量
      const lpTokenAmount = totalSupply.mul(amountAWei).div(reserveA);
      console.log(`LP token calculation: ${totalSupply.toString()} * ${amountAWei.toString()} / ${reserveA.toString()} = ${lpTokenAmount.toString()}`);
      
      return ethers.utils.formatUnits(lpTokenAmount, 18);
    }
  } catch (error) {
    console.error("Error calculating LP token amount:", error);
    return "0";
  }
};

// Add liquidity 添加流动性
export const addLiquidity = async (
  tokenAAddress: string,
  tokenBAddress: string,
  amountADesired: string,
  amountBDesired: string,
  slippageTolerance: number = 0.5 // Default 0.5%
): Promise<ethers.providers.TransactionResponse> => {
  console.log(`\n-------- ADD LIQUIDITY TRANSACTION START --------`);
  console.log(`Adding liquidity for tokens: ${tokenAAddress} and ${tokenBAddress}`);
  console.log(`Desired amounts: ${amountADesired} (token A), ${amountBDesired} (token B), Slippage: ${slippageTolerance}%`);
  
  try {
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    console.log(`Using signer address: ${signerAddress}`);
    
    const router = getRouterContract(signer);
    console.log(`Router contract retrieved at ${ROUTER_ADDRESS}`);
    
    const tokenAContract = getTokenContract(tokenAAddress, signer);
    const tokenBContract = getTokenContract(tokenBAddress, signer);
    const tokenADecimals = await tokenAContract.decimals();
    const tokenBDecimals = await tokenBContract.decimals();
    const tokenASymbol = await tokenAContract.symbol();
    const tokenBSymbol = await tokenBContract.symbol();
    
    console.log(`Token A: ${tokenASymbol} (${tokenAAddress}), Decimals: ${tokenADecimals}`);
    console.log(`Token B: ${tokenBSymbol} (${tokenBAddress}), Decimals: ${tokenBDecimals}`);
    
    const amountAWei = ethers.utils.parseUnits(amountADesired, tokenADecimals);
    const amountBWei = ethers.utils.parseUnits(amountBDesired, tokenBDecimals);
    
    console.log(`Amount A in wei: ${amountAWei.toString()}`);
    console.log(`Amount B in wei: ${amountBWei.toString()}`);
    
    // Check if this is a new pair
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      console.log(`This is a new pair - creating initial liquidity`);
      
      // For a new pair, check if the amount is sufficient for initial liquidity
      const product = parseFloat(amountADesired) * parseFloat(amountBDesired);
      const sqrt = Math.sqrt(product);
      
      console.log(`Initial liquidity calculation:`);
      console.log(`Product of amounts: ${product}`);
      console.log(`Square root (approx. LP tokens): ${sqrt}`);
      
      if (sqrt < 1000) {
        console.error(`INSUFFICIENT_INITIAL_AMOUNTS: Square root ${sqrt} is less than minimum 1000`);
        throw new Error("INSUFFICIENT_INITIAL_AMOUNTS");
      }
      console.log(`Initial liquidity check passed. Minimum requirement (1000) met with ${sqrt.toFixed(2)}`);
    } else {
      console.log(`Adding to existing pair at address: ${pairAddress}`);
      
      // Get reserves to calculate optimal amounts
      try {
        const [reserveA, reserveB] = await router.getReserves(
          pairAddress,
          tokenAAddress,
          tokenBAddress
        );
        
        console.log(`Current reserves: ${ethers.utils.formatUnits(reserveA, tokenADecimals)} ${tokenASymbol}, ${ethers.utils.formatUnits(reserveB, tokenBDecimals)} ${tokenBSymbol}`);
        
        // Check if one of the reserves is zero (broken pair)
        if (reserveA.isZero() !== reserveB.isZero()) {
          console.error(`Unbalanced reserves: One token has zero reserve, the other doesn't`);
          console.error(`Reserve A: ${reserveA.toString()}, Reserve B: ${reserveB.toString()}`);
          throw new Error("UNBALANCED_RESERVES");
        }
      } catch (error) {
        console.error("Error getting reserves:", error);
        throw new Error(`Failed to get reserves: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Calculate minimum amounts based on slippage 根据滑点计算最小数量
    const amountAMin = amountAWei.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    const amountBMin = amountBWei.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    
    console.log(`Minimum amounts (with slippage): ${ethers.utils.formatUnits(amountAMin, tokenADecimals)} ${tokenASymbol}, ${ethers.utils.formatUnits(amountBMin, tokenBDecimals)} ${tokenBSymbol}`);
    
    // Check allowances 检查授权
    const allowanceA = await tokenAContract.allowance(signerAddress, ROUTER_ADDRESS);
    const allowanceB = await tokenBContract.allowance(signerAddress, ROUTER_ADDRESS);
    
    console.log(`Token A allowance: ${ethers.utils.formatUnits(allowanceA, tokenADecimals)} ${tokenASymbol}`);
    console.log(`Token B allowance: ${ethers.utils.formatUnits(allowanceB, tokenBDecimals)} ${tokenBSymbol}`);
    
    if (allowanceA.lt(amountAWei)) {
      console.error(`Insufficient allowance for ${tokenASymbol}: ${ethers.utils.formatUnits(allowanceA, tokenADecimals)} < ${amountADesired}`);
      throw new Error(`Insufficient allowance for ${tokenASymbol}. Please approve first.`);
    }
    
    if (allowanceB.lt(amountBWei)) {
      console.error(`Insufficient allowance for ${tokenBSymbol}: ${ethers.utils.formatUnits(allowanceB, tokenBDecimals)} < ${amountBDesired}`);
      throw new Error(`Insufficient allowance for ${tokenBSymbol}. Please approve first.`);
    }
    
    console.log(`Allowance checks passed. Executing addLiquidity...`);
    
    // Add liquidity 添加流动性
    const tx = await router.addLiquidity(
      tokenAAddress,
      tokenBAddress,
      amountAWei,
      amountBWei,
      amountAMin,
      amountBMin,
      signerAddress
    );
    
    console.log(`Transaction submitted with hash: ${tx.hash}`);
    console.log(`-------- ADD LIQUIDITY TRANSACTION END --------\n`);
    return tx;
  } catch (error) {
    console.error("Error adding liquidity:", error);
    console.log(`-------- ADD LIQUIDITY TRANSACTION FAILED --------\n`);
    throw error;
  }
};

// Remove liquidity 移除流动性
export const removeLiquidity = async (
  tokenAAddress: string,
  tokenBAddress: string,
  liquidity: string,
  slippageTolerance: number = 0.5, // Default 0.5%
  bypassChecks: boolean = false
): Promise<ethers.providers.TransactionResponse> => {
  console.log(`\n-------- REMOVE LIQUIDITY TRANSACTION START --------`);
  console.log(`Removing liquidity for tokens: ${tokenAAddress} and ${tokenBAddress}`);
  console.log(`Liquidity amount: ${liquidity}, Slippage: ${slippageTolerance}%, Bypass Checks: ${bypassChecks}`);
  
  try {
    // Get signer and router
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    console.log(`Using signer address: ${signerAddress}`);
    
    const router = getRouterContract(signer);
    console.log(`Router contract retrieved at ${ROUTER_ADDRESS}`);
    
    // Get pair address 获取代币对地址
    let pairAddress;
    try {
      pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
      console.log(`Pair address: ${pairAddress}`);
      
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error("Pair does not exist");
      }
      
      // Add a check for pair contract code
      if (!bypassChecks) {
        const provider = signer.provider;
        const code = await provider.getCode(pairAddress);
        console.log(`Pair contract code length: ${code.length}`);
        
        if (code.length <= 2) {
          console.log("WARNING: Pair contract appears empty but router knows about it. This might be a contract deployment issue.");
          console.log("Will try to proceed with removal, but this might fail.");
        }
      }
    } catch (error) {
      console.error("Error getting pair address:", error);
      throw new Error(`Failed to get pair address: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Special handling for direct removal in case of corrupt contract state
    if (bypassChecks) {
      console.log(`BYPASS MODE: Attempting direct router call without preliminary checks...`);
      try {
        // Parse liquidity amount
        const liquidityWei = ethers.utils.parseUnits(liquidity, 18);
        
        // Use minimal amounts for min returns
        const minAmount = ethers.utils.parseUnits("0.0001", 18);
        
        // Call router directly with minimal checks
        const tx = await router.removeLiquidity(
          tokenAAddress,
          tokenBAddress,
          liquidityWei,
          minAmount,
          minAmount,
          signerAddress
        );
        
        console.log(`Transaction submitted with hash: ${tx.hash}`);
        console.log(`-------- REMOVE LIQUIDITY TRANSACTION END --------\n`);
        return tx;
      } catch (error) {
        console.error("Error in direct removal:", error);
        throw new Error(`Direct router.removeLiquidity failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Get reserves and total supply
    let reserveA, reserveB, totalSupply;
    try {
      [reserveA, reserveB] = await router.getReserves(
        pairAddress,
        tokenAAddress,
        tokenBAddress
      );
      console.log(`Reserves: ${ethers.utils.formatUnits(reserveA)} (token A), ${ethers.utils.formatUnits(reserveB)} (token B)`);
      
      totalSupply = await router.totalSupply(pairAddress);
      console.log(`Total supply: ${ethers.utils.formatUnits(totalSupply)}`);
    } catch (error) {
      console.error("Error getting reserves or total supply:", error);
      throw new Error(`Failed to get reserves or total supply: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Parse liquidity amount
    const liquidityWei = ethers.utils.parseUnits(liquidity, 18);
    console.log(`Liquidity in wei: ${liquidityWei.toString()}`);
    
    let amountA, amountB, amountAMin, amountBMin;
    try {
      amountA = reserveA.mul(liquidityWei).div(totalSupply);
      amountB = reserveB.mul(liquidityWei).div(totalSupply);
  
      console.log(`Expected token amounts: ${ethers.utils.formatUnits(amountA)} (token A), ${ethers.utils.formatUnits(amountB)} (token B)`);
      
      // Calculate minimum amounts based on slippage 根据滑点计算最小数量
      amountAMin = amountA.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
      amountBMin = amountB.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
      console.log(`Minimum amounts (with slippage): ${ethers.utils.formatUnits(amountAMin)} (token A), ${ethers.utils.formatUnits(amountBMin)} (token B)`);
    } catch (error) {
      console.error("Error calculating token amounts:", error);
      throw new Error(`Failed to calculate token amounts: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Check allowance for LP tokens 检查LP代币授权
    let allowance;
    try {
      const pairContract = getTokenContract(pairAddress, signer);
      allowance = await pairContract.allowance(signerAddress, ROUTER_ADDRESS);
      console.log(`LP token allowance: ${ethers.utils.formatUnits(allowance)}`);
      
      if (allowance.lt(liquidityWei)) {
        console.error(`Insufficient allowance: ${ethers.utils.formatUnits(allowance)} < ${ethers.utils.formatUnits(liquidityWei)}`);
        throw new Error("Insufficient allowance for LP tokens. Please approve first.");
      }
    } catch (error) {
      console.error("Error checking allowance:", error);
      throw new Error(`Failed to check allowance: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Remove liquidity 移除流动性
    console.log(`\nExecuting removeLiquidity on router contract...`);
    console.log(`Parameters: 
      tokenA: ${tokenAAddress}
      tokenB: ${tokenBAddress}
      liquidity: ${liquidityWei.toString()}
      amountAMin: ${amountAMin.toString()}
      amountBMin: ${amountBMin.toString()}
      to: ${signerAddress}
    `);
    
    try {
      const tx = await router.removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        liquidityWei,
        amountAMin,
        amountBMin,
        signerAddress
      );
      console.log(`Transaction submitted with hash: ${tx.hash}`);
      console.log(`-------- REMOVE LIQUIDITY TRANSACTION END --------\n`);
      return tx;
    } catch (error) {
      console.error("Error calling removeLiquidity on router:", error);
      throw new Error(`Router.removeLiquidity failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error("Failure in removeLiquidity function:", error);
    console.log(`-------- REMOVE LIQUIDITY TRANSACTION FAILED --------\n`);
    throw error;
  }
};

// Get user's liquidity positions 获取用户流动性仓位
export const getUserLiquidityPositions = async (
  userAddress: string,
  tokenPairs: [string, string][]
): Promise<any[]> => {
  try {
    console.log(`Getting liquidity positions for user ${userAddress}`);
    console.log(`Checking ${tokenPairs.length} token pairs`);
    
    const router = getRouterContract();
    const positions = [];
    
    for (const [tokenA, tokenB] of tokenPairs) {
      try {
        console.log(`Checking pair: ${tokenA} - ${tokenB}`);
        
        // Skip invalid addresses
        if (!tokenA || !tokenB || tokenA === ethers.constants.AddressZero || tokenB === ethers.constants.AddressZero) {
          console.log('Skipping invalid token addresses');
          continue;
        }
        
        // Get pair address 获取代币对地址
        const pairAddress = await router.getPairAddress(tokenA, tokenB);
        console.log(`Pair address: ${pairAddress}`);
        
        if (pairAddress === ethers.constants.AddressZero) {
          console.log('Pair does not exist, skipping');
          continue;
        }
        
        // Get LP token balance 获取LP代币余额
        const lpBalance = await router.balanceOf(pairAddress, userAddress);
        console.log(`LP Balance: ${lpBalance.toString()}`);
        
        if (lpBalance.isZero()) {
          console.log('LP balance is zero, skipping');
          continue;
        }
        
        console.log('Found position with non-zero LP balance!');
        
        // Get reserves 获取储备量
        const [reserveA, reserveB] = await router.getReserves(
          pairAddress,
          tokenA,
          tokenB
        );
        
        const totalSupply = await router.totalSupply(pairAddress);
        
        // Calculate share of pool 计算池子份额
        const poolShare = lpBalance.mul(ethers.BigNumber.from("10000")).div(totalSupply);
        console.log(`Pool share calculation: (${lpBalance.toString()} / ${totalSupply.toString()}) * 100 = ${poolShare.toNumber() / 100}%`);
        
        // Calculate token amounts based on share 根据份额计算代币数量        
        const tokenAAmount = reserveA.mul(lpBalance).div(totalSupply);
        const tokenBAmount = reserveB.mul(lpBalance).div(totalSupply);
        
        let tokenASymbol, tokenBSymbol, tokenADecimals, tokenBDecimals;
        
        try {
          const tokenAContract = getTokenContract(tokenA);
          tokenASymbol = await tokenAContract.symbol();
          tokenADecimals = await tokenAContract.decimals();
        } catch (error) {
          console.error(`Error getting token A details: ${error}`);
          tokenASymbol = "Unknown";
          tokenADecimals = 18;
        }
        
        try {
          const tokenBContract = getTokenContract(tokenB);
          tokenBSymbol = await tokenBContract.symbol();
          tokenBDecimals = await tokenBContract.decimals();
        } catch (error) {
          console.error(`Error getting token B details: ${error}`);
          tokenBSymbol = "Unknown";
          tokenBDecimals = 18;
        }
        
        const position = {
          tokenA,
          tokenB,
          tokenASymbol,
          tokenBSymbol,
          tokenAAmount: ethers.utils.formatUnits(tokenAAmount, tokenADecimals),
          tokenBAmount: ethers.utils.formatUnits(tokenBAmount, tokenBDecimals),
          lpBalance: ethers.utils.formatUnits(lpBalance, 18),
          poolShare: poolShare.toNumber() / 100,
          pairAddress
        };
        
        console.log('Adding position:', position);
        positions.push(position);
      } catch (error) {
        console.error(`Error processing pair ${tokenA}-${tokenB}:`, error);
      }
    }
    
    console.log(`Found ${positions.length} positions in total`);
    return positions;
  } catch (error) {
    console.error("Error getting user's liquidity positions:", error);
    return [];
  }
}; 