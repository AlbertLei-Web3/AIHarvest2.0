import React from 'react';

// Token price component props interface
// 代币价格组件属性接口
interface TokenPriceProps {
  symbol: string;
  price: number;
  priceChange: 'up' | 'down' | 'none';
  animateRefresh?: boolean;
}

/**
 * Component to display a token price with movement indicator
 * 用于显示带有涨跌指示器的代币价格的组件
 */
const TokenPrice: React.FC<TokenPriceProps> = ({ 
  symbol, 
  price, 
  priceChange, 
  animateRefresh = false 
}) => {
  // Determine color and icon based on price change direction
  // 根据价格变化方向确定颜色和图标
  const getColorClass = () => {
    if (priceChange === 'up') return 'text-green-500';
    if (priceChange === 'down') return 'text-red-500';
    return 'text-gray-400';
  };

  const renderIcon = () => {
    if (priceChange === 'up') {
      return (
        <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    if (priceChange === 'down') {
      return (
        <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center p-3 bg-dark-lighter rounded-lg border border-primary/10 hover:border-primary/30 transition-all">
      {/* Token symbol */}
      <span className="text-sm font-semibold text-white">{symbol}</span>
      
      {/* Price display with animation effect when refreshed */}
      <div className={`flex items-center mt-1 ${animateRefresh ? 'animate-pulse' : ''}`}>
        <span className={`text-lg font-bold ${getColorClass()}`}>${price.toFixed(4)}</span>
        {renderIcon()}
      </div>
    </div>
  );
};

export default TokenPrice; 