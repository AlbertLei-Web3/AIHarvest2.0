import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { fetchUserLiquidityPositions } from '@/utils/liquidityUtils';
import { LiquidityEvent, subscribeToLiquidityEvents, startEventListening } from '@/utils/blockchainEvents';

// LP Token interface
export interface LPToken {
  id: string; // Unique identifier (typically pair address)
  token0: {
    address: string;
    symbol: string;
    name: string;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
  };
  balance: string;
  poolShare: string;
  apr: string;
  valueUSD: string;
  createdAt: number;
  // Additional properties needed for farm integration
  pairAddress?: string;
  lpTokenAddress?: string;
}

// Context interface
interface LiquidityContextType {
  lpTokens: LPToken[];
  isLoading: boolean;
  error: Error | null;
  refreshLiquidity: () => Promise<void>;
  refreshLpTokens: () => Promise<void>; // Alias for refreshLiquidity
  lastUpdated: number; // Timestamp of last update
  addLiquidityPosition: (newPosition: LPToken) => void;
  removeLiquidityPosition: (id: string) => void;
  getLPTokenById: (id: string) => LPToken | undefined;
}

// Create context with default values
const LiquidityContext = createContext<LiquidityContextType>({
  lpTokens: [],
  isLoading: false,
  error: null,
  refreshLiquidity: async () => {},
  refreshLpTokens: async () => {}, // Added alias
  lastUpdated: Date.now(), // Initialize with current timestamp
  addLiquidityPosition: () => {},
  removeLiquidityPosition: () => {},
  getLPTokenById: () => undefined,
});

// Provider component
export const LiquidityProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lpTokens, setLpTokens] = useState<LPToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const { address } = useAccount();

  // Function to fetch user's liquidity positions
  const refreshLiquidity = async () => {
    if (!address) {
      setLpTokens([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const positions = await fetchUserLiquidityPositions(address);
      setLpTokens(positions);
      setLastUpdated(Date.now()); // Update the timestamp
    } catch (err) {
      console.error('Error fetching liquidity positions:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch liquidity positions'));
    } finally {
      setIsLoading(false);
    }
  };

  // Alias for refreshLiquidity to maintain compatibility
  const refreshLpTokens = refreshLiquidity;

  // Handle blockchain events
  const handleLiquidityEvent = (event: LiquidityEvent) => {
    if (!address) return;
    
    // Only process events for the current user
    if (event.userAddress.toLowerCase() !== address.toLowerCase()) return;
    
    // Refresh liquidity positions when this user adds/removes liquidity
    refreshLiquidity();
  };

  // Initialize: fetch liquidity positions and set up event listeners
  useEffect(() => {
    if (address) {
      refreshLiquidity();
      
      // Start blockchain event listening
      startEventListening().catch(err => 
        console.error('Failed to start event listening:', err)
      );
      
      // Subscribe to liquidity events
      const unsubscribe = subscribeToLiquidityEvents(handleLiquidityEvent);
      
      // Cleanup
      return () => {
        unsubscribe();
      };
    }
  }, [address]);

  // Add a new liquidity position
  const addLiquidityPosition = (newPosition: LPToken) => {
    setLpTokens(prevTokens => {
      // Check if position already exists
      const existingIndex = prevTokens.findIndex(token => token.id === newPosition.id);
      
      if (existingIndex >= 0) {
        // Update existing position
        const updatedTokens = [...prevTokens];
        updatedTokens[existingIndex] = newPosition;
        return updatedTokens;
      } else {
        // Add new position
        return [...prevTokens, newPosition];
      }
    });
  };

  // Remove a liquidity position
  const removeLiquidityPosition = (id: string) => {
    setLpTokens(prevTokens => prevTokens.filter(token => token.id !== id));
  };

  // Get LP token by ID
  const getLPTokenById = (id: string): LPToken | undefined => {
    return lpTokens.find(token => token.id === id);
  };

  return (
    <LiquidityContext.Provider
      value={{
        lpTokens,
        isLoading,
        error,
        refreshLiquidity,
        refreshLpTokens, // Add the alias
        lastUpdated, // Add the timestamp
        addLiquidityPosition,
        removeLiquidityPosition,
        getLPTokenById,
      }}
    >
      {children}
    </LiquidityContext.Provider>
  );
};

// Custom hook for using the context
export const useLiquidity = () => useContext(LiquidityContext);

export default LiquidityContext; 