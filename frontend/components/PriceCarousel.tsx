import React, { useState, useEffect } from 'react';
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
  refreshInterval = 5000 
}) => {
  // Convert prices record to array for easier rendering
  // 将价格记录转换为数组以便于渲染
  const tokenPrices = Object.entries(prices).map(([symbol, price]) => ({
    symbol: symbol as TokenSymbol,
    price,
    prevPrice: prevPrices[symbol as TokenSymbol] || price,
  }));

  // Track animation refresh
  // 跟踪动画刷新
  const [refreshAnimation, setRefreshAnimation] = useState(false);

  // Determine price change direction based on previous price
  // 根据之前的价格确定价格变化方向
  const getPriceChangeDirection = (currentPrice: number, prevPrice: number): 'up' | 'down' | 'none' => {
    if (currentPrice > prevPrice) return 'up';
    if (currentPrice < prevPrice) return 'down';
    return 'none';
  };

  // Trigger refresh animation effect
  // 触发刷新动画效果
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshAnimation(true);
      setTimeout(() => setRefreshAnimation(false), 1000);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

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