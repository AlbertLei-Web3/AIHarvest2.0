import React, { useState, useEffect, useRef } from 'react';
import TokenPrice from './TokenPrice';
import { TokenSymbol } from '@/utils/priceSimulation';

// Price carousel component props interface
// 价格轮播组件属性接口
interface PriceCarouselProps {
  prices: Record<TokenSymbol, number>;
  prevPrices: Record<TokenSymbol, number>;
  refreshInterval?: number;
}

/**
 * A carousel component to display multiple token prices
 * 用于显示多个代币价格的轮播组件
 */
const PriceCarousel: React.FC<PriceCarouselProps> = ({ 
  prices, 
  prevPrices, 
  refreshInterval = 6000 
}) => {
  // Track last price update to prevent too frequent visual updates
  // 跟踪上次价格更新，以防止过于频繁的视觉更新
  const lastUpdateRef = useRef<Record<TokenSymbol, number>>({} as Record<TokenSymbol, number>);
  const [displayPrices, setDisplayPrices] = useState(prices);
  const [displayPrevPrices, setDisplayPrevPrices] = useState(prevPrices);
  
  // Track animation refresh
  // 跟踪动画刷新
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Update display prices with throttling (max once per 6 seconds)
  // 更新显示价格并节流（最多6秒一次）
  useEffect(() => {
    const now = Date.now();
    
    // Only update display if at least 6 seconds have passed since last update
    // 仅当自上次更新以来至少经过6秒时才更新显示
    if (now - lastRefreshTime >= refreshInterval) {
      setDisplayPrevPrices(displayPrices);
      setDisplayPrices(prices);
      setLastRefreshTime(now);
      
      // Trigger animation 500ms after price update
      // 在价格更新后500毫秒触发动画
      setTimeout(() => {
        setRefreshAnimation(true);
        setTimeout(() => setRefreshAnimation(false), 1000);
      }, 500);
    }
  }, [prices, refreshInterval]);

  // Convert display prices record to array for easier rendering
  // 将显示价格记录转换为数组以便于渲染
  const tokenPrices = Object.entries(displayPrices).map(([symbol, price]) => ({
    symbol: symbol as TokenSymbol,
    price,
    prevPrice: displayPrevPrices[symbol as TokenSymbol] || price,
  }));

  // Determine price change direction based on previous price
  // 根据之前的价格确定价格变化方向
  const getPriceChangeDirection = (currentPrice: number, prevPrice: number): 'up' | 'down' | 'none' => {
    if (currentPrice > prevPrice) return 'up';
    if (currentPrice < prevPrice) return 'down';
    return 'none';
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tokenPrices.map((token) => (
          <TokenPrice
            key={token.symbol}
            symbol={token.symbol}
            price={token.price}
            priceChange={getPriceChangeDirection(token.price, token.prevPrice)}
            animateRefresh={refreshAnimation}
          />
        ))}
      </div>
    </div>
  );
};

export default PriceCarousel; 