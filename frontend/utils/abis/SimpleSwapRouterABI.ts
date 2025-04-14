export const SimpleSwapRouterABI = [
  // Fee Management
  "function swapFee() view returns (uint256)",
  "function protocolFeeCut() view returns (uint256)",
  "function feeCollector() view returns (address)",
  "function setFeeCollector(address _feeCollector) external",
  "function setSwapFee(uint256 _swapFee) external",
  "function setProtocolFeeCut(uint256 _protocolFeeCut) external",
  
  // Factory Functions
  "function createPair(address tokenA, address tokenB) external returns (address pair)",
  "function getPair(address, address) view returns (address)",
  "function allPairs(uint) view returns (address)",
  
  // Liquidity Functions
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to) external returns (uint256 amountA, uint256 amountB)",
  
  // Swap Functions
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to) external returns (uint256[] memory amounts)",
  
  // View Functions
  "function getReserves(address pair, address tokenA, address tokenB) view returns (uint256 reserveA, uint256 reserveB)",
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
  "function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
  "function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) pure returns (uint256)",
  
  // Events
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
  "event Swap(address indexed pair, uint256 amountIn, uint256 amountOut, uint256 reserve0, uint256 reserve1, address to)",
  "event Mint(address indexed pair, uint256 amount0, uint256 amount1)",
  "event Burn(address indexed pair, uint256 amount0, uint256 amount1, address to)"
]; 