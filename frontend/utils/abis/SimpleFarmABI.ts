export const SimpleFarmABI = [
  // Pool Management
  "function addPool(address _lpToken, uint256 _allocationPoints, bool _withUpdate) external",
  "function setPool(uint256 _pid, uint256 _allocationPoints, bool _withUpdate) external",
  "function poolLength() external view returns (uint256)",
  
  // Pool Info
  "function poolInfo(uint256) view returns (address lpToken, uint256 allocationPoints, uint256 lastRewardBlock, uint256 accAIHPerShare, uint256 totalStaked)",
  "function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt)",
  "function getPoolWeight(uint256 _pid) external view returns (uint256)",
  
  // Reward Management
  "function AIHPerBlock() view returns (uint256)",
  "function setAIHPerBlock(uint256 _AIHPerBlock) external",
  "function startBlock() view returns (uint256)",
  "function totalAllocationPoints() view returns (uint256)",
  "function pendingReward(uint256 _pid, address _user) external view returns (uint256)",
  
  // User Actions
  "function deposit(uint256 _pid, uint256 _amount) external",
  "function withdraw(uint256 _pid, uint256 _amount) external",
  "function emergencyWithdraw(uint256 _pid) external",
  "function harvest(uint256 _pid) external",
  
  // Events
  "event Deposit(address indexed user, uint256 indexed pid, uint256 amount)",
  "event Withdraw(address indexed user, uint256 indexed pid, uint256 amount)",
  "event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount)",
  "event Harvest(address indexed user, uint256 indexed pid, uint256 amount)"
]; 