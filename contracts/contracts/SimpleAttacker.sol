// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SimpleSwapRouter.sol";

/**
 * @title MaliciousERC20
 * @dev A malicious ERC20 token that attempts reentrancy attacks during transfers
 * 一个恶意的ERC20代币，在转账过程中尝试重入攻击
 */
contract MaliciousERC20 is ERC20 {
    address public attacker;
    SimpleSwapRouter public router;
    bool public isAttacking;
    bool public attackSucceeded;
    
    event ReentrancyAttempt(string functionName, bool success);
    
    constructor(address _router, string memory name, string memory symbol) 
        ERC20(name, symbol) {
        attacker = msg.sender;
        router = SimpleSwapRouter(_router);
        isAttacking = false;
        attackSucceeded = false;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Override the _beforeTokenTransfer hook to attempt reentrancy attacks
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        // Only attempt reentrancy when being transferred from the router
        if (from == address(router) && !isAttacking) {
            isAttacking = true;
            
            // Try to re-enter the router's functions
            try this.attemptRouterReentrancy() {
                // Attack succeeded - able to reenter router functions
                attackSucceeded = true;
                emit ReentrancyAttempt("router", true);
            } catch Error(string memory reason) {
                // Attack failed with reason
                if (bytes(reason).length > 0) {
                    // Check if the reason contains "ReentrancyGuard"
                    emit ReentrancyAttempt(reason, false);
                }
            } catch {
                // Attack failed without specific reason
                emit ReentrancyAttempt("unknown", false);
            }
            
            isAttacking = false;
        }
        
        super._beforeTokenTransfer(from, to, amount);
    }
    
    // External function to attempt router reentrancy
    function attemptRouterReentrancy() external {
        require(isAttacking, "Not in attack mode");
        require(msg.sender == address(this), "Only self-call allowed");
        
        // Try to call addLiquidity to test for reentrancy
        router.addLiquidity(
            address(this),
            router.aihToken(),
            1 ether,
            1 ether,
            0,
            0,
            attacker
        );
    }
    
    // Set attack succeeded status (for testing)
    function resetAttackStatus() external {
        require(msg.sender == attacker, "Only attacker can reset");
        attackSucceeded = false;
    }
}

/**
 * @title SimpleAttacker
 * @dev A contract to test reentrancy vulnerabilities in SimpleSwapRouter
 * 一个用于测试SimpleSwapRouter中重入漏洞的合约
 */
contract SimpleAttacker {
    SimpleSwapRouter public router;
    MaliciousERC20 public maliciousToken;
    string public attackFunction;
    
    // Config for attack
    address public tokenB;
    uint256 public amountA;
    uint256 public amountB;
    uint256 public lpAmount;
    
    constructor(address _router, string memory _attackFunction) {
        router = SimpleSwapRouter(_router);
        attackFunction = _attackFunction;
        
        // Deploy the malicious token
        maliciousToken = new MaliciousERC20(_router, "Malicious Token", "MAL");
        
        // Mint tokens to this contract
        maliciousToken.mint(address(this), 100000 ether);
    }
    
    // Configuration functions
    function setAttackConfig(address _tokenB, uint256 _amountA, uint256 _amountB) external {
        tokenB = _tokenB;
        amountA = _amountA;
        amountB = _amountB;
        
        // Approve router to spend our tokens
        maliciousToken.approve(address(router), type(uint256).max);
        IERC20(tokenB).approve(address(router), type(uint256).max);
    }
    
    function setRemoveLiquidityConfig(address _tokenB, uint256 _lpAmount) external {
        tokenB = _tokenB;
        lpAmount = _lpAmount;
        
        // Get LP token and approve router
        address pair = router.getPair(address(maliciousToken), tokenB);
        if (pair != address(0)) {
            address lpToken = router.getLPToken(pair);
            IERC20(lpToken).approve(address(router), type(uint256).max);
        }
    }
    
    function setSwapConfig(address _tokenB, uint256 _amountA) external {
        tokenB = _tokenB;
        amountA = _amountA;
        
        // Approve router to spend our tokens
        maliciousToken.approve(address(router), type(uint256).max);
    }
    
    /**
     * @dev Transfer malicious tokens to another address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferMaliciousTokens(address to, uint256 amount) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        // Transfer tokens to the specified address
        maliciousToken.transfer(to, amount);
    }
    
    // Attack execution functions
    function executeAddLiquidityAttack() external {
        // Reset attack status
        maliciousToken.resetAttackStatus();
        
        // Try to add liquidity with the malicious token
        try router.addLiquidity(
            address(maliciousToken),
            tokenB,
            amountA,
            amountB,
            0, // minA
            0, // minB
            address(this)
        ) {
            // If we get here, the attack might have succeeded or failed
            // Check the token's status to know
        } catch Error(string memory reason) {
            // If we catch an error with "ReentrancyGuard", the protection worked
            require(bytes(reason).length > 0, "Empty error reason");
        } catch {
            // Some other error occurred
        }
    }
    
    function executeRemoveLiquidityAttack() external {
        // Reset attack status
        maliciousToken.resetAttackStatus();
        
        // First ensure we have a pair
        address pair = router.getPair(address(maliciousToken), tokenB);
        require(pair != address(0), "Pair doesn't exist");
        
        try router.removeLiquidity(
            address(maliciousToken),
            tokenB,
            lpAmount,
            0, // minA
            0, // minB
            address(this)
        ) {
            // If we get here, the attack might have succeeded or failed
        } catch Error(string memory reason) {
            // If we catch an error with "ReentrancyGuard", the protection worked
            require(bytes(reason).length > 0, "Empty error reason");
        } catch {
            // Some other error occurred
        }
    }
    
    function executeSwapAttack() external {
        // Reset attack status
        maliciousToken.resetAttackStatus();
        
        address[] memory path = new address[](2);
        path[0] = address(maliciousToken);
        path[1] = tokenB;
        
        try router.swapExactTokensForTokens(
            amountA,
            0, // minOut
            path,
            address(this)
        ) {
            // If we get here, the attack might have succeeded or failed
        } catch Error(string memory reason) {
            // If we catch an error with "ReentrancyGuard", the protection worked
            require(bytes(reason).length > 0, "Empty error reason");
        } catch {
            // Some other error occurred
        }
    }
    
    // Helper function to get attack status
    function getAttackStatus() external view returns (bool) {
        return maliciousToken.attackSucceeded();
    }
    
    // Allow contract to receive tokens
    receive() external payable {}
} 