import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';

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
  id: string;
  name: string;
  description: string;
  apr: number;
  totalStaked: number;
  dailyRewards: number;
  tokenA: string;
  tokenB: string;
  balance: number;
  staked: number;
  pendingRewards: number;
  value: number;
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

// Farm data
const farms: FarmsType = {
  'eth-aih': {
    id: 'eth-aih',
    name: 'ETH-AIH LP',
    description: 'Stake ETH-AIH LP tokens to earn AIH',
    apr: 87.5,
    totalStaked: 3200000, // $3.2M
    dailyRewards: 100, // 100 AIH per day
    tokenA: 'eth',
    tokenB: 'aih',
    balance: 10,
    staked: 0,
    pendingRewards: 0,
    value: 100 // $100 per LP token
  },
  'aih-usdt': {
    id: 'aih-usdt',
    name: 'AIH-USDT LP',
    description: 'Stake AIH-USDT LP tokens to earn AIH',
    apr: 62.3,
    totalStaked: 2000000, // $2M
    dailyRewards: 50, // 50 AIH per day
    tokenA: 'aih',
    tokenB: 'usdt',
    balance: 20,
    staked: 0,
    pendingRewards: 0,
    value: 50 // $50 per LP token
  }
};

const FarmPage = () => {
  const [userFarms, setUserFarms] = useState<FarmsType>(farms);
  const [totalStakedValue, setTotalStakedValue] = useState<number>(0);
  const [totalPendingRewards, setTotalPendingRewards] = useState<number>(0);
  const [stakeAmounts, setStakeAmounts] = useState<{[key: string]: string}>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<{[key: string]: string}>({});
  
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
      connectWallet: 'Connect Wallet'
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
      connectWallet: '连接钱包'
    }
  };
  
  // Function to get translations
  const ft = (key: keyof FarmTranslation): string => {
    const translations = farmTranslations[language] || farmTranslations.en;
    return translations[key] || key;
  };
  
  // Calculate totals
  const calculateTotals = (): void => {
    let stakedValue = 0;
    let pendingRewards = 0;
    
    Object.values(userFarms).forEach((farm) => {
      stakedValue += farm.staked * farm.value;
      pendingRewards += farm.pendingRewards;
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
      [farmId]: farm.balance.toString()
    });
  };
  
  // Set max withdraw amount
  const handleSetMaxWithdraw = (farmId: string): void => {
    if (!isConnected) return;
    
    const farm = userFarms[farmId];
    setWithdrawAmounts({
      ...withdrawAmounts,
      [farmId]: farm.staked.toString()
    });
  };
  
  // Stake LP tokens
  const handleStake = (farmId: string): void => {
    if (!isConnected) return;
    
    const amount = parseFloat(stakeAmounts[farmId] || '0');
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    const farm = userFarms[farmId];
    
    if (amount > farm.balance) {
      alert('Insufficient balance');
      return;
    }
    
    // In a real app, this would call the contract
    const updatedFarms = { ...userFarms };
    updatedFarms[farmId] = {
      ...farm,
      balance: farm.balance - amount,
      staked: farm.staked + amount,
      pendingRewards: farm.pendingRewards + (0.1 * amount) // Simulate rewards
    };
    
    setUserFarms(updatedFarms);
    setStakeAmounts({
      ...stakeAmounts,
      [farmId]: ''
    });
    
    alert(`Staked ${amount} ${farm.name} tokens`);
  };
  
  // Withdraw LP tokens
  const handleWithdraw = (farmId: string): void => {
    if (!isConnected) return;
    
    const amount = parseFloat(withdrawAmounts[farmId] || '0');
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    const farm = userFarms[farmId];
    
    if (amount > farm.staked) {
      alert('Insufficient staked amount');
      return;
    }
    
    // In a real app, this would call the contract
    const updatedFarms = { ...userFarms };
    updatedFarms[farmId] = {
      ...farm,
      balance: farm.balance + amount,
      staked: farm.staked - amount
    };
    
    // When withdrawing, also harvest pending rewards
    const harvestedAmount = farm.pendingRewards;
    updatedFarms[farmId].pendingRewards = 0;
    
    setUserFarms(updatedFarms);
    setWithdrawAmounts({
      ...withdrawAmounts,
      [farmId]: ''
    });
    
    alert(`Withdrawn ${amount} ${farm.name} tokens and harvested ${harvestedAmount.toFixed(2)} AIH`);
  };
  
  // Harvest rewards
  const handleHarvest = (farmId: string): void => {
    if (!isConnected) return;
    
    const farm = userFarms[farmId];
    
    if (farm.pendingRewards <= 0) {
      alert('No rewards to harvest');
      return;
    }
    
    // In a real app, this would call the contract
    const harvestedAmount = farm.pendingRewards;
    const updatedFarms = { ...userFarms };
    updatedFarms[farmId] = {
      ...farm,
      pendingRewards: 0
    };
    
    setUserFarms(updatedFarms);
    
    alert(`Harvested ${harvestedAmount.toFixed(2)} AIH from ${farm.name} farm`);
  };
  
  // Initialize and update totals when farms or connection status changes
  useEffect(() => {
    calculateTotals();
  }, [userFarms, isConnected]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-white">{ft('farms')}</h1>
      
      {/* Farm Stats */}
      <div className="bg-dark-lighter rounded-2xl p-6 mb-8 shadow-lg border border-primary/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('totalValueLocked')}</h3>
            <p className="font-semibold text-xl text-white">$5.2M</p>
          </div>
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('aihRewards')}</h3>
            <p className="font-semibold text-xl text-white">150 AIH/day</p>
          </div>
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('yourStakedValue')}</h3>
            <p className="font-semibold text-xl text-white">${totalStakedValue.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="text-sm text-gray-400 mb-1">{ft('pendingRewards')}</h3>
            <p className="font-semibold text-xl text-white">{totalPendingRewards.toFixed(2)} AIH</p>
          </div>
        </div>
      </div>
      
      {/* Wallet Warning */}
      {!isConnected && (
        <div className="text-center p-4 bg-yellow-900/20 rounded-lg mb-6">
          <p className="text-yellow-500">{ft('walletWarning')}</p>
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
                      <img src={tokens[farm.tokenA].logo} className="h-10 w-10" alt={tokens[farm.tokenA].symbol} />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gray-700 absolute -right-3 -bottom-3 flex items-center justify-center overflow-hidden">
                      <img src={tokens[farm.tokenB].logo} className="h-10 w-10" alt={tokens[farm.tokenB].symbol} />
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
                      <p className="font-medium text-white">${(farm.totalStaked / 1000000).toFixed(1)}M</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('dailyRewards')}</h3>
                      <p className="font-medium text-white">{farm.dailyRewards} AIH</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('yourStake')}</h3>
                      <p className="font-medium text-white">{farm.staked.toFixed(2)} LP</p>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-400 mb-1">{ft('yourPending')}</h3>
                      <p className="font-medium text-white">{farm.pendingRewards.toFixed(2)} AIH</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      className={`text-sm bg-green-900/30 text-green-400 px-3 py-1 rounded hover:bg-green-900/50 transition ${!isConnected || farm.pendingRewards <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleHarvest(farm.id)}
                      disabled={!isConnected || farm.pendingRewards <= 0}
                    >
                      {ft('harvest')}
                    </button>
                    <a 
                      href="https://etherscan.io" 
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
                        value={stakeAmounts[farm.id] || ''}
                        onChange={(e) => handleStakeAmountChange(farm.id, e.target.value)}
                        disabled={!isConnected}
                      />
                      <button 
                        className={`bg-dark-light px-2 py-1 rounded-r-lg text-sm text-white hover:bg-dark-lightest transition ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleSetMaxStake(farm.id)}
                        disabled={!isConnected}
                      >
                        {ft('max')}
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      {isConnected ? `${ft('balance')}: ${farm.balance.toFixed(2)} LP` : ft('connectWallet')}
                    </div>
                    <button 
                      className={`w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white py-2 rounded-lg transition-all duration-300 ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleStake(farm.id)}
                      disabled={!isConnected}
                    >
                      {ft('stake')}
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-white mb-2">{ft('withdrawLpTokens')}</h3>
                    <div className="flex mb-2">
                      <input
                        type="number"
                        placeholder="0.0"
                        className="w-full bg-dark-lighter border border-gray-700 rounded-l-lg px-3 py-2 text-white outline-none"
                        value={withdrawAmounts[farm.id] || ''}
                        onChange={(e) => handleWithdrawAmountChange(farm.id, e.target.value)}
                        disabled={!isConnected}
                      />
                      <button 
                        className={`bg-dark-light px-2 py-1 rounded-r-lg text-sm text-white hover:bg-dark-lightest transition ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleSetMaxWithdraw(farm.id)}
                        disabled={!isConnected}
                      >
                        {ft('max')}
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      {isConnected ? `${ft('staked')}: ${farm.staked.toFixed(2)} LP` : ft('connectWallet')}
                    </div>
                    <button 
                      className={`w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleWithdraw(farm.id)}
                      disabled={!isConnected}
                    >
                      {ft('withdraw')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FarmPage; 