// Token price simulation utility

// Define price ranges for tokens
export const priceRanges = {
  TD: [9.5, 10.5],
  FHBI: [45, 55],
  FHBI2: [22, 28],
  FHBI3: [8, 12],
  RTK: [1.5, 2.5],
  AIH: [0.008, 0.012],
};

// Export token symbol type
export type TokenSymbol = keyof typeof priceRanges;

// Check if a string is a valid token symbol
export function isValidTokenSymbol(symbol: string): symbol is TokenSymbol {
  return Object.keys(priceRanges).includes(symbol);
}

// Store current simulated prices
interface PriceState {
  prices: Record<TokenSymbol, number>;
  lastUpdated: number;
}

// Initialize with middle of ranges
const initialPrices: Record<TokenSymbol, number> = Object.entries(priceRanges).reduce(
  (acc, [token, [min, max]]) => {
    acc[token as TokenSymbol] = min + (max - min) / 2;
    return acc;
  },
  {} as Record<TokenSymbol, number>
);

// Global state for prices
export const priceState: PriceState = {
  prices: { ...initialPrices },
  lastUpdated: Date.now(),
};

// Track active simulation interval
let activeSimulationInterval: NodeJS.Timeout | null = null;

/**
 * Generate a random price within the defined range for a token
 */
export const generateRandomPrice = (token: TokenSymbol): number => {
  const [min, max] = priceRanges[token];
  return min + Math.random() * (max - min);
};

/**
 * Update prices for all tokens with random fluctuation
 */
export const updateAllPrices = (): void => {
  Object.keys(priceRanges).forEach((token) => {
    const tokenSymbol = token as TokenSymbol;
    // Generate new price but limit change to prevent dramatic swings
    const currentPrice = priceState.prices[tokenSymbol];
    const randomPrice = generateRandomPrice(tokenSymbol);
    
    // Limit change to max 2% of current price for smooth transitions
    const maxChange = currentPrice * 0.02;
    const difference = randomPrice - currentPrice;
    const limitedDifference = Math.max(Math.min(difference, maxChange), -maxChange);
    
    priceState.prices[tokenSymbol] = currentPrice + limitedDifference;
  });
  
  priceState.lastUpdated = Date.now();
  console.log('Price update completed, timestamp:', priceState.lastUpdated);
};

/**
 * Get the current price for a specific token
 * If the token is not a valid symbol, returns undefined
 */
export const getTokenPrice = (token: string): number | undefined => {
  if (isValidTokenSymbol(token)) {
    return priceState.prices[token];
  }
  return undefined;
};

/**
 * Get all current token prices
 */
export const getAllTokenPrices = (): Record<TokenSymbol, number> => {
  return { ...priceState.prices };
};

/**
 * Calculate LP token price based on its component tokens
 */
export const calculateLpTokenPrice = (
  tokenA: string, 
  tokenB: string,
  reserveA: number = 1000, // Default reserves
  reserveB: number = 1000
): number => {
  const priceA = isValidTokenSymbol(tokenA) ? priceState.prices[tokenA] : 1;
  const priceB = isValidTokenSymbol(tokenB) ? priceState.prices[tokenB] : 1;
  
  // LP token price formula: 2 * sqrt(reserveA * reserveB * priceA * priceB) / totalSupply
  // Since we don't have actual reserves and supply, we use a simplified model
  const lpValue = 2 * Math.sqrt(reserveA * reserveB * priceA * priceB);
  const estimatedTotalSupply = Math.sqrt(reserveA * reserveB) * 2; // Simplified LP supply estimate
  
  return lpValue / estimatedTotalSupply;
};

/**
 * Setup interval to update prices periodically (every 6 seconds)
 */
export const startPriceSimulation = (): NodeJS.Timeout => {
  // Clear any existing interval to prevent duplicates
  if (activeSimulationInterval) {
    clearInterval(activeSimulationInterval);
    console.log('Cleared existing price simulation interval');
  }
  
  // Update immediately once
  updateAllPrices();
  console.log('Starting new price simulation interval (6s)');
  
  // Then set interval for regular updates
  activeSimulationInterval = setInterval(() => {
    console.log('Interval triggered, updating prices...');
    updateAllPrices();
    // Broadcast price update event
    const event = new CustomEvent('priceUpdate', { 
      detail: { prices: getAllTokenPrices() } 
    });
    window.dispatchEvent(event);
  }, 6000); // Update every 6 seconds
  
  return activeSimulationInterval;
};

/**
 * Stop price simulation
 */
export const stopPriceSimulation = (intervalId: NodeJS.Timeout): void => {
  clearInterval(intervalId);
  if (activeSimulationInterval === intervalId) {
    activeSimulationInterval = null;
  }
  console.log('Price simulation stopped');
}; 