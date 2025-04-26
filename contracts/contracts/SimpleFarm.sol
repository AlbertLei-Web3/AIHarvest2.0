// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./AIHToken.sol";

interface ISimpleSwapRouter {
    function farmRemoveLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address from,
        address to
    ) external returns (uint256 amountA, uint256 amountB);
}

/**
 * @title SimpleFarm
 * @dev Staking contract for LP tokens with AIH token rewards
 * This contract follows the Checks-Effects-Interactions pattern to prevent reentrancy attacks
 */
contract SimpleFarm is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for AIHToken;
    using SafeMath for uint256;

    // Constants for calculations
    uint256 private constant PRECISION_FACTOR = 1e12;
    
    // Info of each user
    struct UserInfo {
        uint256 amount;           // How many LP tokens the user has provided
        uint256 rewardDebt;       // Reward debt
        uint256 pendingRewards;   // Pending rewards that are ready to be harvested
    }

    // Info of each pool
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract
        uint256 allocPoint;       // How many allocation points assigned to this pool
        uint256 lastRewardTime;   // Last timestamp that AIH distribution occurred
        uint256 accAIHPerShare;   // Accumulated AIH per share, times 1e12
        uint256 totalStaked;      // Total amount of tokens staked
    }

    // The AIH TOKEN
    AIHToken public immutable aihToken;
    
    // AIH tokens rewarded per second
    uint256 public aihPerSecond;
    
    // Total allocation points across all pools
    uint256 public totalAllocPoint;
    
    // The timestamp when AIH mining starts
    uint256 public immutable startTime;
    
    // Info of each pool
    PoolInfo[] public poolInfo;
    
    // Info of each user that stakes LP tokens - poolId => userAddress => UserInfo
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    // Events
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event PoolAdded(uint256 indexed pid, address lpToken, uint256 allocPoint);
    event PoolUpdated(uint256 indexed pid, uint256 allocPoint);
    event PoolRewardUpdated(uint256 indexed pid, uint256 lastRewardTime, uint256 lpSupply, uint256 accAIHPerShare);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event InsufficientAIHForReward(uint256 requested, uint256 available);
    event LiquidityRemoved(address indexed user, uint256 indexed pid, uint256 amount, uint256 amountA, uint256 amountB);

    /**
     * @dev Constructor
     * @param _aihToken The AIH token address
     */
    constructor(address _aihToken) {
        require(_aihToken != address(0), "AIH token cannot be zero address");
        aihToken = AIHToken(_aihToken);
        startTime = block.timestamp;
        aihPerSecond = 100000000000000000; // 0.1 AIH per second (about 8640 AIH per day)
    }

    /**
     * @dev Get the number of pools
     */
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
     * @dev Add a new LP to the pool
     * @param _allocPoint Allocation points for this pool
     * @param _lpToken Address of the LP token contract
     * @param _withUpdate Flag to call massUpdatePools
     */
    function add(uint256 _allocPoint, address _lpToken, bool _withUpdate) external onlyOwner {
        require(_lpToken != address(0), "LP token cannot be zero address");
        
        // Check for duplicate LP token
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            require(address(poolInfo[pid].lpToken) != _lpToken, "LP token already added");
        }
        
        if (_withUpdate) {
            massUpdatePools();
        }
        
        uint256 lastRewardTime = block.timestamp > startTime ? block.timestamp : startTime;
        
        // Update total allocation points - unchecked is safe with Solidity 0.8+ overflow protection
        totalAllocPoint += _allocPoint;
        
        poolInfo.push(PoolInfo({
            lpToken: IERC20(_lpToken),
            allocPoint: _allocPoint,
            lastRewardTime: lastRewardTime,
            accAIHPerShare: 0,
            totalStaked: 0
        }));
        
        emit PoolAdded(poolInfo.length - 1, _lpToken, _allocPoint);
    }

    /**
     * @dev Update the allocation points of a pool
     * @param _pid Pool ID
     * @param _allocPoint New allocation points
     * @param _withUpdate Flag to call massUpdatePools
     */
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) external onlyOwner {
        require(_pid < poolInfo.length, "Pool does not exist");
        
        if (_withUpdate) {
            massUpdatePools();
        }
        
        uint256 oldAllocPoint = poolInfo[_pid].allocPoint;
        
        // Update allocation points - unchecked is safe with Solidity 0.8+ overflow protection
        totalAllocPoint = totalAllocPoint - oldAllocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        
        emit PoolUpdated(_pid, _allocPoint);
    }

    /**
     * @dev Set the AIH tokens distributed per second
     * @param _aihPerSecond AIH tokens per second
     */
    function setAIHPerSecond(uint256 _aihPerSecond) external onlyOwner {
        massUpdatePools();
        uint256 oldRate = aihPerSecond;
        aihPerSecond = _aihPerSecond;
        emit RewardRateUpdated(oldRate, _aihPerSecond);
    }

    /**
     * @dev Calculate AIH rewards for a pool from the last reward time to now
     * @param _pid Pool ID
     * @param _user User address
     * @return pending AIH rewards
     */
    function pendingAIH(uint256 _pid, address _user) external view returns (uint256) {
        require(_pid < poolInfo.length, "Pool does not exist");
        
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];
        
        uint256 accAIHPerShare = pool.accAIHPerShare;
        uint256 lpSupply = pool.totalStaked;
        
        if (block.timestamp > pool.lastRewardTime && lpSupply != 0 && totalAllocPoint > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 aihReward = (timeElapsed * aihPerSecond * pool.allocPoint) / totalAllocPoint;
            accAIHPerShare += (aihReward * PRECISION_FACTOR) / lpSupply;
        }
        
        // Calculate rewards - unchecked is safe with Solidity 0.8+ overflow protection
        return (user.amount * accAIHPerShare) / PRECISION_FACTOR - user.rewardDebt + user.pendingRewards;
    }

    /**
     * @dev Update reward variables for all pools
     */
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    /**
     * @dev Update reward variables of the given pool
     * @param _pid Pool ID
     */
    function updatePool(uint256 _pid) public {
        require(_pid < poolInfo.length, "Pool does not exist");
        
        PoolInfo storage pool = poolInfo[_pid];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        
        uint256 lpSupply = pool.totalStaked;
        if (lpSupply == 0 || totalAllocPoint == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 aihReward = (timeElapsed * aihPerSecond * pool.allocPoint) / totalAllocPoint;
        
        // Mint AIH rewards
        aihToken.mint(address(this), aihReward);
        
        // Update accumulator - unchecked is safe with Solidity 0.8+ overflow protection
        pool.accAIHPerShare += (aihReward * PRECISION_FACTOR) / lpSupply;
        pool.lastRewardTime = block.timestamp;
        
        emit PoolRewardUpdated(_pid, pool.lastRewardTime, lpSupply, pool.accAIHPerShare);
    }

    /**
     * @notice Deposit LP tokens to the farm for AIH allocation
     * @dev Follows the CEI (Checks-Effects-Interactions) pattern for reentrancy protection:
     *      1. Checks: Validate pool ID and amount
     *      2. Effects: Update pool and user state
     *      3. Interactions: External token transfers (last step)
     * @param _pid The pool ID to deposit to
     * @param _amount The amount of LP tokens to deposit
     */
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        // CHECKS: Validate inputs
        require(_pid < poolInfo.length, "SimpleFarm: Invalid pool ID");
        require(_amount > 0, "SimpleFarm: Amount must be greater than 0");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        // Update pool to calculate current rewards
        updatePool(_pid);
        
        // Calculate pending rewards if user already has staked LP tokens
        uint256 pending = 0;
        if (user.amount > 0) {
            pending = (user.amount * pool.accAIHPerShare / PRECISION_FACTOR) - user.rewardDebt;
        }
        
        // EFFECTS: Update user and pool state
        // Update the amount of LP tokens staked by user
        user.amount += _amount;
        
        // Update total staked amount in the pool
        pool.totalStaked += _amount;
        
        // Update reward debt to reflect the new amount of staked LP tokens
        user.rewardDebt = user.amount * pool.accAIHPerShare / PRECISION_FACTOR;
        
        // INTERACTIONS: Perform external interactions last to prevent reentrancy
        // Transfer pending rewards if any
        if (pending > 0) {
            uint256 aihBalance = aihToken.balanceOf(address(this));
            if (aihBalance < pending) {
                emit InsufficientAIHForReward(pending, aihBalance);
                pending = aihBalance;
            }
            
            if (pending > 0) {
                aihToken.safeTransfer(address(msg.sender), pending);
                emit RewardPaid(msg.sender, pending);
            }
        }
        
        // Transfer LP tokens from user to this contract
        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        
        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev Withdraw LP tokens from the farm.
     * @notice This function is protected against reentrancy attacks
     * Following the CEI (Checks-Effects-Interactions) pattern:
     * 1. Checks: Validate inputs and state
     * 2. Effects: Update contract state
     * 3. Interactions: Transfer tokens (external calls)
     */
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        require(_pid < poolInfo.length, "SimpleFarm: Invalid pool ID");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        // CHECKS: Ensure user has enough LP tokens staked
        require(user.amount >= _amount, "SimpleFarm: Insufficient staked amount");
        
        // First update pool and calculate pending rewards
        updatePool(_pid);
        
        // Calculate pending rewards
        uint256 pendingAmount = user.amount * pool.accAIHPerShare / PRECISION_FACTOR - user.rewardDebt;
        
        // EFFECTS: Update state variables
        user.amount -= _amount;
        // Update total staked amount in the pool
        pool.totalStaked -= _amount;
        user.rewardDebt = user.amount * pool.accAIHPerShare / PRECISION_FACTOR;
        
        // INTERACTIONS: Transfer tokens (external calls last to prevent reentrancy)
        // Pay rewards if any
        if (pendingAmount > 0) {
            uint256 aihBalance = aihToken.balanceOf(address(this));
            if (aihBalance < pendingAmount) {
                emit InsufficientAIHForReward(pendingAmount, aihBalance);
                pendingAmount = aihBalance;
            }
            
            if (pendingAmount > 0) {
                aihToken.safeTransfer(msg.sender, pendingAmount);
                emit RewardPaid(msg.sender, pendingAmount);
            }
        }
        
        // Transfer LP tokens back to the user
        pool.lpToken.safeTransfer(msg.sender, _amount);
        
        emit Withdraw(msg.sender, _pid, _amount);
    }

    /**
     * @dev Harvest pending AIH rewards without withdrawing LP tokens.
     * @notice This function is protected against reentrancy attacks
     * Following the CEI (Checks-Effects-Interactions) pattern:
     * 1. Checks: Validate inputs and state
     * 2. Effects: Update contract state
     * 3. Interactions: Transfer tokens (external calls)
     */
    function harvest(uint256 _pid) external nonReentrant {
        require(_pid < poolInfo.length, "SimpleFarm: Invalid pool ID");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        // CHECKS: Ensure user has staked LP tokens
        require(user.amount > 0, "SimpleFarm: No staked LP tokens");
        
        // Update pool to ensure accurate rewards calculation
        updatePool(_pid);
        
        // Calculate pending rewards
        uint256 pendingAmount = user.amount * pool.accAIHPerShare / PRECISION_FACTOR - user.rewardDebt;
        
        // CHECKS: Ensure there are rewards to harvest
        require(pendingAmount > 0, "SimpleFarm: No rewards to harvest");
        
        // EFFECTS: Update state variables
        user.rewardDebt = user.amount * pool.accAIHPerShare / PRECISION_FACTOR;
        
        // INTERACTIONS: Transfer tokens (external calls last to prevent reentrancy)
        // Pay rewards
        uint256 aihBalance = aihToken.balanceOf(address(this));
        if (aihBalance < pendingAmount) {
            emit InsufficientAIHForReward(pendingAmount, aihBalance);
            pendingAmount = aihBalance;
        }
        
        if (pendingAmount > 0) {
            aihToken.safeTransfer(msg.sender, pendingAmount);
            emit RewardPaid(msg.sender, pendingAmount);
            emit Harvest(msg.sender, _pid, pendingAmount);
        }
    }

    /**
     * @dev Emergency withdraw LP tokens from the farm.
     * @notice This function bypasses reward distribution but is still protected against reentrancy
     * Following the CEI pattern with reduced logic for emergency situations
     */
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        require(_pid < poolInfo.length, "SimpleFarm: Invalid pool ID");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        // CHECKS
        uint256 amount = user.amount;
        require(amount > 0, "SimpleFarm: No tokens to withdraw");
        
        // EFFECTS: Zero out user info first
        user.amount = 0;
        user.rewardDebt = 0;
        
        // Update total staked amount in the pool
        pool.totalStaked -= amount;
        
        // INTERACTIONS: Transfer tokens last (external call)
        pool.lpToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    /**
     * @dev Get user info for a specific pool
     * @param _pid Pool ID
     * @param _user User address
     * @return amount Amount of LP tokens staked
     * @return rewardDebt Reward debt
     * @return pendingRewards Pending rewards
     */
    function getUserInfo(uint256 _pid, address _user) 
        external 
        view 
        returns (
            uint256 amount, 
            uint256 rewardDebt, 
            uint256 pendingRewards
        ) 
    {
        require(_pid < poolInfo.length, "Pool does not exist");
        UserInfo storage user = userInfo[_pid][_user];
        return (user.amount, user.rewardDebt, user.pendingRewards);
    }

    /**
     * @dev Get pool information
     * @param _pid Pool ID
     * @return lpToken LP token address
     * @return allocPoint Allocation points
     * @return lastRewardTime Last reward time
     * @return accAIHPerShare Accumulated AIH per share
     * @return totalStaked Total staked LP tokens
     */
    function getPoolInfo(uint256 _pid) external view returns (
        IERC20 lpToken,
        uint256 allocPoint,
        uint256 lastRewardTime,
        uint256 accAIHPerShare,
        uint256 totalStaked
    ) {
        require(_pid < poolInfo.length, "Pool does not exist");
        PoolInfo storage pool = poolInfo[_pid];
        return (
            pool.lpToken,
            pool.allocPoint,
            pool.lastRewardTime,
            pool.accAIHPerShare,
            pool.totalStaked
        );
    }

    /**
     * @dev Safe AIH transfer function, to handle rare cases where contract 
     * doesn't have enough AIH tokens
     * @param _to Recipient address
     * @param _amount Amount to transfer
     */
    function safeAIHTransfer(address _to, uint256 _amount) internal {
        require(_to != address(0), "Cannot transfer to zero address");
        
        uint256 aihBal = aihToken.balanceOf(address(this));
        uint256 amountToTransfer = _amount > aihBal ? aihBal : _amount;
        
        // Skip zero transfers
        if (amountToTransfer > 0) {
            aihToken.safeTransfer(_to, amountToTransfer);
        }
    }
} 