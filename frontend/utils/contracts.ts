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
export const ROUTER_ADDRESS = "0x29800Bd6193f44E4504af9E6d0A2f9961e15Ad45"; // 部署后替换为实际的SimpleSwapRouter地址

// 注意：部署后，请使用部署生成的AIHToken地址替换AIH的值
export const TOKENS = {
  ETH: "0xEthTokenAddress",  // 可以保留为占位符或使用Sepolia的ETH代币地址
  AIH: "0x7E38f7a1c61D11c9E5F3Df8a8006fd4294fD8507",  // 部署后替换为实际的AIH代币地址
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
    
    if (pairAddress === ethers.constants.AddressZero) {
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
    
    return [
      ethers.utils.formatUnits(reserveA, tokenADecimals),
      ethers.utils.formatUnits(reserveB, tokenBDecimals)
    ];
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
      
      return lpTokenAmount;
    } else {
      // Get reserves 获取储备量
      const [reserveA, reserveB] = await router.getReserves(
        pairAddress,
        tokenAAddress,
        tokenBAddress
      );
      
      const totalSupply = await router.totalSupply(pairAddress);
      
      const tokenAContract = getTokenContract(tokenAAddress);
      const tokenADecimals = await tokenAContract.decimals();
      const amountAWei = ethers.utils.parseUnits(amountADesired, tokenADecimals);
      
      // LP tokens = totalSupply * amountA / reserveA LP代币 = 总供应量 * amountA / 储备量
      const lpTokenAmount = totalSupply.mul(amountAWei).div(reserveA);
      
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
  try {
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const router = getRouterContract(signer);
    
    const tokenAContract = getTokenContract(tokenAAddress, signer);
    const tokenBContract = getTokenContract(tokenBAddress, signer);
    const tokenADecimals = await tokenAContract.decimals();
    const tokenBDecimals = await tokenBContract.decimals();
    
    const amountAWei = ethers.utils.parseUnits(amountADesired, tokenADecimals);
    const amountBWei = ethers.utils.parseUnits(amountBDesired, tokenBDecimals);
    
    // Calculate minimum amounts based on slippage 根据滑点计算最小数量
    const amountAMin = amountAWei.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    const amountBMin = amountBWei.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    
    // Check allowances 检查授权
    const allowanceA = await tokenAContract.allowance(signerAddress, ROUTER_ADDRESS);
    const allowanceB = await tokenBContract.allowance(signerAddress, ROUTER_ADDRESS);
    
    if (allowanceA.lt(amountAWei)) {
      throw new Error(`Insufficient allowance for ${await tokenAContract.symbol()}. Please approve first.`);
    }
    
    if (allowanceB.lt(amountBWei)) {
      throw new Error(`Insufficient allowance for ${await tokenBContract.symbol()}. Please approve first.`);
    }
    
    // Add liquidity 添加流动性
    return router.addLiquidity(
      tokenAAddress,
      tokenBAddress,
      amountAWei,
      amountBWei,
      amountAMin,
      amountBMin,
      signerAddress
    );
  } catch (error) {
    console.error("Error adding liquidity:", error);
    throw error;
  }
};

// Remove liquidity 移除流动性
export const removeLiquidity = async (
  tokenAAddress: string,
  tokenBAddress: string,
  liquidity: string,
  slippageTolerance: number = 0.5 // Default 0.5%
): Promise<ethers.providers.TransactionResponse> => {
  try {
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const router = getRouterContract(signer);
    
    // Get pair address 获取代币对地址
    const pairAddress = await router.getPairAddress(tokenAAddress, tokenBAddress);
    
    if (pairAddress === ethers.constants.AddressZero) {
      throw new Error("Pair does not exist");
    }
    
    // Get reserves 获取储备量
    const [reserveA, reserveB] = await router.getReserves(
      pairAddress,
      tokenAAddress,
      tokenBAddress
    );
    
    const totalSupply = await router.totalSupply(pairAddress);
    const liquidityWei = ethers.utils.parseUnits(liquidity, 18);
    
    // Calculate amounts based on share of pool 根据池子份额计算数量
    const amountA = reserveA.mul(liquidityWei).div(totalSupply);
    const amountB = reserveB.mul(liquidityWei).div(totalSupply);
    
    // Calculate minimum amounts based on slippage 根据滑点计算最小数量
    const amountAMin = amountA.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    const amountBMin = amountB.mul(Math.floor((100 - slippageTolerance) * 100)).div(10000);
    
    // Check allowance for LP tokens 检查LP代币授权
    const pairContract = getTokenContract(pairAddress, signer);
    const allowance = await pairContract.allowance(signerAddress, ROUTER_ADDRESS);
    
    if (allowance.lt(liquidityWei)) {
      throw new Error("Insufficient allowance for LP tokens. Please approve first.");
    }
    
    // Remove liquidity 移除流动性
    return router.removeLiquidity(
      tokenAAddress,
      tokenBAddress,
      liquidityWei,
      amountAMin,
      amountBMin,
      signerAddress
    );
  } catch (error) {
    console.error("Error removing liquidity:", error);
    throw error;
  }
};

// Get user's liquidity positions 获取用户流动性仓位
export const getUserLiquidityPositions = async (
  userAddress: string,
  tokenPairs: [string, string][]
): Promise<any[]> => {
  try {
    const router = getRouterContract();
    const positions = [];
    
    for (const [tokenA, tokenB] of tokenPairs) {
      // Get pair address 获取代币对地址
      const pairAddress = await router.getPairAddress(tokenA, tokenB);
      
      if (pairAddress === ethers.constants.AddressZero) {
        continue;
      }
      
      // Get LP token balance 获取LP代币余额
      const lpBalance = await router.balanceOf(pairAddress, userAddress);
      
      if (lpBalance.isZero()) {
        continue;
      }
      
      // Get reserves 获取储备量
      const [reserveA, reserveB] = await router.getReserves(
        pairAddress,
        tokenA,
        tokenB
      );
      
      const totalSupply = await router.totalSupply(pairAddress);
      
      // Calculate share of pool 计算池子份额
      const poolShare = lpBalance.mul(ethers.BigNumber.from("100")).div(totalSupply);
      
      // Calculate token amounts based on share 根据份额计算代币数量        
      const tokenAAmount = reserveA.mul(lpBalance).div(totalSupply);
      const tokenBAmount = reserveB.mul(lpBalance).div(totalSupply);
      
      const tokenAContract = getTokenContract(tokenA);
      const tokenBContract = getTokenContract(tokenB);
      const tokenASymbol = await tokenAContract.symbol();
      const tokenBSymbol = await tokenBContract.symbol();
      const tokenADecimals = await tokenAContract.decimals();
      const tokenBDecimals = await tokenBContract.decimals();
      
      positions.push({
        tokenA,
        tokenB,
        tokenASymbol,
        tokenBSymbol,
        tokenAAmount: ethers.utils.formatUnits(tokenAAmount, tokenADecimals),
        tokenBAmount: ethers.utils.formatUnits(tokenBAmount, tokenBDecimals),
        lpBalance: ethers.utils.formatUnits(lpBalance, 18),
        poolShare: poolShare.toNumber() / 100,
        pairAddress
      });
    }
    
    return positions;
  } catch (error) {
    console.error("Error getting user's liquidity positions:", error);
    return [];
  }
}; 