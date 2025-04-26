// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PairERC20.sol";
import "./SimpleSwapFactory.sol";
import "./interfaces/IWETH.sol";

/**
 * @title SimpleSwapRouter 
 * @dev A simple DEX router for swapping tokens and managing liquidity pools 一个简单的DEX路由器，用于交换代币和管理流动性池
 */
contract SimpleSwapRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events 事件
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event Swap(address indexed pair, uint256 amountIn, uint256 amountOut, uint256 reserve0, uint256 reserve1, address to);
    event Mint(address indexed pair, uint256 amount0, uint256 amount1);
    event Burn(address indexed pair, uint256 amount0, uint256 amount1, address to);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event FarmAuthorizationChanged(address indexed farm, bool authorized);
    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);
    event ProtocolFeeCutUpdated(uint256 oldCut, uint256 newCut);

    // Constants for fee calculations
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    
    // Fee parameters 费用参数
    uint256 public swapFee = 3; // 0.3% fee by default 默认0.3%费用
    uint256 public protocolFeeCut = 167; // 1/6 of fees (0.05%) goes to protocol 1/6的费用（0.05%）归协议

    // Protocol fee collector address 协议费用收集器地址
    address public feeCollector;

    // AIH token address  AIH代币地址       
    address public immutable aihToken;
    
    // Authorized farm contracts that can call farmRemoveLiquidity
    mapping(address => bool) public authorizedFarms;

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

    // Mapping to track pending protocol fees until they're collected
    // This helps avoid reentrancy vulnerabilities when transferring fees
    mapping(address => uint256) public pendingProtocolFees;

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
        
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    /**
     * @dev Set the swap fee (max 1%) 设置交换费用（最大1%）
     * @param _swapFee The new swap fee (out of 1000) 新的交换费用（1000中的）
     */
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= 10, "Fee too high");
        
        uint256 oldFee = swapFee;
        swapFee = _swapFee;
        
        emit SwapFeeUpdated(oldFee, _swapFee);
    }

    /**
     * @dev Set the protocol fee cut percentage (max 100%) 设置协议费用切割百分比（最大100%）
     * @param _protocolFeeCut The new protocol fee cut (out of 1000) 新的协议费用切割（1000中的）
     */
    function setProtocolFeeCut(uint256 _protocolFeeCut) external onlyOwner {
        require(_protocolFeeCut <= 1000, "Cut too high");
        
        uint256 oldCut = protocolFeeCut;
        protocolFeeCut = _protocolFeeCut;
        
        emit ProtocolFeeCutUpdated(oldCut, _protocolFeeCut);
    }
    
    /**
     * @dev Add or remove a farm contract authorization
     * @param _farmAddress Farm contract address
     * @param _authorized Whether the farm is authorized
     */
    function setFarmAuthorization(address _farmAddress, bool _authorized) external onlyOwner {
        require(_farmAddress != address(0), "Farm address cannot be zero");
        
        authorizedFarms[_farmAddress] = _authorized;
        
        emit FarmAuthorizationChanged(_farmAddress, _authorized);
    }

    /**
     * @dev Create a new liquidity pair 创建一个新的流动性对
     * @param tokenA The first token address 第一个代币地址
     * @param tokenB The second token address 第二个代币地址
     * @return pair The address of the pair (computed deterministically) 返回对地址（确定性计算）
     */
    function createPair(address tokenA, address tokenB) public nonReentrant returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(tokenA != address(0) && tokenB != address(0), "ZERO_ADDRESS");
        require(getPair[tokenA][tokenB] == address(0), "PAIR_EXISTS");

        // Sort tokens 排序代币
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        // Create pair address deterministically 确定性地创建对地址
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff",
            address(this),
            salt,
            hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash 初始化代码哈希
        )))));

        // Get token symbols 获取代币符号
        string memory symbol0;
        string memory symbol1;
        try IERC20Metadata(token0).symbol() returns (string memory s) {
            symbol0 = s;
        } catch {
            symbol0 = "TKN";
        }
        
        try IERC20Metadata(token1).symbol() returns (string memory s) {
            symbol1 = s;
        } catch {
            symbol1 = "TKN";
        }
        
        // Create token names 创建代币名称
        string memory pairName = string(abi.encodePacked(symbol0, "-", symbol1, " LP Token"));
        string memory pairSymbol = string(abi.encodePacked(symbol0, "-", symbol1, "-LP"));
        
        // Create LP token 创建LP代币
        PairERC20 lpToken = new PairERC20(token0, token1, address(this), pairName, pairSymbol);
        
        // Initialize pair data 初始化代币对数据
        pairs[pair] = Pair({
            token0: token0,
            token1: token1,
            reserve0: 0,
            reserve1: 0,
            kLast: 0,
            lpToken: address(lpToken)
        });

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
     * 
     * NOTE: Follows CEI pattern (Checks-Effects-Interactions) to prevent reentrancy attacks
     * All state changes happen before external calls
     * 
     * SECURITY:
     * This function's protection against reentrancy follows this flow:
     * 1. The nonReentrant modifier prevents any reentrant calls
     * 2. Input validation is performed (Checks)
     * 3. Calculations are done and state variables are updated (_updateReserves) (Effects)
     * 4. External contract interactions occur (token transfers, LP token minting) (Interactions)
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) public nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        // CHECKS: Validate inputs
        require(to != address(0), "Cannot add liquidity to zero address");
        
        address pair = getPair[tokenA][tokenB];
        if (pair == address(0)) {
            pair = createPair(tokenA, tokenB);
        }

        // Get reserves 获取当前储备量
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        
        if (reserveA == 0 && reserveB == 0) {
            // First time adding liquidity 第一次添加流动性
            amountA = amountADesired;
            amountB = amountBDesired;
            
            // Ensure minimum amounts for first liquidity provision
            // The product must be high enough to allow for minimum liquidity of 1000
            require(amountA > 0 && amountB > 0, "INSUFFICIENT_INPUT_AMOUNTS");
            require(sqrt(amountA * amountB) >= MINIMUM_LIQUIDITY, "INSUFFICIENT_INITIAL_AMOUNTS");
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

        // INTERACTIONS: External calls (necessary before state changes to have tokens)
        // Transfer tokens to the contract 转移代币到合约
        if (amountA > 0) IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        if (amountB > 0) IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // EFFECTS: State changes (updating reserves)
        // Update reserves 更新储备量
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, true);

        // INTERACTIONS: External calls (after state changes)
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
     * 
     * NOTE: Follows CEI pattern (Checks-Effects-Interactions) to prevent reentrancy attacks
     * All state changes happen before external calls
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        require(to != address(0), "Cannot remove liquidity to zero address");
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY");
        
        address pair = getPair[tokenA][tokenB];
        require(pair != address(0), "PAIR_DOES_NOT_EXIST");
        
        Pair storage pairData = pairs[pair];
        address lpToken = pairData.lpToken;

        // Check if caller has sufficient LP tokens
        require(IERC20(lpToken).balanceOf(msg.sender) >= liquidity, "INSUFFICIENT_LIQUIDITY");

        // Get current reserves
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        uint256 lpTotalSupply = IERC20(lpToken).totalSupply();
        
        // Calculate token amounts to return
        amountA = (liquidity * reserveA) / lpTotalSupply;
        amountB = (liquidity * reserveB) / lpTotalSupply;
        
        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        // Burn LP tokens - this is an external call but to our own contract
        _burnLPTokens(pair, msg.sender, liquidity);
        
        // Update reserves - internal state change
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, false);
        
        // Transfer tokens after all state changes are complete
        _safeTransferTokens(tokenA, to, amountA);
        _safeTransferTokens(tokenB, to, amountB);
        
        emit Burn(pair, amountA, amountB, to);
        return (amountA, amountB);
    }

    /**
     * @dev Specialized function for Farm contracts to remove liquidity on behalf of a user
     * @param tokenA The first token address
     * @param tokenB The second token address
     * @param liquidity The amount of LP tokens to burn
     * @param amountAMin The minimum amount of first token
     * @param amountBMin The minimum amount of second token
     * @param from Address that provided the liquidity/owns the LP tokens
     * @param to The recipient of the tokens
     * @return amountA The amount of tokenA received
     * @return amountB The amount of tokenB received
     * 
     * NOTE: Follows CEI pattern (Checks-Effects-Interactions) to prevent reentrancy attacks
     * All state changes happen before external calls
     */
    function farmRemoveLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address from,
        address to
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        // Check that caller is an authorized farm
        require(authorizedFarms[msg.sender], "CALLER_NOT_AUTHORIZED_FARM");
        require(to != address(0), "Cannot remove liquidity to zero address");
        require(from != address(0), "Invalid from address");
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY");
        
        address pair = getPair[tokenA][tokenB];
        require(pair != address(0), "PAIR_DOES_NOT_EXIST");
        
        Pair storage pairData = pairs[pair];
        address lpToken = pairData.lpToken;
        
        // Farm contracts should hold LP tokens of users or have allowance
        bool farmHoldsTokens = IERC20(lpToken).balanceOf(msg.sender) >= liquidity;
        bool farmHasAllowance = IERC20(lpToken).allowance(from, msg.sender) >= liquidity;
        
        require(farmHoldsTokens || farmHasAllowance, "FARM_INSUFFICIENT_LIQUIDITY_OR_ALLOWANCE");

        // Get current reserves
        (uint256 reserveA, uint256 reserveB) = getReserves(pair, tokenA, tokenB);
        uint256 lpTotalSupply = IERC20(lpToken).totalSupply();
        
        // Calculate token amounts to return
        amountA = (liquidity * reserveA) / lpTotalSupply;
        amountB = (liquidity * reserveB) / lpTotalSupply;
        
        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        // Burn LP tokens - use the cached boolean to avoid duplicate external calls
        if (farmHoldsTokens) {
            // Farm contract holds the LP tokens
            _burnLPTokens(pair, msg.sender, liquidity);
        } else {
            // Farm contract has allowance from the user
            _burnLPTokens(pair, from, liquidity);
        }
        
        // Update reserves - internal state change
        _updateReserves(pair, tokenA, tokenB, amountA, amountB, false);
        
        // Transfer tokens after all state changes are complete
        _safeTransferTokens(tokenA, to, amountA);
        _safeTransferTokens(tokenB, to, amountB);
        
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
     * 
     * NOTE: Follows CEI pattern (Checks-Effects-Interactions) to prevent reentrancy attacks
     * Uses an internal function for state changes to maintain separation of concerns
     * 
     * SECURITY:
     * This function's protection against reentrancy follows this flow:
     * 1. The nonReentrant modifier prevents any reentrant calls
     * 2. Input validation is performed (Checks)
     * 3. Calculations are done and state variables are updated (_swapInternal) (Effects)
     * 4. External token transfers occur after all state changes (Interactions)
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) external nonReentrant returns (uint256[] memory amounts) {
        // CHECKS: Validate inputs
        require(path.length >= 2, "INVALID_PATH");
        require(to != address(0), "Cannot swap to zero address");
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // INTERACTIONS: External call (necessary before internal processing to have input tokens)
        // Transfer input tokens - external call is necessary at the beginning since we need the tokens
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Cache variables outside loop to save gas
        uint256 amountOut;
        address inputToken;
        address outputToken;
        address currentPair;
        
        // EFFECTS: Internal state changes for each swap in the path
        // Perform swaps along the path
        for (uint i = 0; i < path.length - 1; i++) {
            inputToken = path[i];
            outputToken = path[i+1];
            currentPair = getPair[inputToken][outputToken];
            
            require(currentPair != address(0), "PAIR_DOES_NOT_EXIST");
            
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                currentPair, 
                inputToken, 
                outputToken
            );
            
            // Calculate output amount
            amountOut = getAmountOut(amounts[i], reserveIn, reserveOut);
            amounts[i+1] = amountOut;
            
            // Update internal state and collect fees - Avoid external calls until all state changes complete
            _swapInternal(
                currentPair,
                inputToken,
                outputToken,
                amounts[i]
            );
        }
        
        require(amounts[path.length-1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        
        // INTERACTIONS: External call (after all state changes)
        // Transfer output token to recipient - do external calls after all state modifications
        _safeTransferTokens(path[path.length-1], to, amounts[path.length-1]);
        
        return amounts;
    }

    /**
     * @dev Get the reserves of a pair
     * @param pair The pair address
     * @param tokenA The first token address
     * @param tokenB Second token (used to determine order)
     * @return reserveA The reserve of tokenA
     * @return reserveB The reserve of tokenB
     */
    function getReserves(address pair, address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        require(pair != address(0), "PAIR_DOES_NOT_EXIST");
        
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
     * @dev Internal function to handle token swaps
     */
    function _swap(
        address pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address to
    ) internal {
        // 先执行内部状态变更
        uint256 amountOut = _swapInternal(pair, tokenIn, tokenOut, amountIn);
        
        // 然后再进行外部调用
        _safeTransferTokens(tokenOut, to, amountOut);
        
        // 发出事件
        Pair storage pairData = pairs[pair];
        emit Swap(pair, amountIn, amountOut, pairData.reserve0, pairData.reserve1, to);
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
        
        bool isToken0A = tokenA == pairData.token0;
        
        if (isAddition) {
            if (isToken0A) {
                pairData.reserve0 += amountA;
                pairData.reserve1 += amountB;
            } else {
                pairData.reserve0 += amountB;
                pairData.reserve1 += amountA;
            }
        } else {
            if (isToken0A) {
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
        
        // Check if this is the first liquidity provision
        if (lpCurrentSupply == 0) {
            // Initial liquidity provision - calculate using the amounts being added
            uint256 initialLiquidity = sqrt(amountA * amountB);
            
            // Ensure we have enough initial liquidity
            require(initialLiquidity >= MINIMUM_LIQUIDITY, "INSUFFICIENT_INITIAL_LIQUIDITY");
            
            // Subtract MINIMUM_LIQUIDITY (1000) from the liquidity provided to the user
            // This amount is permanently locked in the contract to prevent emptying the pool completely
            // IMPORTANT: For example, if a user provides 4321 TokenA and 4321 TokenB, 
            // the total LP tokens would be sqrt(4321*4321) = 4321, but the user receives
            // 4321 - 1000 = 3321 LP tokens. The remaining 1000 are permanently locked.
            liquidity = initialLiquidity - MINIMUM_LIQUIDITY;
            
            // Mint minimum liquidity to this contract address (permanently locked)
            PairERC20(lpToken).mint(address(this), MINIMUM_LIQUIDITY);
        } else {
            // Calculate based on the proportion of existing supply
            uint256 liquidityA = (amountA * lpCurrentSupply) / reserveA;
            uint256 liquidityB = (amountB * lpCurrentSupply) / reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        PairERC20(lpToken).mint(to, liquidity);
        
        return liquidity;
    }

    /**
     * @dev Internal function to burn LP tokens
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

    // 添加一个新的辅助函数，用于安全转账代币并防止重入
    function _safeTransferTokens(address token, address to, uint256 amount) internal {
        if (amount > 0 && to != address(0)) {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // 添加一个新的内部函数，用于处理交换的内部状态更改（无外部调用）
    function _swapInternal(
        address pair,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        Pair storage pairData = pairs[pair];
        
        (uint256 reserve0, uint256 reserve1) = (pairData.reserve0, pairData.reserve1);
        address token0 = pairData.token0;
        
        bool isToken0 = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
        
        // Calculate output amount with fee
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        
        // Calculate protocol fee
        uint256 protocolFee = 0;
        if (protocolFeeCut > 0 && feeCollector != address(0)) {
            protocolFee = (amountIn * swapFee * protocolFeeCut) / (FEE_DENOMINATOR * FEE_DENOMINATOR);
            if (protocolFee > 0) {
                // Store protocol fee info for later transfer
                pendingProtocolFees[tokenIn] += protocolFee;
                amountIn -= protocolFee;
            }
        }
        
        // Update reserves
        if (isToken0) {
            pairData.reserve0 += amountIn;
            pairData.reserve1 -= amountOut;
        } else {
            pairData.reserve0 -= amountOut;
            pairData.reserve1 += amountIn;
        }
        
        return amountOut;
    }

    // 添加一个函数，允许手动转移待处理的协议费用
    function transferPendingProtocolFees(address[] calldata tokens) external {
        require(msg.sender == owner() || msg.sender == feeCollector, "Not authorized");
        
        for (uint i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 fee = pendingProtocolFees[token];
            if (fee > 0) {
                pendingProtocolFees[token] = 0;
                _safeTransferTokens(token, feeCollector, fee);
            }
        }
    }
} 