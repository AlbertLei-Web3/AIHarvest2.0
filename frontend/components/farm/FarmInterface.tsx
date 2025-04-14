import React, { useState } from 'react';
import { useAccount } from 'wagmi';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface FarmPool {
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
}

// Mock tokens for demonstration
const MOCK_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/images/tokens/eth.png'
  },
  {
    address: '0x1111111111111111111111111111111111111111',
    symbol: 'AIH',
    name: 'AIHarvest Token',
    decimals: 18,
    logoURI: '/images/tokens/aih.png'
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/images/tokens/usdc.png'
  }
];

// Mock farm pools for demonstration
const MOCK_FARMS: FarmPool[] = [
  {
    id: '0x1',
    name: 'ETH-AIH LP Staking',
    lpToken: {
      address: '0x3333333333333333333333333333333333333333',
      symbol: 'ETH-AIH LP',
      token0: MOCK_TOKENS[0],
      token1: MOCK_TOKENS[1]
    },
    rewardToken: MOCK_TOKENS[1],
    totalStaked: '1000',
    userStaked: '10',
    apr: 120,
    rewardsPerDay: '100',
    userPendingRewards: '5.25'
  },
  {
    id: '0x2',
    name: 'USDC-AIH LP Staking',
    lpToken: {
      address: '0x4444444444444444444444444444444444444444',
      symbol: 'USDC-AIH LP',
      token0: MOCK_TOKENS[2],
      token1: MOCK_TOKENS[1]
    },
    rewardToken: MOCK_TOKENS[1],
    totalStaked: '5000',
    userStaked: '0',
    apr: 80,
    rewardsPerDay: '50',
    userPendingRewards: '0'
  }
];

export const FarmInterface: React.FC = () => {
  const [activePool, setActivePool] = useState<FarmPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [isStakeModalOpen, setIsStakeModalOpen] = useState<boolean>(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState<boolean>(false);

  const { address } = useAccount();

  // Open stake modal for a pool
  const openStakeModal = (pool: FarmPool) => {
    setActivePool(pool);
    setStakeAmount('');
    setIsStakeModalOpen(true);
  };

  // Open unstake modal for a pool
  const openUnstakeModal = (pool: FarmPool) => {
    setActivePool(pool);
    setUnstakeAmount('');
    setIsUnstakeModalOpen(true);
  };

  // Close modals
  const closeModals = () => {
    setIsStakeModalOpen(false);
    setIsUnstakeModalOpen(false);
  };

  // Handle stake
  const handleStake = () => {
    // Here would be the actual staking logic
    console.log(`Staking ${stakeAmount} of ${activePool?.lpToken.symbol}`);
    closeModals();
  };

  // Handle unstake
  const handleUnstake = () => {
    // Here would be the actual unstaking logic
    console.log(`Unstaking ${unstakeAmount} of ${activePool?.lpToken.symbol}`);
    closeModals();
  };

  // Handle harvesting rewards
  const handleHarvest = (pool: FarmPool) => {
    // Here would be the actual harvesting logic
    console.log(`Harvesting ${pool.userPendingRewards} ${pool.rewardToken.symbol} from ${pool.name}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6">Farm Pools</h2>

      <div className="space-y-6">
        {MOCK_FARMS.map((pool) => (
          <div key={pool.id} className="bg-gray-50 rounded-lg p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
              <div className="flex items-center mb-4 lg:mb-0">
                <div className="flex -space-x-2 mr-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center z-10">
                    {pool.lpToken.token0.logoURI ? (
                      <img src={pool.lpToken.token0.logoURI} alt={pool.lpToken.token0.symbol} className="w-8 h-8 rounded-full" />
                    ) : (
                      <span className="text-sm font-bold">{pool.lpToken.token0.symbol.charAt(0)}</span>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {pool.lpToken.token1.logoURI ? (
                      <img src={pool.lpToken.token1.logoURI} alt={pool.lpToken.token1.symbol} className="w-8 h-8 rounded-full" />
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
                {parseFloat(pool.userStaked) > 0 && (
                  <button 
                    className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg"
                    onClick={() => handleHarvest(pool)}
                    disabled={parseFloat(pool.userPendingRewards) <= 0}
                  >
                    Harvest {pool.userPendingRewards} {pool.rewardToken.symbol}
                  </button>
                )}
                <button 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  onClick={() => openStakeModal(pool)}
                >
                  {parseFloat(pool.userStaked) > 0 ? 'Stake More' : 'Stake'}
                </button>
                {parseFloat(pool.userStaked) > 0 && (
                  <button 
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                    onClick={() => openUnstakeModal(pool)}
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

            {parseFloat(pool.userStaked) > 0 && (
              <div className="bg-white p-4 rounded-lg mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending Rewards</p>
                    <p className="text-lg font-medium">{pool.userPendingRewards} {pool.rewardToken.symbol}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Rewards Per Day</p>
                    <p className="text-lg font-medium">
                      {(parseFloat(pool.userStaked) / parseFloat(pool.totalStaked) * parseFloat(pool.rewardsPerDay)).toFixed(2)} {pool.rewardToken.symbol}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {MOCK_FARMS.length === 0 && (
          <div className="text-center p-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No farm pools available yet.</p>
          </div>
        )}
      </div>

      {/* Stake Modal */}
      {isStakeModalOpen && activePool && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Stake LP Tokens</h3>
              <button onClick={closeModals}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-500 hover:text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Amount to Stake</span>
                  <span className="text-sm text-gray-600">
                    Balance: 100 {activePool.lpToken.symbol}
                  </span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                  <button
                    className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm"
                    onClick={() => setStakeAmount('100')}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">You will receive</p>
                <p className="font-medium">
                  {stakeAmount ? 
                    `${(parseFloat(stakeAmount) / parseFloat(activePool.totalStaked) * parseFloat(activePool.rewardsPerDay)).toFixed(4)} ${activePool.rewardToken.symbol} per day` : 
                    '0 rewards per day'}
                </p>
              </div>

              <button
                className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                  !stakeAmount || parseFloat(stakeAmount) <= 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                onClick={handleStake}
              >
                Stake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unstake Modal */}
      {isUnstakeModalOpen && activePool && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Unstake LP Tokens</h3>
              <button onClick={closeModals}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-500 hover:text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Amount to Unstake</span>
                  <span className="text-sm text-gray-600">
                    Staked: {activePool.userStaked} {activePool.lpToken.symbol}
                  </span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                  />
                  <button
                    className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm"
                    onClick={() => setUnstakeAmount(activePool.userStaked)}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg">
                <p className="text-sm">
                  You will also harvest {activePool.userPendingRewards} {activePool.rewardToken.symbol} rewards when unstaking.
                </p>
              </div>

              <button
                className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                  !unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > parseFloat(activePool.userStaked)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > parseFloat(activePool.userStaked)}
                onClick={handleUnstake}
              >
                Unstake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 