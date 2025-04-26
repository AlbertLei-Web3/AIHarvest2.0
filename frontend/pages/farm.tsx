import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount, useBalance } from 'wagmi';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ethers } from 'ethers';

// Define token addresses
const TOKEN_ADDRESSES = {
  TD: "0xCa7B8473802716b69fE753a5f9F6D5013a8D8B20",
  FHBI: "0x5c15514CA3B498510D0CEE0B505F1c603bB3324D",
  FHBI2: "0x3746A42C0281c874Cb3796E3d15fb035c8a585b9",
  FHBI3: "0xa7525f69cbc47dF69d26EF2426993604d7C2D07F",
  RTK: "0xa447E2f8BBC54eB13134b02f69bE3401E10BD0A3",
  AIH: "0x123456789abcdef123456789abcdef123456789a" // Placeholder for AIH token
};

// Farm status types
type FarmStatus = 'active' | 'upcoming' | 'ended';

// Farm data interface
interface FarmData {
  id: string;
  name: string;
  lpToken: string;
  token1: {
    symbol: string;
    address: string;
    icon: string;
  };
  token2: {
    symbol: string;
    address: string;
    icon: string;
  };
  apy: number;
  tvl: number;
  stakedAmount: string;
  pendingRewards: string;
  isApproved: boolean;
  status: FarmStatus;
  startTime?: number;
  endTime?: number;
}

// Sorting options
type SortOption = 'apy-desc' | 'apy-asc' | 'tvl-desc' | 'tvl-asc';

// Token filter options including "all"
type TokenFilter = 'all' | 'TD' | 'FHBI' | 'FHBI2' | 'FHBI3' | 'RTK';

// Status filter options
type StatusFilter = 'all' | 'active' | 'upcoming' | 'ended';

// Generate mock farms data for all token combinations
const generateMockFarms = (): FarmData[] => {
  const tokens = ['TD', 'FHBI', 'FHBI2', 'FHBI3', 'RTK'];
  const farms: FarmData[] = [];
  let id = 0;

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const token1 = tokens[i];
      const token2 = tokens[j];
      const apy = Math.random() * 100;
      const tvl = Math.random() * 1000000;
      
      // Determine status randomly, but mostly active
      const statusRandom = Math.random();
      let status: FarmStatus = 'active';
      if (statusRandom > 0.85) status = 'upcoming';
      else if (statusRandom > 0.7) status = 'ended';

      farms.push({
        id: (++id).toString(),
        name: `${token1}-${token2}`,
        lpToken: "0x" + id.toString(16).padStart(40, '0'),
        token1: {
          symbol: token1,
          address: TOKEN_ADDRESSES[token1 as keyof typeof TOKEN_ADDRESSES],
          icon: `/icons/${token1.toLowerCase()}.png`
        },
        token2: {
          symbol: token2,
          address: TOKEN_ADDRESSES[token2 as keyof typeof TOKEN_ADDRESSES],
          icon: `/icons/${token2.toLowerCase()}.png`
        },
        apy,
        tvl,
        stakedAmount: (Math.random() * 100).toFixed(4),
        pendingRewards: (Math.random() * 50).toFixed(4),
        isApproved: Math.random() > 0.3, // 70% chance of being approved
        status,
        startTime: status === 'upcoming' ? Date.now() + 86400000 * 3 : undefined,
        endTime: status === 'ended' ? Date.now() - 86400000 * 2 : undefined
      });
    }
  }

  return farms;
};

const FarmPage = () => {
  const { language } = useLanguage();
  const { address, isConnected } = useAccount();
  // Remove the useNetwork hook and just mock network info
  const networkInfo = { chainId: 1, name: 'Ethereum' };
  const { data: balance } = useBalance({
    address,
    token: TOKEN_ADDRESSES.AIH as `0x${string}`,
    // Remove the enabled property which is causing error
  });

  // State management
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<SortOption>('apy-desc');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isStakeModalOpen, setIsStakeModalOpen] = useState<boolean>(false);
  const [isUnstakeModalOpen, setIsUnstakeModalOpen] = useState<boolean>(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');

  // Load farms data
  useEffect(() => {
    const loadFarms = async () => {
      setLoading(true);
      try {
        // In a real app, you would fetch data from your contract here
        // For now, we'll use mock data
        const mockFarms = generateMockFarms();
        setFarms(mockFarms);
      } catch (error) {
        console.error("Failed to load farms:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFarms();
  }, []);

  // Filtered and sorted farms
  const filteredAndSortedFarms = useMemo(() => {
    let result = [...farms];

    // Apply token filter
    if (tokenFilter !== 'all') {
      result = result.filter(farm => 
        farm.token1.symbol === tokenFilter || farm.token2.symbol === tokenFilter
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(farm => farm.status === statusFilter);
    }

    // Apply sorting
    switch (sortOption) {
      case 'apy-desc':
        result.sort((a, b) => b.apy - a.apy);
        break;
      case 'apy-asc':
        result.sort((a, b) => a.apy - b.apy);
        break;
      case 'tvl-desc':
        result.sort((a, b) => b.tvl - a.tvl);
        break;
      case 'tvl-asc':
        result.sort((a, b) => a.tvl - b.tvl);
        break;
    }

    return result;
  }, [farms, sortOption, tokenFilter, statusFilter]);

  // Farm operations
  const handleApprove = (farm: FarmData) => {
    // In a real app, you would call your contract's approve function here
    console.log("Approving farm:", farm.name);
    
    // Mock approval
    setFarms(prevFarms => 
      prevFarms.map(f => 
        f.id === farm.id ? { ...f, isApproved: true } : f
      )
    );
  };

  const openStakeModal = (farm: FarmData) => {
    setSelectedFarm(farm);
    setStakeAmount('');
    setIsStakeModalOpen(true);
  };

  const openUnstakeModal = (farm: FarmData) => {
    setSelectedFarm(farm);
    setUnstakeAmount('');
    setIsUnstakeModalOpen(true);
  };

  const handleStake = () => {
    if (!selectedFarm || !stakeAmount) return;

    // In a real app, you would call your contract's stake function here
    console.log(`Staking ${stakeAmount} LP tokens on ${selectedFarm.name}`);
    
    // Close modal
    setIsStakeModalOpen(false);
    setSelectedFarm(null);
  };

  const handleUnstake = () => {
    if (!selectedFarm || !unstakeAmount) return;

    // In a real app, you would call your contract's unstake function here
    console.log(`Unstaking ${unstakeAmount} LP tokens from ${selectedFarm.name}`);
    
    // Close modal
    setIsUnstakeModalOpen(false);
    setSelectedFarm(null);
  };

  const handleClaim = (farm: FarmData) => {
    // In a real app, you would call your contract's claim function here
    console.log(`Claiming ${farm.pendingRewards} AIH rewards from ${farm.name}`);
    
    // Mock claim
    setFarms(prevFarms => 
      prevFarms.map(f => 
        f.id === farm.id ? { ...f, pendingRewards: '0' } : f
      )
    );
  };

  const handleEmergencyWithdraw = (farm: FarmData) => {
    // In a real app, you would call your contract's emergency withdraw function here
    console.log(`Emergency withdrawal from ${farm.name}`);
    
    // Mock emergency withdraw
    setFarms(prevFarms => 
      prevFarms.map(f => 
        f.id === farm.id ? { ...f, stakedAmount: '0', pendingRewards: '0' } : f
      )
    );
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Format wallet address
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format status text
  const getStatusText = (status: FarmStatus): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'upcoming': return 'Coming Soon';
      case 'ended': return 'Ended';
      default: return '';
    }
  };

  // Format status color
  const getStatusColor = (status: FarmStatus): string => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'upcoming': return 'bg-blue-600';
      case 'ended': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 bg-gray-900">
      <div className="container mx-auto max-w-6xl">
        {/* Header with User Status */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">Farms</h1>
          
          {isConnected ? (
            <div className="bg-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-gray-400 text-sm">Wallet</span>
                <span className="text-white font-medium">{formatAddress(address || '')}</span>
              </div>
              <div className="h-10 w-px bg-gray-700 hidden sm:block"></div>
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-gray-400 text-sm">Network</span>
                <span className="text-white font-medium">{networkInfo.name || 'Unknown'}</span>
              </div>
              <div className="h-10 w-px bg-gray-700 hidden sm:block"></div>
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-gray-400 text-sm">AIH Balance</span>
                <span className="text-white font-medium">{balance ? parseFloat(balance.formatted).toFixed(4) : '0'} AIH</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-4">
              <span className="text-gray-400">Please connect your wallet</span>
            </div>
          )}
        </div>

        {/* Filters and Sorting */}
        <div className="bg-gray-800 rounded-xl p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Token Filter */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Filter by Token</label>
              <select 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                value={tokenFilter}
                onChange={(e) => setTokenFilter(e.target.value as TokenFilter)}
              >
                <option value="all">All Tokens</option>
                <option value="TD">TD Token</option>
                <option value="FHBI">FHBI Token</option>
                <option value="FHBI2">FHBI2 Token</option>
                <option value="FHBI3">FHBI3 Token</option>
                <option value="RTK">RTK Token</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Sort by</label>
              <select 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
              >
                <option value="apy-desc">APY (High to Low)</option>
                <option value="apy-asc">APY (Low to High)</option>
                <option value="tvl-desc">TVL (High to Low)</option>
                <option value="tvl-asc">TVL (Low to High)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Status</label>
              <select 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All Pools</option>
                <option value="active">Active</option>
                <option value="upcoming">Coming Soon</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center my-16">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* No Results State */}
        {!loading && filteredAndSortedFarms.length === 0 && (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <h3 className="text-xl text-white mb-2">No Farms Found</h3>
            <p className="text-gray-400">Try changing your filter options</p>
          </div>
        )}

        {/* Farm Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {filteredAndSortedFarms.map(farm => (
            <div key={farm.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              {/* Farm Header */}
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="relative mr-2">
                    <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      <img src={farm.token1.icon} alt={farm.token1.symbol} className="h-8 w-8" />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gray-700 absolute -right-4 top-0 flex items-center justify-center overflow-hidden">
                      <img src={farm.token2.icon} alt={farm.token2.symbol} className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="ml-6">
                    <h3 className="text-xl font-bold text-white">{farm.name}</h3>
                    <div className="flex items-center mt-1">
                      <span className={`${getStatusColor(farm.status)} text-white text-xs rounded-full px-2 py-1 mr-2`}>
                        {getStatusText(farm.status)}
                      </span>
                      <span className="text-gray-400 text-sm">Earn AIH</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                  <div className="text-white font-bold text-xl">{farm.apy.toFixed(2)}%</div>
                  <div className="text-white text-xs">APY</div>
                </div>
              </div>

              {/* Farm Body */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">TVL</div>
                    <div className="text-white font-medium">${formatNumber(farm.tvl)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Your Stake</div>
                    <div className="text-white font-medium">{farm.stakedAmount} LP</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Rewards</div>
                    <div className="text-white font-medium">{farm.pendingRewards} AIH</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">LP Address</div>
                    <div className="text-white font-medium text-xs">{formatAddress(farm.lpToken)}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    {!farm.isApproved ? (
                      <button
                        onClick={() => handleApprove(farm)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-300"
                        disabled={farm.status !== 'active'}
                      >
                        Approve
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openStakeModal(farm)}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition duration-300"
                          disabled={farm.status !== 'active'}
                        >
                          Stake
                        </button>
                        <button
                          onClick={() => openUnstakeModal(farm)}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition duration-300"
                          disabled={farm.status !== 'active' || parseFloat(farm.stakedAmount) <= 0}
                        >
                          Unstake
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleClaim(farm)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition duration-300"
                    disabled={farm.status !== 'active' || parseFloat(farm.pendingRewards) <= 0}
                  >
                    Claim Rewards
                  </button>
                  <button
                    onClick={() => handleEmergencyWithdraw(farm)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg transition duration-300"
                    disabled={farm.status !== 'active' || parseFloat(farm.stakedAmount) <= 0}
                  >
                    Emergency Withdraw
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stake Modal */}
        {isStakeModalOpen && selectedFarm && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black bg-opacity-70" onClick={() => setIsStakeModalOpen(false)}></div>
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md z-10 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Stake LP Tokens</h3>
              <p className="text-gray-400 mb-4">Stake your {selectedFarm.name} LP tokens to earn AIH rewards</p>
              
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Amount</label>
                <div className="flex">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-grow bg-gray-900 border border-gray-700 rounded-l-lg p-2 text-white"
                  />
                  <button
                    onClick={() => setStakeAmount('100')} // Replace with actual max amount logic
                    className="bg-gray-700 text-white px-4 rounded-r-lg"
                  >
                    MAX
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Your LP Balance</div>
                  <div className="text-white">100.00 LP</div> {/* Replace with actual balance */}
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Already Staked</div>
                  <div className="text-white">{selectedFarm.stakedAmount} LP</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400 text-sm mb-1">Estimated Daily Earnings</div>
                  <div className="text-white">{stakeAmount ? (parseFloat(stakeAmount) * selectedFarm.apy / 100 / 365).toFixed(4) : '0.0000'} AIH per day</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setIsStakeModalOpen(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStake}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition duration-300"
                  disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unstake Modal */}
        {isUnstakeModalOpen && selectedFarm && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black bg-opacity-70" onClick={() => setIsUnstakeModalOpen(false)}></div>
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md z-10 border border-gray-700">
              <h3 className="text-2xl font-bold text-white mb-4">Unstake LP Tokens</h3>
              <p className="text-gray-400 mb-4">Withdraw your {selectedFarm.name} LP tokens from the farm</p>
              
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Amount</label>
                <div className="flex">
                  <input
                    type="number"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-grow bg-gray-900 border border-gray-700 rounded-l-lg p-2 text-white"
                  />
                  <button
                    onClick={() => setUnstakeAmount(selectedFarm.stakedAmount)}
                    className="bg-gray-700 text-white px-4 rounded-r-lg"
                  >
                    MAX
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Staked Balance</div>
                  <div className="text-white">{selectedFarm.stakedAmount} LP</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Pending Rewards</div>
                  <div className="text-white">{selectedFarm.pendingRewards} AIH</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400 text-sm mb-1">Note</div>
                  <div className="text-white text-sm">Unstaking will automatically harvest your pending rewards</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setIsUnstakeModalOpen(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnstake}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition duration-300"
                  disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > parseFloat(selectedFarm.stakedAmount)}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default dynamic(() => Promise.resolve(FarmPage), { ssr: false }); 