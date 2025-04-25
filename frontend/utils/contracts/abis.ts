/**
 * ABIs for interacting with smart contracts
 */

// SimpleSwapRouter ABI
export const SimpleSwapRouterABI = [
  "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to) returns (uint256[] amounts)",
  "function getReserves(address pair, address tokenA, address tokenB) view returns (uint256 reserveA, uint256 reserveB)",
  "function getPairAddress(address tokenA, address tokenB) view returns (address)",
  "function createPair(address tokenA, address tokenB) returns (address pair)",
  "function allPairsLength() view returns (uint256)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to) returns (uint256 amountA, uint256 amountB)",
  "function balanceOf(address pair, address account) view returns (uint256)",
  "function totalSupply(address pair) view returns (uint256)",
  "function getLPToken(address pair) view returns (address)"
];

// ERC20 Token ABI
export const IERC20ABI = [
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

// SimpleFarm ABI
export const SimpleFarmABI = [
  "function poolLength() view returns (uint256)",
  "function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardTime, uint256 accAIHPerShare, uint256 totalStaked)",
  "function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt, uint256 pendingRewards)",
  "function pendingAIH(uint256 _pid, address _user) view returns (uint256)",
  "function deposit(uint256 _pid, uint256 _amount)",
  "function withdraw(uint256 _pid, uint256 _amount)",
  "function harvest(uint256 _pid)",
  "function emergencyWithdraw(uint256 _pid)",
  "function getPoolInfo(uint256 _pid) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardTime, uint256 accAIHPerShare, uint256 totalStaked)",
  "function getUserInfo(uint256 _pid, address _user) view returns (uint256 amount, uint256 rewardDebt, uint256 pendingRewards)"
];

// AIH Token ABI
export const AIHTokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function MAX_SUPPLY() view returns (uint256)"
]; 