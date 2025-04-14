// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AIHToken.sol";

/**
 * @title SimpleFarm
 * @dev Staking contract for LP tokens with AIH token rewards
 */
contract SimpleFarm is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

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
    uint256 public totalAllocPoint = 0;
    
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

    /**
     * @dev Constructor
     * @param _aihToken The AIH token address
     */
    constructor(address _aihToken) Ownable() {
        require(_aihToken != address(0), "AIH token cannot be zero address");
        aihToken = AIHToken(_aihToken);
        startTime = block.timestamp;
        aihPerSecond = 100000000000000000; // 0.1 AIH per second (about 8640 AIH per day)
        
        // Transfer ownership
        transferOwnership(msg.sender);
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
        if (_withUpdate) {
            massUpdatePools();
        }
        
        uint256 lastRewardTime = block.timestamp > startTime ? block.timestamp : startTime;
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
        if (_withUpdate) {
            massUpdatePools();
        }
        
        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
        
        emit PoolUpdated(_pid, _allocPoint);
    }

    /**
     * @dev Set the AIH tokens distributed per second
     * @param _aihPerSecond AIH tokens per second
     */
    function setAIHPerSecond(uint256 _aihPerSecond) external onlyOwner {
        massUpdatePools();
        aihPerSecond = _aihPerSecond;
    }

    /**
     * @dev Calculate AIH rewards for a pool from the last reward time to now
     * @param _pid Pool ID
     * @return pending AIH rewards
     */
    function pendingAIH(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        
        uint256 accAIHPerShare = pool.accAIHPerShare;
        uint256 lpSupply = pool.totalStaked;
        
        if (block.timestamp > pool.lastRewardTime && lpSupply != 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 aihReward = (timeElapsed * aihPerSecond * pool.allocPoint) / totalAllocPoint;
            accAIHPerShare += (aihReward * 1e12) / lpSupply;
        }
        
        // Calculate rewards
        uint256 pending = (user.amount * accAIHPerShare) / 1e12 - user.rewardDebt + user.pendingRewards;
        return pending;
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
        PoolInfo storage pool = poolInfo[_pid];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        
        uint256 lpSupply = pool.totalStaked;
        if (lpSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 aihReward = (timeElapsed * aihPerSecond * pool.allocPoint) / totalAllocPoint;
        
        // Mint AIH rewards
        aihToken.mint(address(this), aihReward);
        
        pool.accAIHPerShare += (aihReward * 1e12) / lpSupply;
        pool.lastRewardTime = block.timestamp;
        
        emit PoolRewardUpdated(_pid, pool.lastRewardTime, lpSupply, pool.accAIHPerShare);
    }

    /**
     * @dev Deposit LP tokens to the farm for AIH allocation
     * @param _pid Pool ID
     * @param _amount Amount of LP tokens to deposit
     */
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        updatePool(_pid);
        
        // Harvest any pending rewards
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accAIHPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                user.pendingRewards += pending;
            }
        }
        
        if (_amount > 0) {
            // Transfer LP tokens to contract
            pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
            user.amount += _amount;
            pool.totalStaked += _amount;
        }
        
        user.rewardDebt = (user.amount * pool.accAIHPerShare) / 1e12;
        
        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev Withdraw LP tokens from the farm
     * @param _pid Pool ID
     * @param _amount Amount of LP tokens to withdraw
     */
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        require(user.amount >= _amount, "Withdraw: not enough balance");
        
        updatePool(_pid);
        
        // Harvest pending rewards
        uint256 pending = (user.amount * pool.accAIHPerShare) / 1e12 - user.rewardDebt + user.pendingRewards;
        if (pending > 0) {
            user.pendingRewards = 0;
            safeAIHTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        
        if (_amount > 0) {
            user.amount -= _amount;
            pool.totalStaked -= _amount;
            pool.lpToken.safeTransfer(msg.sender, _amount);
        }
        
        user.rewardDebt = (user.amount * pool.accAIHPerShare) / 1e12;
        
        emit Withdraw(msg.sender, _pid, _amount);
    }

    /**
     * @dev Harvest rewards without withdrawing LP tokens
     * @param _pid Pool ID
     */
    function harvest(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        updatePool(_pid);
        
        uint256 pending = (user.amount * pool.accAIHPerShare) / 1e12 - user.rewardDebt + user.pendingRewards;
        if (pending > 0) {
            user.pendingRewards = 0;
            safeAIHTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        
        user.rewardDebt = (user.amount * pool.accAIHPerShare) / 1e12;
    }

    /**
     * @dev Withdraw without caring about rewards (EMERGENCY ONLY)
     * @param _pid Pool ID
     */
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        uint256 amount = user.amount;
        pool.totalStaked -= amount;
        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        
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
        uint256 aihBal = aihToken.balanceOf(address(this));
        if (_amount > aihBal) {
            aihToken.transfer(_to, aihBal);
        } else {
            aihToken.transfer(_to, _amount);
        }
    }
} 