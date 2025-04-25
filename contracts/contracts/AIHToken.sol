// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AIHToken
 * @dev ERC20 token for the AIHarvest platform with minting and burning capabilities 平台代币，具有铸造和销毁功能
 */
contract AIHToken is ERC20, ERC20Burnable, Ownable {
    // Maximum supply cap
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Distribution parameters
    uint256 public constant TEAM_ALLOCATION = 150_000_000 * 10**18; // 15% for team 15%用于团队
    uint256 public constant ECOSYSTEM_ALLOCATION = 300_000_000 * 10**18; // 30% for ecosystem 30%用于生态系统
    uint256 public constant COMMUNITY_ALLOCATION = 550_000_000 * 10**18; // 55% for community/farming 55%用于社区/农场

    // Vesting tracking 解锁跟踪
    uint256 public teamTokensReleased;
    uint256 public ecosystemTokensReleased;
    
    // Vesting start timestamp 解锁开始时间戳
    uint256 public immutable vestingStart;
    
    // Vesting duration (2 years) 解锁持续时间（2年）
    uint256 public constant VESTING_DURATION = 730 days;
    
    // Team address 团队地址
    address public teamWallet;
    
    // Ecosystem fund address 生态系统基金地址  
    address public ecosystemWallet;
    
    // SimpleFarm contract address 简单农场合约地址
    address public farmAddress;

    // Events for vesting releases
    event TeamTokensReleased(uint256 amount);
    event EcosystemTokensReleased(uint256 amount);
    event FarmAddressSet(address farmAddress);

    /**
     * @dev Constructor that gives msg.sender all of existing tokens. 构造函数，将所有现有代币授予msg.sender
     */
    constructor(address _teamWallet, address _ecosystemWallet) 
        ERC20("AIHarvest Token", "AIH") 
    {
        require(_teamWallet != address(0), "Team wallet cannot be zero address");
        require(_ecosystemWallet != address(0), "Ecosystem wallet cannot be zero address");
        
        teamWallet = _teamWallet;
        ecosystemWallet = _ecosystemWallet;
        vestingStart = block.timestamp;
        
        // Mint initial community tokens to the owner for distribution 将初始社区代币铸造给所有者进行分发
        _mint(msg.sender, COMMUNITY_ALLOCATION);
    }
    
    /**
     * @dev Set the farming contract address 设置农场合约地址
     * @param _farmAddress The address of the farming contract 农场合约地址
     */
    function setFarmAddress(address _farmAddress) external onlyOwner {
        require(_farmAddress != address(0), "Farm address cannot be zero address");
        require(farmAddress == address(0), "Farm address already set");
        farmAddress = _farmAddress;
        emit FarmAddressSet(_farmAddress);
    }
    
    /**
     * @dev Release vested tokens for the team 释放团队代币
     * @return amount The amount of tokens released 释放的代币数量
     */
    function releaseTeamTokens() external returns (uint256 amount) {
        require(block.timestamp > vestingStart, "Vesting not started");
        
        uint256 vestedAmount = calculateVestedAmount(TEAM_ALLOCATION, teamTokensReleased);
        require(vestedAmount > 0, "No tokens to release");
        
        teamTokensReleased += vestedAmount;
        _mint(teamWallet, vestedAmount);
        
        emit TeamTokensReleased(vestedAmount);
        return vestedAmount;
    }
    
    /**
     * @dev Release vested tokens for the ecosystem fund 释放生态系统基金代币
     * @return amount The amount of tokens released 释放的代币数量
     */
    function releaseEcosystemTokens() external returns (uint256 amount) {
        require(block.timestamp > vestingStart, "Vesting not started");
        
        uint256 vestedAmount = calculateVestedAmount(ECOSYSTEM_ALLOCATION, ecosystemTokensReleased);
        require(vestedAmount > 0, "No tokens to release");
        
        ecosystemTokensReleased += vestedAmount;
        _mint(ecosystemWallet, vestedAmount);
        
        emit EcosystemTokensReleased(vestedAmount);
        return vestedAmount;
    }
    
    /**
     * @dev Calculate vested amount based on time passed and amount already released 根据时间过去和已经释放的数量计算解锁数量
     */
    function calculateVestedAmount(uint256 totalAllocation, uint256 alreadyReleased) 
        internal view returns (uint256) 
    {
        if (block.timestamp >= vestingStart + VESTING_DURATION) {
            return totalAllocation - alreadyReleased;
        } else {
            uint256 timeElapsed = block.timestamp - vestingStart;
            uint256 totalVested = (totalAllocation * timeElapsed) / VESTING_DURATION;
            return totalVested > alreadyReleased ? totalVested - alreadyReleased : 0;
        }
    }
    
    /**
     * @dev Get the available vested amount for team 获取团队可用的已解锁金额
     * @return The available vested amount 可用的已解锁金额
     */
    function getAvailableTeamVestedAmount() external view returns (uint256) {
        return calculateVestedAmount(TEAM_ALLOCATION, teamTokensReleased);
    }
    
    /**
     * @dev Get the available vested amount for ecosystem 获取生态可用的已解锁金额
     * @return The available vested amount 可用的已解锁金额
     */
    function getAvailableEcosystemVestedAmount() external view returns (uint256) {
        return calculateVestedAmount(ECOSYSTEM_ALLOCATION, ecosystemTokensReleased);
    }
    
    /**
     * @dev Mint new tokens. Only callable by the farming contract 铸造新代币。仅由农场合约调用
     * @param to The address to mint tokens to 铸造代币的地址
     * @param amount The amount of tokens to mint 铸造的代币数量
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == farmAddress, "Only the farm can mint tokens");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 newTotalSupply = totalSupply() + amount;
        require(newTotalSupply <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
    }
    
    /**
     * @dev Hook that is called before any transfer of tokens. 在任何代币转移之前调用的钩子
     * This implementation was removed to save gas since the check is now done directly in the mint function.
     * 移除此实现以节省gas，因为检查现在直接在mint函数中完成。
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
    }
} 