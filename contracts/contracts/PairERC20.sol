// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PairERC20
 * @dev An ERC20 token that represents liquidity provider tokens for a token pair
 * 代表代币对的流动性提供者代币的ERC20代币
 */
contract PairERC20 is ERC20, ERC20Burnable, Ownable {
    // Token addresses locked to immutable for gas savings and security
    address public immutable token0;
    address public immutable token1;
    address public immutable router;

    // Events
    event Minted(address indexed to, uint256 amount);
    event BurnedFrom(address indexed from, uint256 amount);

    /**
     * @dev Constructor for PairERC20 token
     * @param _token0 First token address in the pair
     * @param _token1 Second token address in the pair
     * @param _router Router contract address
     * @param name_ Token name
     * @param symbol_ Token symbol
     */
    constructor(
        address _token0,
        address _token1,
        address _router,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        require(_token0 != address(0), "token0 cannot be zero address");
        require(_token1 != address(0), "token1 cannot be zero address");
        require(_router != address(0), "router cannot be zero address");
        require(_token0 != _token1, "tokens must be different");
        
        token0 = _token0;
        token1 = _token1;
        router = _router;
        
        // Transfer ownership to router
        transferOwnership(_router);
    }

    /**
     * @dev Mints tokens - can only be called by router
     * 铸造代币 - 只能由路由器调用
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @dev Burns tokens - can only be called by router
     * 销毁代币 - 只能由路由器调用
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        
        // Optimized allowance check for better gas usage
        if (from != msg.sender) {
            uint256 currentAllowance = allowance(from, msg.sender);
            // If not infinite approval
            if (currentAllowance != type(uint256).max) {
                require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
                unchecked {
                    _approve(from, msg.sender, currentAllowance - amount);
                }
            }
        }
        
        _burn(from, amount);
        emit BurnedFrom(from, amount);
    }
    
    /**
     * @dev Override decimals to match most common tokens
     * 覆盖decimals以匹配最常见的代币
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
} 