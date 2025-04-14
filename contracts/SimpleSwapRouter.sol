// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC20.sol";

/**
 * @title SimpleSwapRouter
 * @dev A simple DEX router for swapping tokens and managing liquidity pools
 */
contract SimpleSwapRouter is Ownable {
    using SafeERC20 for IERC20;

    // Events
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event Swap(address indexed pair, uint256 amountIn, uint256 amountOut, uint256 reserve0, uint256 reserve1, address to);
    event Mint(address indexed pair, uint256 amount0, uint256 amount1);
    event Burn(address indexed pair, uint256 amount0, uint256 amount1, address to);

    // Fee parameters
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public swapFee = 3; // 0.3% fee by default
    uint256 public protocolFeeCut = 167; // 1/6 of fees (0.05%) goes to protocol 

    // Protocol fee collector address
    address public feeCollector;

    // AIH token address
    address public immutable aihToken;

    // Factory storage variables
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    // Pair storage
    struct Pair {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalSupply;
        uint256 kLast; // reserve0 * reserve1, for calculating protocol fees
        mapping(address => uint256) balances; // LP token balances
    }

    // Pair data storage
    mapping(address => Pair) public pairs;

    /**
     * @dev Constructor sets the fee collector address and AIH token
     */
    constructor(address _aihToken) Ownable(msg.sender) {
        require(_aihToken != address(0), "AIH token cannot be zero address");
        aihToken = _aihToken;
        feeCollector = msg.sender;
    }

    /**
     * @dev Set the fee collector address
     * @param _feeCollector The new fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        feeCollector = _feeCollector;
    }

    /**
     * @dev Set the swap fee (max 1%)
     * @param _swapFee The new swap fee (out of 1000)
     */
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= 10, "Fee too high");
        swapFee = _swapFee;
    }

    /**
     * @dev Set the protocol fee cut percentage (max 100%)
     * @param _protocolFeeCut The new protocol fee cut (out of 1000)
     */
    function setProtocolFeeCut(uint256 _protocolFeeCut) external onlyOwner {
        require(_protocolFeeCut <= 1000, "Cut too high");
        protocolFeeCut = _protocolFeeCut;
    }

    /**
     * @dev Create a new liquidity pair
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @return pair The address of the pair (computed deterministically)
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(tokenA != address(0) && tokenB != address(0), "ZERO_ADDRESS");
        require(getPair[tokenA][tokenB] == address(0), "PAIR_EXISTS");

        // Sort tokens
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        // Create pair address deterministically
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff",
            address(this),
            keccak256(abi.encodePacked(token0, token1)),
            hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
        )))));

        // Initialize pair data
        Pair storage pairData = pairs[pair];
        pairData.token0 = token0;
        pairData.token1 = token1;
        pairData.totalSupply = 0;

        // Register the pair
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
        return pair;
    }

    /**
     * @dev Get the number of pairs created
     */
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    /**
     * @dev Get pair address from token addresses
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @return The pair address
     */
    function getPairAddress(address tokenA, address tokenB) public view returns (address) {
        return getPair[tokenA][tokenB];
    }

    /**
     * @dev Add liquidity to a pair
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @param amountADesired The desired amount of first token
     * @param amountBDesired The desired amount of second token
     * @param amountAMin The minimum amount of first token
     * @param amountBMin The minimum amount of second token
     * @param to The recipient of LP tokens
     * @return amountA The amount of tokenA added
     * @return amountB The amount of tokenB added
     * @return liquidity The amount of LP tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pair = getPair[tokenA][tokenB];
        if (pair == address(0)) {
            pair = createPair(tokenA, tokenB);
        }

        Pair storage pairData = pairs[pair];
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        
        if (reserveA == 0 && reserveB == 0) {
            // First time adding liquidity
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            // Calculate optimal amounts
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                require(amountAOptimal <= amountADesired, "EXCESSIVE_INPUT_AMOUNT");
                require(amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }

        // Transfer tokens to the contract
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // Update reserves
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, true);

        // Mint LP tokens
        liquidity = _mintLPTokens(pair, to);
        
        emit Mint(pair, amountA, amountB);
        return (amountA, amountB, liquidity);
    }

    /**
     * @dev Remove liquidity from a pair
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @param liquidity The amount of LP tokens to burn
     * @param amountAMin The minimum amount of first token
     * @param amountBMin The minimum amount of second token
     * @param to The recipient of the tokens
     * @return amountA The amount of tokenA received
     * @return amountB The amount of tokenB received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external returns (uint256 amountA, uint256 amountB) {
        address pair = getPair[tokenA][tokenB];
        require(pair != address(0), "PAIR_DOES_NOT_EXIST");
        
        Pair storage pairData = pairs[pair];
        require(pairData.balances[msg.sender] >= liquidity, "INSUFFICIENT_LIQUIDITY");

        // Get current reserves
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        
        // Calculate token amounts to return
        amountA = (liquidity * reserveA) / pairData.totalSupply;
        amountB = (liquidity * reserveB) / pairData.totalSupply;
        
        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        // Burn LP tokens
        _burnLPTokens(pair, msg.sender, liquidity);
        
        // Update reserves
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, false);
        
        // Transfer tokens to recipient
        IERC20(tokenA).safeTransfer(to, amountA);
        IERC20(tokenB).safeTransfer(to, amountB);
        
        emit Burn(pair, amountA, amountB, to);
        return (amountA, amountB);
    }

    /**
     * @dev Swap tokens
     * @param amountIn The amount of input tokens
     * @param amountOutMin The minimum amount of output tokens
     * @param path The token path (e.g., [tokenA, tokenB])
     * @param to The recipient of the output tokens
     * @return amounts The amounts of tokens swapped
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "INVALID_PATH");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // Transfer initial tokens to the contract
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Perform swaps along the path
        for (uint i = 0; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                getPair[path[i]][path[i+1]], 
                path[i], 
                path[i+1]
            );
            
            amounts[i+1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
            
            // Update reserves and collect fees
            _swap(
                getPair[path[i]][path[i+1]],
                path[i],
                path[i+1],
                amounts[i],
                i == path.length - 2 ? to : address(this)
            );
        }
        
        require(amounts[path.length-1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        return amounts;
    }

    /**
     * @dev Get the reserves of a pair
     * @param pair The pair address
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @return reserveA The reserve of tokenA
     * @return reserveB The reserve of tokenB
     */
    function getReserves(address pair, address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        Pair storage pairData = pairs[pair];
        (address token0, address token1) = (pairData.token0, pairData.token1);
        (uint256 reserve0, uint256 reserve1) = (pairData.reserve0, pairData.reserve1);
        
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /**
     * @dev Calculate the expected output amount for a swap
     * @param amountIn The input amount
     * @param reserveIn The input reserve
     * @param reserveOut The output reserve
     * @return amountOut The expected output amount
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public view returns (uint256 amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @dev Calculate the required input amount for a desired output
     * @param amountOut The desired output amount
     * @param reserveIn The input reserve
     * @param reserveOut The output reserve
     * @return amountIn The required input amount
     */
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) public view returns (uint256 amountIn) {
        require(amountOut > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        uint256 numerator = reserveIn * amountOut * FEE_DENOMINATOR;
        uint256 denominator = (reserveOut - amountOut) * (FEE_DENOMINATOR - swapFee);
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @dev Calculate the quote for the second token amount
     * @param amountA The amount of the first token
     * @param reserveA The reserve of the first token
     * @param reserveB The reserve of the second token
     * @return amountB The expected amount of the second token
     */
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    /**
     * @dev Internal function to handle token swaps
     */
    function _swap(
        address pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) internal {
        Pair storage pairData = pairs[pair];
        
        (uint256 reserve0, uint256 reserve1) = (pairData.reserve0, pairData.reserve1);
        (address token0, address token1) = (pairData.token0, pairData.token1);
        
        bool isToken0 = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
        
        // Calculate output amount with fee
        uint256 amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        
        // Calculate and collect protocol fee
        uint256 protocolFee = (amountIn * swapFee * protocolFeeCut) / (FEE_DENOMINATOR * FEE_DENOMINATOR);
        if (protocolFee > 0) {
            IERC20(tokenIn).safeTransfer(feeCollector, protocolFee);
            amountIn -= protocolFee;
        }
        
        // Update reserves
        if (isToken0) {
            pairData.reserve0 += amountIn;
            pairData.reserve1 -= amountOut;
        } else {
            pairData.reserve0 -= amountOut;
            pairData.reserve1 += amountIn;
        }
        
        // Transfer output tokens to recipient
        IERC20(tokenOut).safeTransfer(to, amountOut);
        
        emit Swap(pair, amountIn, amountOut, pairData.reserve0, pairData.reserve1, to);
    }

    /**
     * @dev Internal function to calculate output amount with fee
     */
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal view returns (uint256) {
        return getAmountOut(amountIn, reserveIn, reserveOut);
    }

    /**
     * @dev Internal function to update reserves
     */
    function _updateReserves(
        address pair,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        bool isAddition
    ) internal {
        Pair storage pairData = pairs[pair];
        
        if (isAddition) {
            if (tokenA == pairData.token0) {
                pairData.reserve0 += amountA;
                pairData.reserve1 += amountB;
            } else {
                pairData.reserve0 += amountB;
                pairData.reserve1 += amountA;
            }
        } else {
            if (tokenA == pairData.token0) {
                pairData.reserve0 -= amountA;
                pairData.reserve1 -= amountB;
            } else {
                pairData.reserve0 -= amountB;
                pairData.reserve1 -= amountA;
            }
        }
        
        // Update kLast for protocol fee calculation
        pairData.kLast = pairData.reserve0 * pairData.reserve1;
    }

    /**
     * @dev Internal function to mint LP tokens
     */
    function _mintLPTokens(address pair, address to) internal returns (uint256 liquidity) {
        Pair storage pairData = pairs[pair];
        
        uint256 _totalSupply = pairData.totalSupply;
        
        if (_totalSupply == 0) {
            // Initial liquidity provision
            liquidity = sqrt(pairData.reserve0 * pairData.reserve1) - 1000; // Minimum liquidity
            pairData.balances[address(0)] = 1000; // Lock minimum liquidity forever
        } else {
            // Subsequent liquidity additions
            liquidity = min(
                (pairData.reserve0 * _totalSupply) / (pairData.reserve0 - pairData.reserve0),
                (pairData.reserve1 * _totalSupply) / (pairData.reserve1 - pairData.reserve1)
            );
        }
        
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        
        // Mint LP tokens to the recipient
        pairData.balances[to] += liquidity;
        pairData.totalSupply += liquidity;
        
        return liquidity;
    }

    /**
     * @dev Internal function to burn LP tokens
     */
    function _burnLPTokens(address pair, address from, uint256 liquidity) internal {
        Pair storage pairData = pairs[pair];
        
        // Burn LP tokens
        pairData.balances[from] -= liquidity;
        pairData.totalSupply -= liquidity;
    }

    /**
     * @dev Get balance of LP tokens
     * @param pair The pair address
     * @param account The account address
     * @return The LP token balance
     */
    function balanceOf(address pair, address account) external view returns (uint256) {
        return pairs[pair].balances[account];
    }

    /**
     * @dev Get total supply of LP tokens for a pair
     * @param pair The pair address
     * @return The total supply
     */
    function totalSupply(address pair) external view returns (uint256) {
        return pairs[pair].totalSupply;
    }

    /**
     * @dev Square root function
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @dev Minimum function
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
} 