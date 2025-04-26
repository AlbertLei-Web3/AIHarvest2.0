// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SimpleSwapRouter.sol";
import "./SimpleFarm.sol";

/**
 * @title MaliciousToken
 * @dev Token with hooks that attempt to reenter protected functions
 */
contract MaliciousToken is ERC20 {
    address public attacker;
    address public target;
    string public attackFunction;
    bool public attacking = false;
    
    // Cache for attack parameters
    address public tokenA;
    address public tokenB;
    uint256 public amountA;
    uint256 public amountB;
    uint256 public poolId;
    
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol) {
        attacker = msg.sender;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function setAttackTarget(address _target, string memory _function) external {
        require(msg.sender == attacker, "Not authorized");
        target = _target;
        attackFunction = _function;
    }
    
    function setAddLiquidityParams(address _tokenA, uint256 _amountA, uint256 _amountB) external {
        tokenA = _tokenA;
        amountA = _amountA;
        amountB = _amountB;
    }
    
    function setSwapParams(address _tokenB, uint256 _amountA) external {
        tokenB = _tokenB;
        amountA = _amountA;
    }
    
    function setFarmParams(uint256 _poolId, uint256 _amount) external {
        poolId = _poolId;
        amountA = _amount;
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        // Only attempt reentry on transfers from target contract and avoid recursive attacks
        if (from == target && !attacking && bytes(attackFunction).length > 0) {
            attacking = true;
            
            if (keccak256(bytes(attackFunction)) == keccak256(bytes("addLiquidity"))) {
                attemptReenterAddLiquidity();
            } else if (keccak256(bytes(attackFunction)) == keccak256(bytes("removeLiquidity"))) {
                attemptReenterRemoveLiquidity();
            } else if (keccak256(bytes(attackFunction)) == keccak256(bytes("swap"))) {
                attemptReenterSwap();
            } else if (keccak256(bytes(attackFunction)) == keccak256(bytes("deposit"))) {
                attemptReenterDeposit();
            } else if (keccak256(bytes(attackFunction)) == keccak256(bytes("withdraw"))) {
                attemptReenterWithdraw();
            } else if (keccak256(bytes(attackFunction)) == keccak256(bytes("harvest"))) {
                attemptReenterHarvest();
            } else if (keccak256(bytes(attackFunction)) == keccak256(bytes("emergencyWithdraw"))) {
                attemptReenterEmergencyWithdraw();
            }
            
            attacking = false;
        }
        
        super._beforeTokenTransfer(from, to, amount);
    }
    
    function attemptReenterAddLiquidity() internal {
        SimpleSwapRouter router = SimpleSwapRouter(target);
        router.addLiquidity(
            address(this), 
            tokenA, 
            amountA, 
            amountB, 
            0, 
            0, 
            attacker
        );
    }
    
    function attemptReenterRemoveLiquidity() internal {
        SimpleSwapRouter router = SimpleSwapRouter(target);
        router.removeLiquidity(
            address(this),
            tokenA,
            amountA, // liquidity amount
            0, // min A
            0, // min B
            attacker
        );
    }
    
    function attemptReenterSwap() internal {
        SimpleSwapRouter router = SimpleSwapRouter(target);
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = tokenB;
        
        router.swapExactTokensForTokens(
            amountA,
            0, // amountOutMin
            path,
            attacker
        );
    }
    
    function attemptReenterDeposit() internal {
        SimpleFarm farm = SimpleFarm(target);
        farm.deposit(poolId, amountA);
    }
    
    function attemptReenterWithdraw() internal {
        SimpleFarm farm = SimpleFarm(target);
        farm.withdraw(poolId, amountA);
    }
    
    function attemptReenterHarvest() internal {
        SimpleFarm farm = SimpleFarm(target);
        farm.harvest(poolId);
    }
    
    function attemptReenterEmergencyWithdraw() internal {
        SimpleFarm farm = SimpleFarm(target);
        farm.emergencyWithdraw(poolId);
    }
}

/**
 * @title ReentrancyChecker
 * @dev A contract to check for reentrancy vulnerabilities in SimpleSwapRouter and SimpleFarm
 */
contract ReentrancyChecker {
    SimpleSwapRouter public router;
    SimpleFarm public farm;
    MaliciousToken public attackToken;
    address public owner;
    address public weth;
    
    // Attack results
    bool public addLiquidityReentrancyDetected = false;
    bool public removeLiquidityReentrancyDetected = false;
    bool public swapReentrancyDetected = false;
    bool public depositReentrancyDetected = false;
    bool public withdrawReentrancyDetected = false;
    bool public harvestReentrancyDetected = false;
    bool public emergencyWithdrawReentrancyDetected = false;
    
    constructor(address _router, address _farm, address _weth) {
        router = SimpleSwapRouter(_router);
        farm = SimpleFarm(_farm);
        weth = _weth;
        owner = msg.sender;
        
        // Create attack token
        attackToken = new MaliciousToken("Attack Token", "ATTACK");
    }
    
    // Setup for router tests
    function setupAddLiquidityAttack(address tokenA) external {
        require(msg.sender == owner, "Not authorized");
        
        // Mint attack tokens
        attackToken.mint(address(this), 1000 ether);
        
        // Approve router to spend tokens
        attackToken.approve(address(router), type(uint256).max);
        IERC20(tokenA).approve(address(router), type(uint256).max);
        
        // Create pair if needed
        if (router.getPair(address(attackToken), tokenA) == address(0)) {
            router.createPair(address(attackToken), tokenA);
        }
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(router), "addLiquidity");
        attackToken.setAddLiquidityParams(tokenA, 10 ether, 10 ether);
    }
    
    function setupRemoveLiquidityAttack(address tokenA) external {
        require(msg.sender == owner, "Not authorized");
        
        // Clear previous attack status
        removeLiquidityReentrancyDetected = false;
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(router), "removeLiquidity");
        attackToken.setAddLiquidityParams(tokenA, 5 ether, 5 ether);
    }
    
    function setupSwapAttack(address tokenB) external {
        require(msg.sender == owner, "Not authorized");
        
        // Clear previous attack status
        swapReentrancyDetected = false;
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(router), "swap");
        attackToken.setSwapParams(tokenB, 1 ether);
    }
    
    // Setup for farm tests
    function setupFarmDepositAttack(uint256 poolId) external {
        require(msg.sender == owner, "Not authorized");
        
        // Clear previous attack status
        depositReentrancyDetected = false;
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(farm), "deposit");
        attackToken.setFarmParams(poolId, 1 ether);
    }
    
    function setupFarmWithdrawAttack(uint256 poolId) external {
        require(msg.sender == owner, "Not authorized");
        
        // Clear previous attack status
        withdrawReentrancyDetected = false;
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(farm), "withdraw");
        attackToken.setFarmParams(poolId, 1 ether);
    }
    
    function setupFarmHarvestAttack(uint256 poolId) external {
        require(msg.sender == owner, "Not authorized");
        
        // Clear previous attack status
        harvestReentrancyDetected = false;
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(farm), "harvest");
        attackToken.setFarmParams(poolId, 0); // Amount not needed for harvest
    }
    
    function setupEmergencyWithdrawAttack(uint256 poolId) external {
        require(msg.sender == owner, "Not authorized");
        
        // Clear previous attack status
        emergencyWithdrawReentrancyDetected = false;
        
        // Set up attack parameters
        attackToken.setAttackTarget(address(farm), "emergencyWithdraw");
        attackToken.setFarmParams(poolId, 0); // Amount not needed for emergency withdraw
    }
    
    // Test functions for router
    function testAddLiquidityReentrancy(uint256 attackAmount, uint256 tokenAmount) external {
        require(msg.sender == owner, "Not authorized");
        
        try router.addLiquidity(
            address(attackToken),
            weth,
            attackAmount,
            tokenAmount,
            0,
            0,
            address(this)
        ) {
            // If successful, the attack token would try to reenter during the token transfer
            // If reentrancy protection works, this completes without issues
        } catch {
            // If execution reaches here, it means the contract reverted somewhere
            // This could be due to reentrancy protection OR other reasons
            // We need to check if the attack flag was set
            addLiquidityReentrancyDetected = true;
        }
    }
    
    function testRemoveLiquidityReentrancy(uint256 liquidity) external {
        require(msg.sender == owner, "Not authorized");
        address pair = router.getPair(address(attackToken), weth);
        require(pair != address(0), "Pair doesn't exist");
        
        try router.removeLiquidity(
            address(attackToken),
            weth,
            liquidity,
            0,
            0,
            address(this)
        ) {
            // If successful, the attack token would try to reenter during the token transfer
        } catch {
            removeLiquidityReentrancyDetected = true;
        }
    }
    
    function testSwapReentrancy(uint256 amount) external {
        require(msg.sender == owner, "Not authorized");
        
        address[] memory path = new address[](2);
        path[0] = address(attackToken);
        path[1] = weth;
        
        try router.swapExactTokensForTokens(
            amount,
            0,
            path,
            address(this)
        ) {
            // If successful, the attack token would try to reenter during the token transfer
        } catch {
            swapReentrancyDetected = true;
        }
    }
    
    // Test functions for farm
    function testDepositReentrancy(uint256 poolId, uint256 amount) external {
        require(msg.sender == owner, "Not authorized");
        
        try farm.deposit(poolId, amount) {
            // If successful, the attack token would try to reenter during reward transfers
        } catch {
            depositReentrancyDetected = true;
        }
    }
    
    function testWithdrawReentrancy(uint256 poolId, uint256 amount) external {
        require(msg.sender == owner, "Not authorized");
        
        try farm.withdraw(poolId, amount) {
            // If successful, the attack token would try to reenter during token transfers
        } catch {
            withdrawReentrancyDetected = true;
        }
    }
    
    function testHarvestReentrancy(uint256 poolId) external {
        require(msg.sender == owner, "Not authorized");
        
        try farm.harvest(poolId) {
            // If successful, the attack token would try to reenter during reward transfers
        } catch {
            harvestReentrancyDetected = true;
        }
    }
    
    function testEmergencyWithdrawReentrancy(uint256 poolId) external {
        require(msg.sender == owner, "Not authorized");
        
        try farm.emergencyWithdraw(poolId) {
            // If successful, the attack token would try to reenter during token transfers
        } catch {
            emergencyWithdrawReentrancyDetected = true;
        }
    }
    
    // Helper functions
    function getAttackResults() external view returns (
        bool addLiquidity,
        bool removeLiquidity,
        bool swap,
        bool deposit,
        bool withdraw,
        bool harvest,
        bool emergencyWithdraw
    ) {
        return (
            addLiquidityReentrancyDetected,
            removeLiquidityReentrancyDetected,
            swapReentrancyDetected,
            depositReentrancyDetected,
            withdrawReentrancyDetected,
            harvestReentrancyDetected,
            emergencyWithdrawReentrancyDetected
        );
    }
    
    // Allow contract to receive tokens for testing
    receive() external payable {}
} 