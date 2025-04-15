import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { FarmCard } from './FarmCard';
import { useToast } from '../../contexts/ToastContext';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
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

// Action types for modal
type PoolAction = 'stake' | 'unstake';

// Mock tokens for demonstration
const MOCK_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logo: '/images/tokens/eth.png'
  },
  {
    address: '0x1111111111111111111111111111111111111111',
    symbol: 'AIH',
    name: 'AIHarvest Token',
    decimals: 18,
    logo: '/images/tokens/aih.png'
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: '/images/tokens/usdc.png'
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
  const [activeAction, setActiveAction] = useState<PoolAction | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { address } = useAccount();
  const { showToast } = useToast();

  // Unified method to handle pool actions
  const handlePoolAction = (
    pool: FarmPool, 
    action: PoolAction,
    amount?: string
  ) => {
    if (amount) {
      // Execute the action with amount
      try {
        if (action === 'stake') {
          // Here would be the actual staking logic with real contract call
          console.log(`Staking ${amount} ${pool.lpToken.symbol} in ${pool.name}`);
          showToast(`Successfully staked ${amount} ${pool.lpToken.symbol}`, 'success');
        } else {
          // Here would be the actual unstaking logic with real contract call
          console.log(`Unstaking ${amount} ${pool.lpToken.symbol} from ${pool.name}`);
          showToast(`Successfully unstaked ${amount} ${pool.lpToken.symbol}`, 'success');
        }
        closeModal();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`${action} error:`, error);
        showToast(errorMessage, 'error');
      }
    } else {
      // Open modal for the action
      setActivePool(pool);
      setActiveAction(action);
      setActionAmount('');
      setIsModalOpen(true);
    }
  };

  // Handle harvest rewards
  const handleHarvest = async (pool: FarmPool) => {
    try {
      // Here would be the actual harvesting logic with real contract call
      console.log(`Harvesting ${pool.userPendingRewards} ${pool.rewardToken.symbol} from ${pool.name}`);
      showToast(`Successfully harvested ${pool.userPendingRewards} ${pool.rewardToken.symbol}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Harvest error:', error);
      showToast(errorMessage, 'error');
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setActivePool(null);
    setActiveAction(null);
    setActionAmount('');
  };

  // Convert pool LP token to Token type
  const getLpToken = (pool: FarmPool): Token => {
    return {
      address: pool.lpToken.address,
      symbol: pool.lpToken.symbol,
      name: `${pool.lpToken.token0.symbol}-${pool.lpToken.token1.symbol} LP`,
      decimals: 18, // LP tokens typically have 18 decimals
      logo: pool.lpToken.token0.logo // Use the first token's logo for simplicity
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6">Farm Pools</h2>

      <div className="space-y-6">
        {MOCK_FARMS.map((pool) => (
          <FarmCard
            key={pool.id}
            farmAddress={pool.lpToken.address}
            poolId={parseInt(pool.id.replace('0x', ''), 16)}
            lpToken={getLpToken(pool)}
            rewardToken={pool.rewardToken}
            apr={pool.apr.toString()}
            userStaked={pool.userStaked}
            totalStaked={pool.totalStaked}
            pendingRewards={pool.userPendingRewards}
            onDeposit={(amount) => handlePoolAction(pool, 'stake', amount)}
            onWithdraw={(amount) => handlePoolAction(pool, 'unstake', amount)}
            onHarvest={() => handleHarvest(pool)}
            lpBalance="100"
          />
        ))}

        {MOCK_FARMS.length === 0 && (
          <div className="text-center p-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No farm pools available yet.</p>
          </div>
        )}
      </div>

      {/* Unified Action Modal */}
      {isModalOpen && activePool && activeAction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">
                {activeAction === 'stake' ? 'Stake' : 'Unstake'} LP Tokens
              </h3>
              <button onClick={closeModal}>
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
                  <span className="text-sm text-gray-600">
                    Amount to {activeAction === 'stake' ? 'Stake' : 'Unstake'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {activeAction === 'stake' 
                      ? `Balance: 100 ${activePool.lpToken.symbol}`
                      : `Staked: ${activePool.userStaked} ${activePool.lpToken.symbol}`}
                  </span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                  />
                  <button
                    className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm"
                    onClick={() => setActionAmount(activeAction === 'stake' ? '100' : activePool.userStaked)}
                  >
                    MAX
                  </button>
                </div>
              </div>

              {activeAction === 'stake' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">You will receive</p>
                  <p className="font-medium">
                    {actionAmount ? 
                      `${(parseFloat(actionAmount) / parseFloat(activePool.totalStaked) * parseFloat(activePool.rewardsPerDay)).toFixed(4)} ${activePool.rewardToken.symbol} per day` : 
                      '0 rewards per day'}
                  </p>
                </div>
              )}

              {activeAction === 'unstake' && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg">
                  <p className="text-sm">
                    You will also harvest {activePool.userPendingRewards} {activePool.rewardToken.symbol} rewards when unstaking.
                  </p>
                </div>
              )}

              <button
                className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                  !actionAmount || parseFloat(actionAmount) <= 0 || 
                  (activeAction === 'unstake' && parseFloat(actionAmount) > parseFloat(activePool.userStaked))
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={
                  !actionAmount || 
                  parseFloat(actionAmount) <= 0 ||
                  (activeAction === 'unstake' && parseFloat(actionAmount) > parseFloat(activePool.userStaked))
                }
                onClick={() => handlePoolAction(activePool, activeAction, actionAmount)}
              >
                {activeAction === 'stake' ? 'Stake' : 'Unstake'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 