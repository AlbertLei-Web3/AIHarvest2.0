import { useState, useEffect } from 'react';
import { 
  startPriceSimulation, 
  stopPriceSimulation, 
  getAllTokenPrices, 
  TokenSymbol 
} from '@/utils/priceSimulation';

/**
 * Custom hook for managing token price simulation
 * 用于管理代币价格模拟的自定义钩子
 */
export function usePriceSimulation(onPriceUpdate?: (prices: Record<TokenSymbol, number>) => void) {
  const [simulationId, setSimulationId] = useState<NodeJS.Timeout | null>(null);
  const [prices, setPrices] = useState<Record<TokenSymbol, number>>(getAllTokenPrices());
  const [prevPrices, setPrevPrices] = useState<Record<TokenSymbol, number>>(getAllTokenPrices());
  const [isActive, setIsActive] = useState(false);

  // Start the simulation
  const start = () => {
    if (simulationId) return; // Already running

    const id = startPriceSimulation();
    setSimulationId(id);
    setIsActive(true);
    setPrices(getAllTokenPrices());
  };

  // Stop the simulation
  const stop = () => {
    if (simulationId) {
      stopPriceSimulation(simulationId);
      setSimulationId(null);
      setIsActive(false);
    }
  };

  // Handle price updates - separating the event handler setup from the price state
  // 处理价格更新 - 将事件处理程序设置与价格状态分开
  useEffect(() => {
    const handlePriceUpdate = (event: CustomEvent) => {
      const newPrices = event.detail.prices;
      
      // Store current prices as previous before updating
      setPrevPrices(prices);
      setPrices(newPrices);
      
      if (onPriceUpdate) {
        onPriceUpdate(newPrices);
      }
    };

    window.addEventListener('priceUpdate', handlePriceUpdate as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('priceUpdate', handlePriceUpdate as EventListener);
    };
  // Removing prices from dependencies as it causes event handler to be recreated on every price update
  // 从依赖项中移除prices，防止在每次价格更新时重新创建事件处理程序
  }, [onPriceUpdate]);
  
  // Effect for simulation lifecycle management
  // 用于模拟生命周期管理的effect
  useEffect(() => {
    // Start simulation on mount if not already active
    if (!isActive && !simulationId) {
      start();
    }
    
    // Cleanup on unmount
    return () => {
      if (simulationId) {
        stop();
      }
    };
  }, [isActive, simulationId]);

  return {
    prices,
    prevPrices,
    isActive,
    start,
    stop
  };
} 