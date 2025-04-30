# Contract Utilities

This directory contains a collection of utility functions for interacting with the SimpleSwap and SimpleFarm smart contracts.

## Structure

The utilities are organized into the following modules:

- `index.ts` - Main entry point that exports all functions
- `addresses.ts` - Contract and token addresses
- `abis.ts` - Contract ABIs (Application Binary Interfaces)
- `types.ts` - TypeScript type definitions
- `helpers.ts` - Core utility functions for blockchain interactions
- `erc20.ts` - ERC20 token interaction utilities
- `tokenUtils.ts` - Token value formatting and display utilities
- `router.ts` - SimpleSwapRouter interaction utilities
- `liquidity.ts` - Liquidity provision interaction utilities
- `farm.ts` - SimpleFarm interaction utilities

## Core Functionality

### Wallet Connection

The utilities handle wallet connection through MetaMask or other Web3 providers:

```typescript
// Connect wallet
const address = await ensureWalletConnection();

// Get signer for transactions
const signer = getSigner();

// Get provider for read-only operations
const provider = getProvider();
```

### Token Operations

Functions for interacting with ERC20 tokens:

```typescript
// Get token information
const tokenInfo = await getTokenInfo(tokenAddress);

// Get token balance
const balance = await getTokenBalance(tokenAddress, accountAddress);

// Approve token spending
await approveToken(tokenAddress, amount, spenderAddress);
```

### Token Formatting

Functions for formatting token values for display:

```typescript
// Format token balance for display
const displayBalance = formatTokenBalance(balance, decimals);

// Format input amount for better UX
const formattedInput = formatInputAmount(userInput);

// Parse string amount to BigNumber
const amountWei = parseTokenAmount(amount, decimals);

// Format price for display
const displayPrice = formatPrice(price);

// Format percentage for display
const displayPercent = formatPercent(value);

// Truncate address for display
const shortAddress = truncateAddress(address);
```

### Swap Operations

Functions for token swapping:

```typescript
// Get pair reserves
const [reserveA, reserveB] = await getPairReserves(tokenAAddress, tokenBAddress);

// Get swap quote
const amountOut = await getSwapQuote(fromTokenAddress, toTokenAddress, amountIn);

// Execute swap
await executeSwap(fromTokenAddress, toTokenAddress, amountIn, amountOutMin, slippageTolerance);
```

### Liquidity Operations

Functions for providing and managing liquidity:

```typescript
// Calculate LP token amount
const lpAmount = await calculateLPTokenAmount(tokenAAddress, tokenBAddress, amountA, amountB);

// Add liquidity
await addLiquidity(tokenAAddress, tokenBAddress, amountA, amountB, slippageTolerance);

// Remove liquidity
await removeLiquidity(tokenAAddress, tokenBAddress, liquidity, slippageTolerance);

// Get liquidity positions
const positions = await getUserLiquidityPositions(userAddress, tokenPairs);
```

### Farming Operations

Functions for interacting with the farm:

```typescript
// Get pool information
const poolInfo = await getPoolInfo(pid);

// Deposit to farm
await depositToFarm(pid, amount);

// Withdraw from farm
await withdrawFromFarm(pid, amount);

// Harvest rewards
await harvestRewards(pid);
```

## Error Handling

All functions include robust error handling and logging. The `logger` utility provides standardized console output:

```typescript
logger.log("Info message");
logger.error("Error message", error);
logger.warn("Warning message");
logger.debug("Debug message"); // Only in development mode
```

## Diagram

See the `flow-diagram.md` file for a visual representation of the module relationships and user flows.

## Best Practices

1. Always ensure wallet is connected before attempting transactions
2. Check token allowances before transactions that require approval
3. Use slippage tolerance to protect users from price changes
4. Handle errors gracefully and provide meaningful feedback to users
5. Cache token information to reduce RPC calls
6. Use batch processing for high-volume operations 


这是一个关于智能合约工具库（Contract Utilities）的文档，主要用于与 **SimpleSwap** 和 **SimpleFarm** 智能合约进行交互。它提供了多种实用功能，方便开发者与区块链进行操作。下面是文档的中文解释：

---

### 合约工具库

该目录包含一组用于与 **SimpleSwap** 和 **SimpleFarm** 智能合约交互的工具函数。

#### 目录结构

这些工具函数被组织成以下几个模块：

- `index.ts` - 主入口，导出所有函数
- `addresses.ts` - 合约和代币地址
- `abis.ts` - 合约的 ABI（应用二进制接口）
- `types.ts` - TypeScript 类型定义
- `helpers.ts` - 区块链交互的核心工具函数
- `erc20.ts` - ERC20 代币交互工具
- `tokenUtils.ts` - 代币值格式化和显示工具
- `router.ts` - SimpleSwapRouter 交互工具
- `liquidity.ts` - 流动性提供交互工具
- `farm.ts` - SimpleFarm 交互工具

#### 核心功能

##### 钱包连接

工具库支持通过 **MetaMask** 或其他 Web3 提供者连接钱包：

```typescript
// 连接钱包
const address = await ensureWalletConnection();

// 获取用于交易的签名者
const signer = getSigner();

// 获取用于只读操作的提供者
const provider = getProvider();
```

##### 代币操作

与 ERC20 代币交互的函数：

```typescript
// 获取代币信息
const tokenInfo = await getTokenInfo(tokenAddress);

// 获取代币余额
const balance = await getTokenBalance(tokenAddress, accountAddress);

// 批准代币支出
await approveToken(tokenAddress, amount, spenderAddress);
```

##### 代币格式化

用于格式化代币值以便展示的函数：

```typescript
// 格式化代币余额
const displayBalance = formatTokenBalance(balance, decimals);

// 格式化用户输入的金额
const formattedInput = formatInputAmount(userInput);

// 将字符串金额转换为 BigNumber
const amountWei = parseTokenAmount(amount, decimals);

// 格式化价格
const displayPrice = formatPrice(price);

// 格式化百分比
const displayPercent = formatPercent(value);

// 截短地址以便展示
const shortAddress = truncateAddress(address);
```

##### 兑换操作

用于代币兑换的函数：

```typescript
// 获取兑换对的储备量
const [reserveA, reserveB] = await getPairReserves(tokenAAddress, tokenBAddress);

// 获取兑换报价
const amountOut = await getSwapQuote(fromTokenAddress, toTokenAddress, amountIn);

// 执行兑换
await executeSwap(fromTokenAddress, toTokenAddress, amountIn, amountOutMin, slippageTolerance);
```

##### 流动性操作

用于提供和管理流动性的函数：

```typescript
// 计算 LP 代币数量
const lpAmount = await calculateLPTokenAmount(tokenAAddress, tokenBAddress, amountA, amountB);

// 添加流动性
await addLiquidity(tokenAAddress, tokenBAddress, amountA, amountB, slippageTolerance);

// 移除流动性
await removeLiquidity(tokenAAddress, tokenBAddress, liquidity, slippageTolerance);

// 获取用户的流动性位置
const positions = await getUserLiquidityPositions(userAddress, tokenPairs);
```

##### 农场操作

用于与 **SimpleFarm** 交互的函数：

```typescript
// 获取池子信息
const poolInfo = await getPoolInfo(pid);

// 存入农场
await depositToFarm(pid, amount);

// 从农场提取
await withdrawFromFarm(pid, amount);

// 收获奖励
await harvestRewards(pid);
```

#### 错误处理

所有函数都包含了健壮的错误处理和日志记录。`logger` 工具提供了标准化的控制台输出：

```typescript
logger.log("信息消息");
logger.error("错误消息", error);
logger.warn("警告消息");
logger.debug("调试消息"); // 仅在开发模式下显示
```

#### 流程图

查看 `flow-diagram.md` 文件以获取模块关系和用户流程的可视化图示。

#### 最佳实践

1. 在进行交易操作之前，始终确保钱包已连接
2. 在进行需要授权的交易前，检查代币的授权额度
3. 使用滑点容忍度来防止用户因价格波动遭受损失
4. 优雅地处理错误，并向用户提供有意义的反馈
5. 缓存代币信息以减少 RPC 调用
6. 对于高频操作，使用批量处理

