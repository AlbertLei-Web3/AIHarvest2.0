import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { 
  getAllPools, 
  depositToFarm, 
  withdrawFromFarm, 
  harvestRewards, 
  getPendingRewards 
} from '@/utils/farmContracts';
import { getTokenBalance, approveLPToken } from '@/utils/contracts';
import { ethers } from 'ethers';
import { contractAddresses } from '@/constants/addresses';

interface Token {
  name: string;
  symbol: string;
  logo: string;
  balance: number;
  decimals: number;
}

interface TokensType {
  [key: string]: Token;
}

interface FarmData {
  id: number;
  name: string;
  description: string;
  apr: number;
  totalStaked: string;
  dailyRewards: number;
  lpToken: string;
  tokenA: string;
  tokenB: string;
  balance: string;
  userStaked: string;
  pendingRewards: string;
  value: number;
  pairAddress?: string;
}

interface FarmsType {
  [key: string]: FarmData;
}

interface FarmTranslation {
  farms: string;
  totalValueLocked: string;
  aihRewards: string;
  yourStakedValue: string;
  pendingRewards: string;
  walletWarning: string;
  totalStaked: string;
  dailyRewards: string;
  yourStake: string;
  yourPending: string;
  harvest: string;
  viewContract: string;
  stakeLpTokens: string;
  max: string;
  balance: string;
  stake: string;
  withdrawLpTokens: string;
  staked: string;
  withdraw: string;
  connectWallet: string;
  approving: string;
  staking: string;
  withdrawing: string;
  harvesting: string;
  txError: string;
  txSuccess: string;
}

interface FarmTranslationsType {
  en: FarmTranslation;
  zh: FarmTranslation;
  [key: string]: FarmTranslation;
}

// Token data
const tokens: TokensType = {
  eth: {
    name: 'Ethereum',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    balance: 1.5,
    decimals: 18
  },
  aih: {
    name: 'AIH Token',
    symbol: 'AIH',
    logo: 'https://cryptologos.cc/logos/aave-aave-logo.svg',
    balance: 1000,
    decimals: 18
  },
  usdt: {
    name: 'Tether USD',
    symbol: 'USDT',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    balance: 500,
    decimals: 6
  },
  dai: {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    balance: 500,
    decimals: 18
  }
};

// Default farm data - will be replaced with real data
const defaultFarms: FarmsType = {
  '0': {
    id: 0,
    name: 'ETH-AIH LP',
    description: 'Stake ETH-AIH LP tokens to earn AIH',
    apr: 87.5,
    totalStaked: '0',
    dailyRewards: 100, // 100 AIH per day
    lpToken: '',
    tokenA: 'eth',
    tokenB: 'aih',
    balance: '0',
    userStaked: '0',
    pendingRewards: '0',
    value: 100 // $100 per LP token
  },
  '1': {
    id: 1,
    name: 'AIH-USDT LP',
    description: 'Stake AIH-USDT LP tokens to earn AIH',
    apr: 62.3,
    totalStaked: '0',
    dailyRewards: 50, // 50 AIH per day
    lpToken: '',
    tokenA: 'aih',
    tokenB: 'usdt',
    balance: '0',
    userStaked: '0',
    pendingRewards: '0',
    value: 50 // $50 per LP token
  }
};

const FarmPage = () => {
  const [userFarms, setUserFarms] = useState<FarmsType>(defaultFarms);
  const [totalStakedValue, setTotalStakedValue] = useState<number>(0);
  const [totalPendingRewards, setTotalPendingRewards] = useState<number>(0);
  const [stakeAmounts, setStakeAmounts] = useState<{[key: string]: string}>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{type: string, message: string} | null>(null);
  const [isApproving, setIsApproving] = useState<{[key: string]: boolean}>({});
  const [isTransacting, setIsTransacting] = useState<{[key: string]: boolean}>({});
  
  const { address, isConnected } = useAccount();
  const { language, t } = useLanguage();
  
  // Translations for the farm page
  const farmTranslations: FarmTranslationsType = {
    en: {
      farms: 'Farms',
      totalValueLocked: 'Total Value Locked',
      aihRewards: 'AIH Rewards',
      yourStakedValue: 'Your Staked Value',
      pendingRewards: 'Pending Rewards',
      walletWarning: 'Please connect your wallet to view your stakes and rewards',
      totalStaked: 'Total Staked',
      dailyRewards: 'Daily Rewards',
      yourStake: 'Your Stake',
      yourPending: 'Your Pending',
      harvest: 'Harvest',
      viewContract: 'View Contract',
      stakeLpTokens: 'Stake LP Tokens',
      max: 'MAX',
      balance: 'Balance',
      stake: 'Stake',
      withdrawLpTokens: 'Withdraw LP Tokens',
      staked: 'Staked',
      withdraw: 'Withdraw',
      connectWallet: 'Connect Wallet',
      approving: 'Approving...',
      staking: 'Staking...',
      withdrawing: 'Withdrawing...',
      harvesting: 'Harvesting...',
      txError: 'Transaction failed',
      txSuccess: 'Transaction successful'
    },
    zh: {
      farms: '农场',
      totalValueLocked: '总锁仓价值',
      aihRewards: 'AIH 奖励',
      yourStakedValue: '您的质押价值',
      pendingRewards: '待领取奖励',
      walletWarning: '请连接您的钱包查看您的质押和奖励',
      totalStaked: '总质押量',
      dailyRewards: '每日奖励',
      yourStake: '您的质押',
      yourPending: '您的待领取',
      harvest: '收获',
      viewContract: '查看合约',
      stakeLpTokens: '质押LP代币',
      max: '最大',
      balance: '余额',
      stake: '质押',
      withdrawLpTokens: '提取LP代币',
      staked: '已质押',
      withdraw: '提取',
      connectWallet: '连接钱包',
      approving: '授权中...',
      staking: '质押中...',
      withdrawing: '提取中...',
      harvesting: '收获中...',
      txError: '交易失败',
      txSuccess: '交易成功'
    }
  };
  
  // Function to get translations
  const ft = (key: keyof FarmTranslation): string => {
    const translations = farmTranslations[language] || farmTranslations.en;
    return translations[key] || key;
  };
  
  // Load user farm data
  const loadUserFarmData = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // Get all pools from the farm contract
      const pools = await getAllPools(address);
      
      if (pools.length === 0) {
        setIsLoading(false);
        return;
      }
      
      const updatedFarms: FarmsType = {};
      
      // Process each pool
      for (let i = 0; i < pools.length; i++) {
        const pool = pools[i];
        
        // Skip invalid pools
        if (!pool.lpToken || pool.lpToken === ethers.constants.AddressZero) continue;
        
        // Get LP token balance for each farm
        let lpBalance;
        try {
          lpBalance = await getTokenBalance(pool.lpToken, address);
        } catch (error) {
          console.error(`Error getting LP balance for pool ${i}:`, error);
          lpBalance = '0';
        }
        
        // Get allocation point percentage for APR calculation (simplified)
        const allocPoint = Number(pool.allocPoint);
        const apr = allocPoint > 0 ? 50 + (allocPoint / 10) : 0; // Simplified APR calculation
        
        updatedFarms[i.toString()] = {
          id: i,
          name: `LP Token ${i}`, // This would ideally be derived from the LP token symbols
          description: 'Stake LP tokens to earn AIH',
          apr: apr,
          totalStaked: pool.totalStaked,
          dailyRewards: 100 / pools.length, // Simplified - distribute 100 AIH across all pools
          lpToken: pool.lpToken,
          tokenA: 'aih', // Default for now - would need a mapping from LP token to underlying tokens
          tokenB: 'eth', // Default for now - would need a mapping from LP token to underlying tokens
          balance: lpBalance,
          userStaked: pool.userStaked,
          pendingRewards: pool.pendingRewards,
          value: 50, // Simplified value per LP token
          pairAddress: pool.lpToken
        };
      }
      
      setUserFarms(updatedFarms);
      calculateTotals(updatedFarms);
    } catch (error) {
      console.error('Error loading farm data:', error);
      setNotification({
        type: 'error',
        message: `Error loading farm data: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update pending rewards
  const updatePendingRewards = async () => {
    if (!address || !isConnected) return;
    
    try {
      const updatedFarms = { ...userFarms };
      
      for (const poolId in updatedFarms) {
        const pendingRewards = await getPendingRewards(Number(poolId), address);
        updatedFarms[poolId].pendingRewards = pendingRewards;
      }
      
      setUserFarms(updatedFarms);
      calculateTotals(updatedFarms);
    } catch (error) {
      console.error('Error updating pending rewards:', error);
    }
  };
  
  // Calculate totals
  const calculateTotals = (farms: FarmsType = userFarms): void => {
    let stakedValue = 0;
    let pendingRewards = 0;
    
    Object.values(farms).forEach((farm) => {
      stakedValue += parseFloat(farm.userStaked) * farm.value;
      pendingRewards += parseFloat(farm.pendingRewards);
    });
    
    setTotalStakedValue(stakedValue);
    setTotalPendingRewards(pendingRewards);
  };
  
  // Handle stake amount change
  const handleStakeAmountChange = (farmId: string, value: string): void => {
    setStakeAmounts({
      ...stakeAmounts,
      [farmId]: value
    });
  };
  
  // Handle withdraw amount change
  const handleWithdrawAmountChange = (farmId: string, value: string): void => {
    setWithdrawAmounts({
      ...withdrawAmounts,
      [farmId]: value
    });
  };
  
  // Set max stake amount
  const handleSetMaxStake = (farmId: string): void => {
    if (!isConnected) return;
    
    const farm = userFarms[farmId];
    setStakeAmounts({
      ...stakeAmounts,
      [farmId]: farm.balance
    });
  };
  
  // Set max withdraw amount
  const handleSetMaxWithdraw = (farmId: string): void => {
    if (!isConnected) return;
    
    const farm = userFarms[farmId];
    setWithdrawAmounts({
      ...withdrawAmounts,
      [farmId]: farm.userStaked
    });
  };
  
  // Approve LP tokens for staking
  const handleApprove = async (farmId: string): Promise<boolean> => {
    if (!isConnected || !address) return false;
    
    const farm = userFarms[farmId];
    const amount = stakeAmounts[farmId];
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid amount'
      });
      return false;
    }
    
    setIsApproving({
      ...isApproving,
      [farmId]: true
    });
    
    try {
      setNotification({
        type: 'loading',
        message: ft('approving')
      });
      
      // Need to update this to use approveLPToken if we're dealing with LP tokens
      const tx = await approveLPToken(
        farm.pairAddress || farm.lpToken,
        contractAddresses.farm,
        ethers.utils.parseUnits(amount, 18).toString()
      );
      
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: ${farm.name} approved for staking`
      });
      
      return true;
    } catch (error) {
      console.error('Error approving tokens:', error);
      setNotification({
        type: 'error',
        message: `${ft('txError')}: ${error instanceof Error ? error.message : String(error)}`
      });
      return false;
    } finally {
      setIsApproving({
        ...isApproving,
        [farmId]: false
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  // Stake LP tokens
  const handleStake = async (farmId: string): Promise<void> => {
    if (!isConnected || !address) return;
    
    const farm = userFarms[farmId];
    const amount = stakeAmounts[farmId];
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid amount'
      });
      return;
    }
    
    if (parseFloat(amount) > parseFloat(farm.balance)) {
      setNotification({
        type: 'error',
        message: 'Insufficient balance'
      });
      return;
    }
    
    // First, approve tokens
    const approved = await handleApprove(farmId);
    if (!approved) return;
    
    setIsTransacting({
      ...isTransacting,
      [farmId]: true
    });
    
    try {
      setNotification({
        type: 'loading',
        message: ft('staking')
      });
      
      const tx = await depositToFarm(Number(farmId), amount);
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: Staked ${amount} ${farm.name} tokens`
      });
      
      // Reset input
      setStakeAmounts({
        ...stakeAmounts,
        [farmId]: ''
      });
      
      // Reload farm data after staking
      await loadUserFarmData();
    } catch (error) {
      console.error('Error staking tokens:', error);
      setNotification({
        type: 'error',
        message: `${ft('txError')}: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsTransacting({
        ...isTransacting,
        [farmId]: false
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  // Withdraw LP tokens
  const handleWithdraw = async (farmId: string): Promise<void> => {
    if (!isConnected || !address) return;
    
    const farm = userFarms[farmId];
    const amount = withdrawAmounts[farmId];
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid amount'
      });
      return;
    }
    
    if (parseFloat(amount) > parseFloat(farm.userStaked)) {
      setNotification({
        type: 'error',
        message: 'Insufficient staked amount'
      });
      return;
    }
    
    setIsTransacting({
      ...isTransacting,
      [farmId]: true
    });
    
    try {
      setNotification({
        type: 'loading',
        message: ft('withdrawing')
      });
      
      const tx = await withdrawFromFarm(Number(farmId), amount);
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: Withdrawn ${amount} ${farm.name} tokens`
      });
      
      // Reset input
      setWithdrawAmounts({
        ...withdrawAmounts,
        [farmId]: ''
      });
      
      // Reload farm data after withdrawal
      await loadUserFarmData();
    } catch (error) {
      console.error('Error withdrawing tokens:', error);
      setNotification({
        type: 'error',
        message: `${ft('txError')}: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsTransacting({
        ...isTransacting,
        [farmId]: false
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  // Harvest rewards
  const handleHarvest = async (farmId: string): Promise<void> => {
    if (!isConnected || !address) return;
    
    const farm = userFarms[farmId];
    
    if (parseFloat(farm.pendingRewards) <= 0) {
      setNotification({
        type: 'error',
        message: 'No rewards to harvest'
      });
      return;
    }
    
    setIsTransacting({
      ...isTransacting,
      [farmId]: true
    });
    
    try {
      setNotification({
        type: 'loading',
        message: ft('harvesting')
      });
      
      const tx = await harvestRewards(Number(farmId));
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: Harvested ${farm.pendingRewards} AIH from ${farm.name} farm`
      });
      
      // Reload farm data after harvesting
      await loadUserFarmData();
    } catch (error) {
      console.error('Error harvesting rewards:', error);
      setNotification({
        type: 'error',
        message: `${ft('txError')}: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsTransacting({
        ...isTransacting,
        [farmId]: false
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  // Initialize farm data when the page loads or connection status changes
  useEffect(() => {
    if (isConnected && address) {
      loadUserFarmData();
    }
  }, [isConnected, address]);
  
  // Update pending rewards on a timer
  useEffect(() => {
    if (!isConnected || !address) return;
    
    // Initial update
    updatePendingRewards();
    
    // Set up interval for updates
    const interval = setInterval(() => {
      updatePendingRewards();
    }, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, address, userFarms]);

  // Notification component
  const NotificationComponent = () => {
    if (!notification) return null;
    
    let bgColor = 'bg-gray-800';
    let textColor = 'text-white';
    let icon = null;
    
    if (notification.type === 'success') {
      bgColor = 'bg-green-800';
      textColor = 'text-green-200';
      icon = (
        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    } else if (notification.type === 'error') {
      bgColor = 'bg-red-800';
      textColor = 'text-red-200';
      icon = (
        <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    } else if (notification.type === 'loading') {
      bgColor = 'bg-blue-800';
      textColor = 'text-blue-200';
      icon = (
        <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className={`${bgColor} rounded-lg p-4 flex items-center space-x-3 shadow-lg z-10 max-w-md`}>
          {icon}
          <span className={`${textColor} font-medium`}>{notification.message}</span>
          {notification.type !== 'loading' && (
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-white">{ft('farms')}</h1>
      
      {/* Farm Stats */}
      <div className="bg-dark-lighter rounded-2xl p-6 mb-8 shadow-lg border border-primary/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('totalValueLocked')}</h3>
            <p className="font-semibold text-xl text-white">
              ${isLoading ? '...' : Object.values(userFarms).reduce((acc, farm) => 
                acc + (parseFloat(farm.totalStaked) * farm.value), 0).toFixed(2)}
            </p>
          </div>
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('aihRewards')}</h3>
            <p className="font-semibold text-xl text-white">
              {isLoading ? '...' : Object.values(userFarms).reduce((acc, farm) => 
                acc + farm.dailyRewards, 0)} AIH/day
            </p>
          </div>
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('yourStakedValue')}</h3>
            <p className="font-semibold text-xl text-white">
              ${isLoading ? '...' : totalStakedValue.toFixed(2)}
            </p>
          </div>
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('pendingRewards')}</h3>
            <p className="font-semibold text-xl text-white">
              {isLoading ? '...' : totalPendingRewards.toFixed(6)} AIH
            </p>
          </div>
        </div>
      </div>
      
      {/* Wallet Warning */}
      {!isConnected && (
        <div className="text-center p-4 bg-yellow-900/20 rounded-lg mb-6">
          <p className="text-yellow-500">{ft('walletWarning')}</p>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && isConnected && (
        <div className="text-center p-4 bg-blue-900/20 rounded-lg mb-6">
          <div className="flex justify-center items-center">
            <svg className="animate-spin h-6 w-6 text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-blue-500">Loading farm data...</p>
          </div>
        </div>
      )}
      
      {/* Farms List */}
      <div className="grid grid-cols-1 gap-6">
        {Object.values(userFarms).map((farm) => (
          <div key={farm.id} className="bg-dark-lighter rounded-2xl overflow-hidden shadow-lg border border-primary/10">
            <div className="p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="relative mr-3">
                    <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      <img src={tokens[farm.tokenA]?.logo || 'https://cryptologos.cc/logos/ethereum-eth-logo.svg'} className="h-10 w-10" alt={tokens[farm.tokenA]?.symbol || 'Token A'} />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gray-700 absolute -right-3 -bottom-3 flex items-center justify-center overflow-hidden">
                      <img src={tokens[farm.tokenB]?.logo || 'https://cryptologos.cc/logos/tether-usdt-logo.svg'} className="h-10 w-10" alt={tokens[farm.tokenB]?.symbol || 'Token B'} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{farm.name}</h2>
                    <p className="text-sm text-gray-400">{farm.description}</p>
                  </div>
                </div>
                <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                  APR: {farm.apr}%
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Farm Info */}
                <div className="bg-dark-default rounded-lg p-4 border border-gray-700">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('totalStaked')}</h3>
                      <p className="font-medium text-white">
                        ${(parseFloat(farm.totalStaked) * farm.value).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('dailyRewards')}</h3>
                      <p className="font-medium text-white">{farm.dailyRewards} AIH</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('yourStake')}</h3>
                      <p className="font-medium text-white">{parseFloat(farm.userStaked).toFixed(6)} LP</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('yourPending')}</h3>
                      <p className="font-medium text-white">{parseFloat(farm.pendingRewards).toFixed(6)} AIH</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      className={`text-sm bg-green-900/30 text-green-400 px-3 py-1 rounded hover:bg-green-900/50 transition ${!isConnected || parseFloat(farm.pendingRewards) <= 0 || isTransacting[farm.id.toString()] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleHarvest(farm.id.toString())}
                      disabled={!isConnected || parseFloat(farm.pendingRewards) <= 0 || isTransacting[farm.id.toString()]}
                    >
                      {isTransacting[farm.id.toString()] ? ft('harvesting') : ft('harvest')}
                    </button>
                    <a 
                      href={`https://etherscan.io/address/${contractAddresses.farm}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      {ft('viewContract')}
                    </a>
                  </div>
                </div>
                
                {/* Stake Actions */}
                <div className="bg-dark-default rounded-lg p-4 border border-gray-700">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-white mb-2">{ft('stakeLpTokens')}</h3>
                    <div className="flex mb-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        className="w-full bg-dark-lighter border border-gray-700 rounded-l-lg px-3 py-2 text-white outline-none"
                        value={stakeAmounts[farm.id.toString()] || ''}
                        onChange={(e) => handleStakeAmountChange(farm.id.toString(), e.target.value)}
                        disabled={!isConnected || isApproving[farm.id.toString()] || isTransacting[farm.id.toString()]}
                      />
                      <button 
                        className={`bg-dark-light px-2 py-1 rounded-r-lg text-sm text-white hover:bg-dark-lightest transition ${!isConnected || isApproving[farm.id.toString()] || isTransacting[farm.id.toString()] ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleSetMaxStake(farm.id.toString())}
                        disabled={!isConnected || isApproving[farm.id.toString()] || isTransacting[farm.id.toString()]}
                      >
                        {ft('max')}
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      {isConnected ? `${ft('balance')}: ${parseFloat(farm.balance).toFixed(6)} LP` : ft('connectWallet')}
                    </div>
                    <button 
                      className={`w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white py-2 rounded-lg transition-all duration-300 ${!isConnected || isApproving[farm.id.toString()] || isTransacting[farm.id.toString()] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleStake(farm.id.toString())}
                      disabled={!isConnected || isApproving[farm.id.toString()] || isTransacting[farm.id.toString()]}
                    >
                      {isApproving[farm.id.toString()] 
                        ? ft('approving') 
                        : isTransacting[farm.id.toString()] 
                          ? ft('staking') 
                          : ft('stake')}
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-white mb-2">{ft('withdrawLpTokens')}</h3>
                    <div className="flex mb-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        className="w-full bg-dark-lighter border border-gray-700 rounded-l-lg px-3 py-2 text-white outline-none"
                        value={withdrawAmounts[farm.id.toString()] || ''}
                        onChange={(e) => handleWithdrawAmountChange(farm.id.toString(), e.target.value)}
                        disabled={!isConnected || isTransacting[farm.id.toString()]}
                      />
                      <button 
                        className={`bg-dark-light px-2 py-1 rounded-r-lg text-sm text-white hover:bg-dark-lightest transition ${!isConnected || isTransacting[farm.id.toString()] ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleSetMaxWithdraw(farm.id.toString())}
                        disabled={!isConnected || isTransacting[farm.id.toString()]}
                      >
                        {ft('max')}
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      {isConnected ? `${ft('staked')}: ${parseFloat(farm.userStaked).toFixed(6)} LP` : ft('connectWallet')}
                    </div>
                    <button 
                      className={`w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition ${!isConnected || isTransacting[farm.id.toString()] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleWithdraw(farm.id.toString())}
                      disabled={!isConnected || isTransacting[farm.id.toString()]}
                    >
                      {isTransacting[farm.id.toString()] ? ft('withdrawing') : ft('withdraw')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Notification Component */}
      {notification && <NotificationComponent />}
    </div>
  );
};

export default dynamic(() => Promise.resolve(FarmPage), { ssr: false }); 