// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PairERC20.sol";

/**
 * @title SimpleSwapRouter 
 * @dev A simple DEX router for swapping tokens and managing liquidity pools 一个简单的DEX路由器，用于交换代币和管理流动性池
 */
contract SimpleSwapRouter is Ownable {
    using SafeERC20 for IERC20;

    // Events 事件
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event Swap(address indexed pair, uint256 amountIn, uint256 amountOut, uint256 reserve0, uint256 reserve1, address to);
    event Mint(address indexed pair, uint256 amount0, uint256 amount1);
    event Burn(address indexed pair, uint256 amount0, uint256 amount1, address to);

    // Fee parameters 费用参数
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public swapFee = 3; // 0.3% fee by default 默认0.3%费用
    uint256 public protocolFeeCut = 167; // 1/6 of fees (0.05%) goes to protocol 1/6的费用（0.05%）归协议

    // Protocol fee collector address 协议费用收集器地址
    address public feeCollector;

    // AIH token address  AIH代币地址       
    address public immutable aihToken;

    // Factory storage variables 工厂存储变量
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    // Pair storage 代币对存储
    struct Pair {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 kLast; // reserve0 * reserve1, for calculating protocol fees 用于计算协议费用的reserve0 * reserve1
        address lpToken; // LP token address LP代币地址
    }

    // Pair data storage 代币对数据存储
    mapping(address => Pair) public pairs;

    /**
     * @dev Constructor sets the fee collector address and AIH token 构造函数设置费用收集器地址和AIH代币
     */
    constructor(address _aihToken) Ownable() {
        require(_aihToken != address(0), "AIH token cannot be zero address");
        aihToken = _aihToken;
        feeCollector = msg.sender;
        
        // Transfer ownership
        transferOwnership(msg.sender);
    }

    /**
     * @dev Set the fee collector address 设置费用收集器地址
     * @param _feeCollector The new fee collector address 新的费用收集器地址
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        feeCollector = _feeCollector;
    }

    /**
     * @dev Set the swap fee (max 1%) 设置交换费用（最大1%）
     * @param _swapFee The new swap fee (out of 1000) 新的交换费用（1000中的）
     */
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= 10, "Fee too high");
        swapFee = _swapFee;
    }

    /**
     * @dev Set the protocol fee cut percentage (max 100%) 设置协议费用切割百分比（最大100%）
     * @param _protocolFeeCut The new protocol fee cut (out of 1000) 新的协议费用切割（1000中的）
     */
    function setProtocolFeeCut(uint256 _protocolFeeCut) external onlyOwner {
        require(_protocolFeeCut <= 1000, "Cut too high");
        protocolFeeCut = _protocolFeeCut;
    }

    /**
     * @dev Create a new liquidity pair 创建一个新的流动性对
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB The second token address 第二个代币地址
     * @return pair The address of the pair (computed deterministically) 返回对地址（确定性计算）
     */
    function createPair(address tokenA, address tokenB) public returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(tokenA != address(0) && tokenB != address(0), "ZERO_ADDRESS");
        require(getPair[tokenA][tokenB] == address(0), "PAIR_EXISTS");

        // Sort tokens 排序代币
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        // Create pair address deterministically 确定性地创建对地址
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff",
            address(this),
            keccak256(abi.encodePacked(token0, token1)),
            hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash 初始化代码哈希
        )))));

        // Create token names 创建代币名称
        string memory symbol0 = IERC20Metadata(token0).symbol();
        string memory symbol1 = IERC20Metadata(token1).symbol();
        string memory pairName = string(abi.encodePacked(symbol0, "-", symbol1, " LP Token"));
        string memory pairSymbol = string(abi.encodePacked(symbol0, "-", symbol1, "-LP"));
        
        // Create LP token 创建LP代币
        PairERC20 lpToken = new PairERC20(token0, token1, address(this), pairName, pairSymbol);
        
        // Initialize pair data 初始化代币对数据
        Pair storage pairData = pairs[pair];
        pairData.token0 = token0;
        pairData.token1 = token1;
        pairData.lpToken = address(lpToken);

        // Register the pair 注册对
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
        return pair;
    }

    /**
     * @dev Get the number of pairs created 获取创建的对数量
     */
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    /**
     * @dev Get pair address from token addresses 从代币地址获取对地址
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB The second token address 第二个代币地址
     * @return The pair address 返回对地址
     */
    function getPairAddress(address tokenA, address tokenB) public view returns (address) {
        return getPair[tokenA][tokenB];
    }

    /**
     * @dev Get LP token address for a pair 获取对的LP代币地址
     * @param pair The pair address 对地址
     * @return The LP token address LP代币地址
     */
    function getLPToken(address pair) public view returns (address) {
        return pairs[pair].lpToken;
    }

    /**
     * @dev Add liquidity to a pair 添加流动性到对
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB The second token address 第二个代币地址
     * @param amountADesired The desired amount of first token 第一个代币的期望数量
     * @param amountBDesired The desired amount of second token 第二个代币的期望数量
     * @param amountAMin The minimum amount of first token 第一个代币的最小数量
     * @param amountBMin The minimum amount of second token 第二个代币的最小数量
     * @param to The recipient of LP tokens 接收LP代币的地址
     * @return amountA The amount of tokenA added 添加的第一个代币数量
     * @return amountB The amount of tokenB added 添加的第二个代币数量
     * @return liquidity The amount of LP tokens minted 铸造的LP代币数量
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

        // Use getReserves directly without creating unused pairData variable
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        
        if (reserveA == 0 && reserveB == 0) {
            // First time adding liquidity 第一次添加流动性
            amountA = amountADesired;
            amountB = amountBDesired;
            
            // Ensure minimum amounts for first liquidity provision
            // The product must be high enough to allow for minimum liquidity of 1000
            require(sqrt(amountA * amountB) >= 1000, "INSUFFICIENT_INITIAL_AMOUNTS");
        } else {
            // Calculate optimal amounts 计算最优数量
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

        // Transfer tokens to the contract 转移代币到合约
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // Update reserves 更新储备量
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, true);

        // Mint LP tokens 铸造LP代币
        liquidity = _mintLPTokens(pair, to, reserveA, reserveB, amountA, amountB);
        
        emit Mint(pair, amountA, amountB);
        return (amountA, amountB, liquidity);
    }

    /**
     * @dev Remove liquidity from a pair 从对中移除流动性
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB The second token address 第二个代币地址
     * @param liquidity The amount of LP tokens to burn 要销毁的LP代币数量
     * @param amountAMin The minimum amount of first token 第一个代币的最小数量
     * @param amountBMin The minimum amount of second token 第二个代币的最小数量
     * @param to The recipient of the tokens 接收代币的地址
     * @return amountA The amount of tokenA received 接收的第一个代币数量
     * @return amountB The amount of tokenB received 接收的第二个代币数量
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
        address lpToken = pairData.lpToken;

        // Check if caller has sufficient LP tokens or allowance
        if (msg.sender == to) {
            // Direct user call - user must have the LP tokens
            require(IERC20(lpToken).balanceOf(msg.sender) >= liquidity, "INSUFFICIENT_LIQUIDITY");
        } else {
            // Farm contract call - either Farm holds tokens or user approved Farm which approved router
            require(
                IERC20(lpToken).balanceOf(msg.sender) >= liquidity || 
                IERC20(lpToken).allowance(to, msg.sender) >= liquidity,
                "INSUFFICIENT_LIQUIDITY_OR_ALLOWANCE"
            );
        }

        // Get current reserves 获取当前储备量
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        uint256 lpTotalSupply = IERC20(lpToken).totalSupply();
        
        // Calculate token amounts to return 计算返回的代币数量
        amountA = (liquidity * reserveA) / lpTotalSupply;
        amountB = (liquidity * reserveB) / lpTotalSupply;
        
        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        // Burn LP tokens 销毁LP代币
        _burnLPTokens(pair, msg.sender, liquidity);
        
        // Update reserves 更新储备量
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, false);
        
        // Transfer tokens to recipient 转移代币到接收者
        IERC20(tokenA).safeTransfer(to, amountA);
        IERC20(tokenB).safeTransfer(to, amountB);
        
        emit Burn(pair, amountA, amountB, to);
        return (amountA, amountB);
    }

    /**
     * @dev Specialized function for Farm contracts to remove liquidity on behalf of a user
     * 专门为Farm合约设计的代表用户移除流动性的函数
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB The second token address 第二个代币地址
     * @param liquidity The amount of LP tokens to burn 要销毁的LP代币数量
     * @param amountAMin The minimum amount of first token 第一个代币的最小数量
     * @param amountBMin The minimum amount of second token 第二个代币的最小数量
     * @param from Address that provided the liquidity/owns the LP tokens 提供流动性/拥有LP代币的地址
     * @param to The recipient of the tokens 接收代币的地址
     * @return amountA The amount of tokenA received 接收的第一个代币数量
     * @return amountB The amount of tokenB received 接收的第二个代币数量
     */
    function farmRemoveLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address from,
        address to
    ) external returns (uint256 amountA, uint256 amountB) {
        address pair = getPair[tokenA][tokenB];
        require(pair != address(0), "PAIR_DOES_NOT_EXIST");
        
        Pair storage pairData = pairs[pair];
        address lpToken = pairData.lpToken;
        
        // Farm contracts should hold LP tokens of users or have allowance
        require(
            IERC20(lpToken).balanceOf(msg.sender) >= liquidity || 
            IERC20(lpToken).allowance(from, msg.sender) >= liquidity,
            "FARM_INSUFFICIENT_LIQUIDITY_OR_ALLOWANCE"
        );

        // Get current reserves 获取当前储备量
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        uint256 lpTotalSupply = IERC20(lpToken).totalSupply();
        
        // Calculate token amounts to return 计算返回的代币数量
        amountA = (liquidity * reserveA) / lpTotalSupply;
        amountB = (liquidity * reserveB) / lpTotalSupply;
        
        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        // Burn LP tokens 销毁LP代币
        if (IERC20(lpToken).balanceOf(msg.sender) >= liquidity) {
            // Farm contract holds the LP tokens
            _burnLPTokens(pair, msg.sender, liquidity);
        } else {
            // Farm contract has allowance from the user
            _burnLPTokens(pair, from, liquidity);
        }
        
        // Update reserves 更新储备量
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, false);
        
        // Transfer tokens to recipient 转移代币到接收者
        IERC20(tokenA).safeTransfer(to, amountA);
        IERC20(tokenB).safeTransfer(to, amountB);
        
        emit Burn(pair, amountA, amountB, to);
        return (amountA, amountB);
    }

    /**
     * @dev Swap tokens 交换代币
     * @param amountIn The amount of input tokens 输入代币的数量
     * @param amountOutMin The minimum amount of output tokens 最小输出代币数量
     * @param path The token path (e.g., [tokenA, tokenB]) 代币路径（例如：[tokenA, tokenB]）
     * @param to The recipient of the output tokens 输出代币的接收者
     * @return amounts The amounts of tokens swapped 交换的代币数量
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
        
        // Transfer initial tokens to the contract 转移初始代币到合约
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Perform swaps along the path
        for (uint i = 0; i < path.length - 1; i++) {
            address currentPair = getPair[path[i]][path[i+1]];
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                currentPair, 
                path[i], 
                path[i+1]
            );
            
            amounts[i+1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
            
            // Update reserves and collect fees 更新储备量并收集费用
            _swap(
                currentPair,
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
     * @dev Get the reserves of a pair 获取对的储备量
     * @param pair The pair address 对地址
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB Second token (used to determine order) 第二个代币（用于确定顺序）
     * @return reserveA The reserve of tokenA 第一个代币的储备量
     * @return reserveB The reserve of tokenB 第二个代币的储备量
     */
    function getReserves(address pair, address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        Pair storage pairData = pairs[pair];
        address token0 = pairData.token0;
        (uint256 reserve0, uint256 reserve1) = (pairData.reserve0, pairData.reserve1);
        
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /**
     * @dev Calculate the expected output amount for a swap 计算交换的预期输出数量
     * @param amountIn The input amount 输入数量
     * @param reserveIn The input reserve 输入储备量
     * @param reserveOut The output reserve 输出储备量
     * @return amountOut The expected output amount 预期输出数量
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
     * @dev Calculate the required input amount for a desired output 计算所需的输入数量以获得所需的输出数量
     * @param amountOut The desired output amount 所需的输出数量
     * @param reserveIn The input reserve 输入储备量
     * @param reserveOut The output reserve 输出储备量
     * @return amountIn The required input amount 所需的输入数量
     */
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) public view returns (uint256 amountIn) {
        require(amountOut > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        uint256 numerator = reserveIn * amountOut * FEE_DENOMINATOR;
        uint256 denominator = (reserveOut - amountOut) * (FEE_DENOMINATOR - swapFee);
        amountIn = (numerator / denominator) + 1;
    }

    /**
     * @dev Calculate the quote for the second token amount 计算第二个代币的报价
     * @param amountA The amount of the first token 第一个代币的数量
     * @param reserveA The reserve of the first token 第一个代币的储备量
     * @param reserveB The reserve of the second token 第二个代币的储备量
     * @return amountB The expected amount of the second token 预期的第二个代币数量
     */
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    /**
     * @dev Internal function to handle token swaps 内部函数处理代币交换
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
        address token0 = pairData.token0;
        
        bool isToken0 = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
        
        // Calculate output amount with fee 计算带费用的输出数量
        uint256 amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        
        // Calculate and collect protocol fee 计算并收集协议费用
        uint256 protocolFee = (amountIn * swapFee * protocolFeeCut) / (FEE_DENOMINATOR * FEE_DENOMINATOR);
        if (protocolFee > 0) {
            IERC20(tokenIn).safeTransfer(feeCollector, protocolFee);
            amountIn -= protocolFee;
        }
        
        // Update reserves 更新储备量
        if (isToken0) {
            pairData.reserve0 += amountIn;
            pairData.reserve1 -= amountOut;
        } else {
            pairData.reserve0 -= amountOut;
            pairData.reserve1 += amountIn;
        }
        
        // Transfer output tokens to recipient 转移输出代币到接收者
        IERC20(tokenOut).safeTransfer(to, amountOut);
        
        emit Swap(pair, amountIn, amountOut, pairData.reserve0, pairData.reserve1, to);
    }

    /**
     * @dev Internal function to calculate output amount with fee 内部函数计算带费用的输出数量
     */
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal view returns (uint256) {
        return getAmountOut(amountIn, reserveIn, reserveOut);
    }

    /**
     * @dev Internal function to update reserves 内部函数更新储备量
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
        
        // Update kLast for protocol fee calculation 更新kLast以计算协议费用
        pairData.kLast = pairData.reserve0 * pairData.reserve1;
    }

    /**
     * @dev Internal function to mint LP tokens 内部函数铸造LP代币
     */
    function _mintLPTokens(
        address pair, 
        address to, 
        uint256 reserveA, 
        uint256 reserveB, 
        uint256 amountA, 
        uint256 amountB
    ) internal returns (uint256 liquidity) {
        Pair storage pairData = pairs[pair];
        address lpToken = pairData.lpToken;
        
        uint256 lpCurrentSupply = IERC20(lpToken).totalSupply();
        
        // For debugging
        if (pairData.reserve0 == 0 || pairData.reserve1 == 0) {
            revert("ZERO_RESERVES");
        }
        
        if (lpCurrentSupply == 0) {
            // Initial liquidity provision 初始流动性提供
            uint256 initialLiquidity = sqrt(pairData.reserve0 * pairData.reserve1);
            
            // Ensure we have enough initial liquidity
            require(initialLiquidity >= 1000, "INSUFFICIENT_INITIAL_LIQUIDITY");
            
            liquidity = initialLiquidity - 1000; // Minimum liquidity 最小流动性
            
            // Mint minimum liquidity to this contract address instead of zero address
            // 将最小流动性铸造到合约地址而不是零地址
            PairERC20(lpToken).mint(address(this), 1000);
        } else {
            // Subsequent liquidity additions 后续流动性添加
            // Calculate liquidity based on the proportion of tokens added relative to current reserves
            liquidity = min(
                (amountA * lpCurrentSupply) / reserveA,
                (amountB * lpCurrentSupply) / reserveB
            );
        }
        
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        
        // Mint LP tokens to the recipient 铸造LP代币到接收者
        PairERC20(lpToken).mint(to, liquidity);
        
        return liquidity;
    }

    /**
     * @dev Internal function to burn LP tokens 内部函数销毁LP代币
     */
    function _burnLPTokens(address pair, address from, uint256 liquidity) internal {
        Pair storage pairData = pairs[pair];
        address lpToken = pairData.lpToken;
        
        // For direct user calls, we need to transfer tokens from the user first
        if (from == msg.sender) {
            // Transfer LP tokens from user to router for burning
            IERC20(lpToken).safeTransferFrom(from, address(this), liquidity);
            
            // Burn LP tokens from router's balance
            PairERC20(lpToken).burn(liquidity);
        } else {
            // For external contracts like Farm, we use burnFrom which checks allowance
            // This allows Farm contracts to hold LP tokens and approve the router to burn them
            PairERC20(lpToken).burnFrom(from, liquidity);
        }
    }

    /**
     * @dev Get balance of LP tokens 获取LP代币的余额
     * @param pair The pair address 对地址
     * @param account The account address 账户地址
     * @return The LP token balance LP代币余额
     */
    function balanceOf(address pair, address account) external view returns (uint256) {
        address lpToken = pairs[pair].lpToken;
        return IERC20(lpToken).balanceOf(account);
    }

    /**
     * @dev Get total supply of LP tokens for a pair 获取对的总供应量
     * @param pair The pair address 对地址
     * @return The total supply 总供应量
     */
    function totalSupply(address pair) external view returns (uint256) {
        address lpToken = pairs[pair].lpToken;
        return IERC20(lpToken).totalSupply();
    }

    /**
     * @dev Square root function 平方根函数
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
        } else {
            revert("SQRT_OF_ZERO");
        }
        return z;
    }

    /**
     * @dev Minimum function 最小函数
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
} 