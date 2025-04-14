import React from 'react';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

interface FarmPoolProps {
  pool: {
    id: string;
    name: string;
    lpToken: {
      address: string;
      symbol: string;
      token0: Token;
      token1: Token;
    };
    rewardToken: Token;
    totalStaked: string;
    userStaked: string;
    apr: number;
    rewardsPerDay: string;
    userPendingRewards: string;
  };
  onStake: (pool: FarmPoolProps['pool']) => void;
  onUnstake: (pool: FarmPoolProps['pool']) => void;
  onHarvest: (pool: FarmPoolProps['pool']) => void;
}

export const FarmPool: React.FC<FarmPoolProps> = ({ pool, onStake, onUnstake, onHarvest }) => {
  const hasStake = parseFloat(pool.userStaked) > 0;
  const hasPendingRewards = parseFloat(pool.userPendingRewards) > 0;
  
  // Calculate rewards per day based on user's stake
  const userDailyRewards = hasStake
    ? (parseFloat(pool.userStaked) / parseFloat(pool.totalStaked) * parseFloat(pool.rewardsPerDay)).toFixed(2)
    : '0';

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
        <div className="flex items-center mb-4 lg:mb-0">
          <div className="flex -space-x-2 mr-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center z-10">
              {pool.lpToken.token0.logo ? (
                <img src={pool.lpToken.token0.logo} alt={pool.lpToken.token0.symbol} className="w-8 h-8 rounded-full" />
              ) : (
                <span className="text-sm font-bold">{pool.lpToken.token0.symbol.charAt(0)}</span>
              )}
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {pool.lpToken.token1.logo ? (
                <img src={pool.lpToken.token1.logo} alt={pool.lpToken.token1.symbol} className="w-8 h-8 rounded-full" />
              ) : (
                <span className="text-sm font-bold">{pool.lpToken.token1.symbol.charAt(0)}</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-lg">{pool.name}</h3>
            <p className="text-sm text-gray-500">Earn {pool.rewardToken.symbol}</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          {hasStake && (
            <button 
              className={`px-4 py-2 rounded-lg ${
                hasPendingRewards 
                  ? 'bg-green-50 hover:bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              onClick={() => onHarvest(pool)}
              disabled={!hasPendingRewards}
            >
              Harvest {pool.userPendingRewards} {pool.rewardToken.symbol}
            </button>
          )}
          
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={() => onStake(pool)}
          >
            {hasStake ? 'Stake More' : 'Stake'}
          </button>
          
          {hasStake && (
            <button 
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
              onClick={() => onUnstake(pool)}
            >
              Unstake
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">APR</p>
          <p className="text-xl font-semibold text-green-600">{pool.apr}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Total Staked</p>
          <p className="text-xl font-semibold">{pool.totalStaked} {pool.lpToken.symbol}</p>
        </div>
        <div className="bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Your Stake</p>
          <p className="text-xl font-semibold">{pool.userStaked} {pool.lpToken.symbol}</p>
        </div>
      </div>

      {hasStake && (
        <div className="bg-white p-4 rounded-lg mt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending Rewards</p>
              <p className="text-lg font-medium">{pool.userPendingRewards} {pool.rewardToken.symbol}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Rewards Per Day</p>
              <p className="text-lg font-medium">
                {userDailyRewards} {pool.rewardToken.symbol}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 