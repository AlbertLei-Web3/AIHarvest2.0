import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { fetchUserLiquidityPositions } from '@/utils/liquidityUtils';
import { LiquidityEvent, subscribeToLiquidityEvents, startEventListening } from '@/utils/blockchainEvents';

// LP Token interface 流动性池代币接口
export interface LPToken {
  id: string; // Unique identifier (typically pair address) 唯一标识符（通常为配对地址）
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
  // Additional properties needed for farm integration 需要为农场集成添加的属性
  pairAddress?: string;
  lpTokenAddress?: string;
}

// Context interface 上下文接口
interface LiquidityContextType {
  lpTokens: LPToken[];
  isLoading: boolean;
  error: Error | null;
  refreshLiquidity: () => Promise<void>;
  refreshLpTokens: () => Promise<void>; // Alias for refreshLiquidity 别名用于刷新流动性
  lastUpdated: number; // Timestamp of last update 最后更新时间戳
  addLiquidityPosition: (newPosition: LPToken) => void;
  removeLiquidityPosition: (id: string) => void;
  getLPTokenById: (id: string) => LPToken | undefined;
}

// Create context with default values 使用默认值创建上下文
const LiquidityContext = createContext<LiquidityContextType>({
  lpTokens: [],
  isLoading: false,
  error: null,
  refreshLiquidity: async () => {},
  refreshLpTokens: async () => {}, // Added alias 添加别名
  lastUpdated: Date.now(), // Initialize with current timestamp 使用当前时间戳初始化
  addLiquidityPosition: () => {},
  removeLiquidityPosition: () => {},
  getLPTokenById: () => undefined,
});

// Provider component 提供者组件
export const LiquidityProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lpTokens, setLpTokens] = useState<LPToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const { address } = useAccount();

  // Function to fetch user's liquidity positions 函数用于获取用户流动性位置  
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
      setLastUpdated(Date.now()); // Update the timestamp 更新时间戳
    } catch (err) {
      console.error('Error fetching liquidity positions:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch liquidity positions'));
    } finally {
      setIsLoading(false);
    }
  };

  // Alias for refreshLiquidity to maintain compatibility 别名用于保持兼容性
  const refreshLpTokens = refreshLiquidity;

  // Handle blockchain events 处理区块链事件
  const handleLiquidityEvent = (event: LiquidityEvent) => {
    if (!address) return;
    
    // Only process events for the current user 仅处理当前用户的活动
    if (event.userAddress.toLowerCase() !== address.toLowerCase()) return;
    
    // Refresh liquidity positions when this user adds/removes liquidity 当此用户添加/移除流动性时刷新流动性位置
    refreshLiquidity();
  };

  // Initialize: fetch liquidity positions and set up event listeners 初始化：获取流动性位置并设置事件监听器
  useEffect(() => {
    if (address) {
      refreshLiquidity();
      
      // Start blockchain event listening 开始区块链事件监听
      startEventListening().catch(err => 
        console.error('Failed to start event listening:', err)
      );
      
      // Subscribe to liquidity events 订阅流动性事件
      const unsubscribe = subscribeToLiquidityEvents(handleLiquidityEvent);
      
      // Cleanup 清理
      return () => {
        unsubscribe();
      };
    }
  }, [address]);

  // Add a new liquidity position 添加新的流动性位置
  const addLiquidityPosition = (newPosition: LPToken) => {
    setLpTokens(prevTokens => {
      // Check if position already exists 检查位置是否已存在
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

  // Remove a liquidity position 移除流动性位置
  const removeLiquidityPosition = (id: string) => {
    setLpTokens(prevTokens => prevTokens.filter(token => token.id !== id));
  };

  // Get LP token by ID 通过ID获取LP代币
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
        refreshLpTokens, // Add the alias 添加别名
        lastUpdated, // Add the timestamp 添加时间戳
        addLiquidityPosition,
        removeLiquidityPosition,
        getLPTokenById,
      }}
    >
      {children}
    </LiquidityContext.Provider>
  );
};

// Custom hook for using the context 用于使用上下文的钩子
export const useLiquidity = () => useContext(LiquidityContext);

export default LiquidityContext; 