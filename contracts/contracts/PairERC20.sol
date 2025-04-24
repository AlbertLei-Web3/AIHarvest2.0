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
    address public token0;
    address public token1;
    address public router;

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
        token0 = _token0;
        token1 = _token1;
        router = _router;
        
        // OpenZeppelin 4.9.3 uses transferOwnership instead of Ownable constructor
        transferOwnership(_router);
    }

    /**
     * @dev Mints tokens - can only be called by router
     * 铸造代币 - 只能由路由器调用
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens - can only be called by router
     * 销毁代币 - 只能由路由器调用
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyOwner {
        if (from != msg.sender) {
            uint256 currentAllowance = allowance(from, msg.sender);
            if (currentAllowance != type(uint256).max) {
                require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
                unchecked {
                    _approve(from, msg.sender, currentAllowance - amount);
                }
            }
        }
        _burn(from, amount);
    }
} 