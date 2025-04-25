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