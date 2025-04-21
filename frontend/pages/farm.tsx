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
  getPendingRewards,
  addPool,
  updatePoolAllocation,
  setRewardRate,
  emergencyWithdraw,
  getUserInfo,
  getPoolInfo
} from '@/utils/farmContracts';
import { getTokenBalance, approveLPToken, getUserLiquidityPositions, getTokenContract, getRouterContract } from '@/utils/contracts';
import { ethers } from 'ethers';
import { contractAddresses } from '@/constants/addresses';
import { farmABI as FarmAbi, erc20ABI as IERC20Abi } from '@/constants/abis';

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
  adminPanel: string;
  adminPanelDesc: string;
  addPool: string;
  lpTokenAddress: string;
  allocPoints: string;
  add: string;
  updatePool: string;
  poolId: string;
  poolIdHelp: string;
  allocPointsHelp: string;
  update: string;
  rewardSettings: string;
  aihPerSecond: string;
  aihPerSecondHelp: string;
  setRate: string;
  adminActions: string;
  processing: string;
  farmManagement: string;
  rewardManagement: string;
  invalidAddress: string;
  poolIdInvalid: string;
  allocPointsInvalid: string;
  aihRateInvalid: string;
  aihPerDay: string;
  ownerOnly: string;
  checkPoolId: string;
  poolExists: string;
  poolNotFound: string;
  checking: string;
  emergencyWithdraw: string;
  emergencyWithdrawing: string;
  emergencyWarning: string;
  walletConnectRequired: string;
  noStakedLp: string;
  withdrawSuccess: string;
  transactionFailed: string;
  invalidAmount: string;
  insufficientBalance: string;
  insufficientStaked: string;
  noRewards: string;
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

// Helper function to get pair name from LP token address
const getPairNameFromAddress = async (lpTokenAddress: string): Promise<any> => {
  try {
    if (!lpTokenAddress || lpTokenAddress === ethers.constants.AddressZero) {
      return null;
    }
    
    // Try to get the token info
    const lpToken = getTokenContract(lpTokenAddress);
    let name = '';
    
    try {
      name = await lpToken.name();
    } catch (error) {
      console.error('Error getting LP token name:', error);
      name = 'Unknown Pair';
    }
    
    let token0Address, token1Address, token0, token1;
    
    try {
      // These calls might fail if the LP token doesn't have these methods
      token0Address = await lpToken.token0();
      token1Address = await lpToken.token1();
      
      // Get token symbols
      token0 = getTokenContract(token0Address);
      token1 = getTokenContract(token1Address);
      
      const token0Symbol = await token0.symbol();
      const token1Symbol = await token1.symbol();
      
      return {
        name: `${token0Symbol}-${token1Symbol}`,
        token0: token0Address,
        token1: token1Address,
        token0Symbol,
        token1Symbol,
        valuePerLp: 50, // Placeholder value
        balance: await getTokenBalance(lpTokenAddress, window.ethereum.selectedAddress)
      };
    } catch (error) {
      console.error('Error getting token info from LP token:', error);
      
      // Fallback: just use the LP token name
      return {
        name: name || `LP Token`,
        token0: ethers.constants.AddressZero,
        token1: ethers.constants.AddressZero,
        token0Symbol: 'Unknown',
        token1Symbol: 'Unknown',
        valuePerLp: 50, // Placeholder value
        balance: await getTokenBalance(lpTokenAddress, window.ethereum.selectedAddress)
      };
    }
  } catch (error) {
    console.error(`Error getting pair name from address ${lpTokenAddress}:`, error);
    return null;
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
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [newPoolLpToken, setNewPoolLpToken] = useState<string>('');
  const [newPoolAllocPoints, setNewPoolAllocPoints] = useState<number>(100);
  const [updatePoolId, setUpdatePoolId] = useState<number>(0);
  const [updateAllocPoints, setUpdateAllocPoints] = useState<number>(100);
  const [aihPerSecond, setAihPerSecond] = useState<string>('10000000000000000'); // 0.01 ETH in wei
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isEmergencyWithdrawing, setIsEmergencyWithdrawing] = useState<boolean>(false);
  
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
      txSuccess: 'Transaction successful',
      adminPanel: 'Admin Panel',
      adminPanelDesc: 'Manage farm pools and rewards',
      addPool: 'Add New Pool',
      lpTokenAddress: 'LP Token Address',
      allocPoints: 'Allocation Points',
      add: 'Add',
      updatePool: 'Update Pool',
      poolId: 'Pool ID',
      poolIdHelp: 'The ID of the pool to update (starting from 0)',
      allocPointsHelp: 'Higher allocation points give more rewards to the pool',
      update: 'Update',
      rewardSettings: 'Reward Settings',
      aihPerSecond: 'AIH Per Second',
      aihPerSecondHelp: 'Amount of AIH tokens distributed per second across all pools',
      setRate: 'Set Rate',
      adminActions: 'Admin Actions',
      processing: 'Processing...',
      farmManagement: 'Farm Management',
      rewardManagement: 'Reward Management',
      invalidAddress: 'Invalid address format',
      poolIdInvalid: 'Pool ID must be a non-negative number',
      allocPointsInvalid: 'Allocation points must be a positive number',
      aihRateInvalid: 'AIH rate must be a positive number',
      aihPerDay: 'AIH Per Day',
      ownerOnly: 'Owner Only',
      checkPoolId: 'Check if pool exists',
      poolExists: 'Pool exists',
      poolNotFound: 'Pool not found',
      checking: 'Checking...',
      emergencyWithdraw: 'Emergency Withdraw',
      emergencyWithdrawing: 'Processing emergency withdrawal...',
      emergencyWarning: 'Warning: Emergency withdrawal forfeits any pending rewards. Continue?',
      walletConnectRequired: 'Please connect your wallet',
      noStakedLp: 'No LP tokens to withdraw',
      withdrawSuccess: 'Successfully withdrawn LP tokens',
      transactionFailed: 'Transaction failed',
      invalidAmount: 'Please enter a valid amount',
      insufficientBalance: 'Insufficient balance',
      insufficientStaked: 'Insufficient staked amount',
      noRewards: 'No rewards to harvest'
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
      txSuccess: '交易成功',
      adminPanel: '管理员面板',
      adminPanelDesc: '管理农场池和奖励',
      addPool: '添加新池',
      lpTokenAddress: 'LP 代币地址',
      allocPoints: '分配点数',
      add: '添加',
      updatePool: '更新池',
      poolId: '池 ID',
      poolIdHelp: '要更新的池的ID（从0开始）',
      allocPointsHelp: '更高的分配点数会给池子更多的奖励',
      update: '更新',
      rewardSettings: '奖励设置',
      aihPerSecond: '每秒 AIH',
      aihPerSecondHelp: '在所有池中每秒分配的AIH代币数量',
      setRate: '设置比率',
      adminActions: '管理员操作',
      processing: '处理中...',
      farmManagement: '农场管理',
      rewardManagement: '奖励管理',
      invalidAddress: '地址格式无效',
      poolIdInvalid: '池ID必须是非负数',
      allocPointsInvalid: '分配点数必须是正数',
      aihRateInvalid: 'AIH比率必须是正数',
      aihPerDay: '每天AIH',
      ownerOnly: '仅限所有者',
      checkPoolId: '检查池是否存在',
      poolExists: '池存在',
      poolNotFound: '未找到池',
      checking: '检查中...',
      emergencyWithdraw: '紧急提取',
      emergencyWithdrawing: '正在处理紧急提款...',
      emergencyWarning: '警告：紧急提款将放弃所有待领取奖励。是否继续？',
      walletConnectRequired: '请连接您的钱包',
      noStakedLp: '没有可提取的LP代币',
      withdrawSuccess: '成功提取LP代币',
      transactionFailed: '交易失败',
      invalidAmount: '请输入有效金额',
      insufficientBalance: '余额不足',
      insufficientStaked: '质押数量不足',
      noRewards: '没有可收获的奖励'
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
      
      const updatedFarms: FarmsType = {};
      
      if (pools.length === 0) {
        console.log("No pools found in farm contract, getting user's liquidity positions...");
        
        // Get user's actual liquidity positions
        const userPositions = await getUserLiquidityPositions(address, []);
        console.log("User positions:", userPositions);
        
        if (userPositions.length === 0) {
          setNotification({
            type: 'info',
            message: 'No farm pools or liquidity positions found. Please add liquidity first.'
          });
          
          setTimeout(() => {
            setNotification(null);
          }, 5000);
          
          setIsLoading(false);
          return;
        }
        
        // Use user's liquidity positions as potential farm pools
        for (let i = 0; i < userPositions.length; i++) {
          const position = userPositions[i];
          const pairAddress = position.pairAddress;
          const tokenSymbols = position.name.split('-');
          
          if (tokenSymbols.length === 2) {
            updatedFarms[`lp-${i}`] = {
              id: i,
              name: position.name,
              description: `${position.name} LP Token Farm`,
              apr: 0, // Set APR to 0 initially
              totalStaked: '0',
              dailyRewards: 0,
              lpToken: pairAddress,
              tokenA: tokenSymbols[0].toLowerCase(),
              tokenB: tokenSymbols[1].toLowerCase(),
              balance: position.balance,
              userStaked: '0',
              pendingRewards: '0',
              value: parseFloat(position.value) || 0,
              pairAddress: pairAddress
            };
          }
        }
      } else {
        // Process pools from the farm contract
        for (let i = 0; i < pools.length; i++) {
          const poolInfo = pools[i];
          const lpToken = poolInfo.lpToken;
          
          // Get user info for this pool
          const userInfo = await getUserInfo(i, address);
          
          // Get pair name and tokens
          let pairName = `Pool ${i}`;
          let tokenA = 'token1';
          let tokenB = 'token2';
          let value = 0;
          let balance = '0';
          let pairAddress = lpToken;
          
          try {
            // Try to get the pair name from the router
            const pairInfo = await getPairNameFromAddress(lpToken);
            if (pairInfo) {
              pairName = pairInfo.name;
              tokenA = pairInfo.token0.toLowerCase();
              tokenB = pairInfo.token1.toLowerCase();
              value = pairInfo.valuePerLp || 0;
              balance = pairInfo.balance || '0';
            }
          } catch (error) {
            console.error(`Error getting pair name for LP token ${lpToken}:`, error);
          }
          
          // Get pending rewards
          const pendingRewards = await getPendingRewards(i, address);
          
          // Calculate daily rewards based on allocation points
          const dailySecondsFactor = 86400; // seconds in a day
          const rawRewardRate = parseFloat(ethers.utils.formatEther(poolInfo.rewardRate || '0'));
          const dailyRewards = rawRewardRate * dailySecondsFactor;
          
          // Calculate APR (very simplified)
          let apr = 0;
          
          if (parseFloat(poolInfo.totalStaked) > 0 && value > 0) {
            const yearlyRewards = dailyRewards * 365;
            const stakedValue = parseFloat(poolInfo.totalStaked) * value;
            apr = (yearlyRewards / stakedValue) * 100;
          }
          
          updatedFarms[`pool-${i}`] = {
            id: i,
            name: pairName,
            description: `${pairName} LP Token Farm`,
            apr: apr,
            totalStaked: poolInfo.totalStaked,
            dailyRewards: dailyRewards,
            lpToken: lpToken,
            tokenA: tokenA,
            tokenB: tokenB,
            balance: balance,
            userStaked: userInfo.amount,
            pendingRewards: pendingRewards,
            value: value,
            pairAddress: pairAddress
          };
        }
      }
      
      setUserFarms(updatedFarms);
      calculateTotals(updatedFarms);
      
      // Check if user is admin
      try {
        const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
        const farmInstance = new ethers.Contract(
          contractAddresses.farm,
          FarmAbi,
          signer
        );
        
        const owner = await farmInstance.owner();
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.error('Error checking if user is admin:', error);
      }
    } catch (error) {
      console.error('Error loading farm data:', error);
      setNotification({
        type: 'error',
        message: `Error loading farm data: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
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
  
  // Approve tokens for staking
  const handleApprove = async (farmId: string): Promise<boolean> => {
    if (!isConnected || !address) {
      setNotification({
        type: 'error',
        message: ft('walletConnectRequired')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return false;
    }
    
    const farm = userFarms[farmId];
    const amount = stakeAmounts[farmId];
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: ft('invalidAmount')
      });
      
      setTimeout(() => setNotification(null), 5000);
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
      
      // Get LP token contract
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const lpTokenContract = new ethers.Contract(
        farm.lpToken,
        IERC20Abi,
        signer
      );
      
      // Check allowance
      const allowance = await lpTokenContract.allowance(address, contractAddresses.farm);
      
      // If not approved, approve tokens
      if (allowance.lt(ethers.utils.parseEther(amount))) {
        const approveTx = await lpTokenContract.approve(
          contractAddresses.farm,
          ethers.constants.MaxUint256
        );
        
        await approveTx.wait();
        
        setNotification({
          type: 'success',
          message: `${ft('txSuccess')}: Approved ${farm.name} tokens`
        });
        
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({
          type: 'success',
          message: `${farm.name} tokens already approved`
        });
        
        setTimeout(() => setNotification(null), 5000);
      }
      
      return true;
    } catch (error) {
      console.error('Error approving tokens:', error);
      setNotification({
        type: 'error',
        message: `${ft('txError')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
      return false;
    } finally {
      setIsApproving({
        ...isApproving,
        [farmId]: false
      });
    }
  };
  
  // Stake LP tokens
  const handleStake = async (farmId: string): Promise<void> => {
    if (!isConnected || !address) {
      setNotification({
        type: 'error',
        message: ft('walletConnectRequired')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    const farm = userFarms[farmId];
    const amount = stakeAmounts[farmId];
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: ft('invalidAmount')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    if (parseFloat(amount) > parseFloat(farm.balance)) {
      setNotification({
        type: 'error',
        message: ft('insufficientBalance')
      });
      
      setTimeout(() => setNotification(null), 5000);
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
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error staking tokens:', error);
      setNotification({
        type: 'error',
        message: `${ft('txError')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsTransacting({
        ...isTransacting,
        [farmId]: false
      });
    }
  };
  
  // Withdraw LP tokens
  const handleWithdraw = async (farmId: string): Promise<void> => {
    if (!isConnected || !address) {
      setNotification({
        type: 'error',
        message: ft('walletConnectRequired')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    const farm = userFarms[farmId];
    const amount = withdrawAmounts[farmId];
    
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: ft('invalidAmount')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    if (parseFloat(amount) > parseFloat(farm.userStaked)) {
      setNotification({
        type: 'error',
        message: ft('insufficientStaked')
      });
      
      setTimeout(() => setNotification(null), 5000);
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
        message: `${ft('withdrawSuccess')}: ${amount} ${farm.name} tokens`
      });
      
      // Reset input
      setWithdrawAmounts({
        ...withdrawAmounts,
        [farmId]: ''
      });
      
      // Reload farm data after withdrawal
      await loadUserFarmData();
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error withdrawing tokens:', error);
      setNotification({
        type: 'error',
        message: `${ft('transactionFailed')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsTransacting({
        ...isTransacting,
        [farmId]: false
      });
    }
  };
  
  // Harvest rewards
  const handleHarvest = async (farmId: string): Promise<void> => {
    if (!isConnected || !address) {
      setNotification({
        type: 'error',
        message: ft('walletConnectRequired')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    const farm = userFarms[farmId];
    
    if (parseFloat(farm.pendingRewards) <= 0) {
      setNotification({
        type: 'error',
        message: ft('noRewards')
      });
      
      setTimeout(() => setNotification(null), 5000);
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
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error harvesting rewards:', error);
      setNotification({
        type: 'error',
        message: `${ft('transactionFailed')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsTransacting({
        ...isTransacting,
        [farmId]: false
      });
    }
  };
  
  // Check if connected wallet is admin
  useEffect(() => {
    if (isConnected && address) {
      // For demo purposes, we'll hard-code an admin address
      // In production, you should implement a proper admin check from the contract
      const adminAddresses = [
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Default Hardhat account #0
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Default Hardhat account #1
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906',  // Default Hardhat account #2
        address // For testing - remove this in production!
      ];
      
      setIsAdmin(adminAddresses.map(a => a.toLowerCase()).includes(address.toLowerCase()));
    } else {
      setIsAdmin(false);
    }
  }, [isConnected, address]);
  
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
    } else if (notification.type === 'info') {
      bgColor = 'bg-blue-900';
      textColor = 'text-blue-200';
      icon = (
        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  // Handle adding a new pool
  const handleAddPool = async () => {
    if (!isAdmin || !isConnected) {
    if (!isConnected) {
        setNotification({
          type: 'error',
          message: ft('walletConnectRequired')
        });
      } else {
        setNotification({
          type: 'error',
          message: ft('ownerOnly')
        });
      }
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    // Validate LP token address
    if (!ethers.utils.isAddress(newPoolLpToken)) {
      setNotification({
        type: 'error',
        message: ft('invalidAddress')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    // Validate allocation points
    if (newPoolAllocPoints <= 0) {
      setNotification({
        type: 'error',
        message: ft('allocPointsInvalid')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      setNotification({
        type: 'loading',
        message: ft('processing')
      });
      
      const tx = await addPool(newPoolLpToken, newPoolAllocPoints);
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: ${ft('addPool')}`
      });
      
      // Reset inputs
      setNewPoolLpToken('');
      setNewPoolAllocPoints(100);
      
      // Reload farm data
      await loadUserFarmData();
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error adding pool:', error);
      setNotification({
        type: 'error',
        message: `${ft('transactionFailed')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle updating pool allocation
  const handleUpdatePool = async () => {
    if (!isAdmin || !isConnected) {
  if (!isConnected) {
        setNotification({
          type: 'error',
          message: ft('walletConnectRequired')
        });
      } else {
        setNotification({
          type: 'error',
          message: ft('ownerOnly')
        });
      }
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    // Validate pool ID
    if (updatePoolId < 0) {
      setNotification({
        type: 'error',
        message: ft('poolIdInvalid')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    // Validate allocation points
    if (updateAllocPoints < 0) {
      setNotification({
        type: 'error',
        message: ft('allocPointsInvalid')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      setNotification({
        type: 'loading',
        message: ft('processing')
      });
      
      const tx = await updatePoolAllocation(updatePoolId, updateAllocPoints);
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: ${ft('updatePool')}`
      });
      
      // Reload farm data
      await loadUserFarmData();
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error updating pool:', error);
      setNotification({
        type: 'error',
        message: `${ft('transactionFailed')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle setting reward rate
  const handleSetRewardRate = async () => {
    if (!isAdmin || !isConnected) {
      if (!isConnected) {
        setNotification({
          type: 'error',
          message: ft('walletConnectRequired')
        });
      } else {
        setNotification({
          type: 'error',
          message: ft('ownerOnly')
        });
      }
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    // Validate AIH per second
    if (parseFloat(aihPerSecond) <= 0) {
      setNotification({
        type: 'error',
        message: ft('aihRateInvalid')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      setNotification({
        type: 'loading',
        message: ft('processing')
      });
      
      const tx = await setRewardRate(aihPerSecond);
      await tx.wait();
      
      setNotification({
        type: 'success',
        message: `${ft('txSuccess')}: ${ft('rewardSettings')}`
      });
      
      // Reload farm data
      await loadUserFarmData();
      
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error setting reward rate:', error);
      setNotification({
        type: 'error',
        message: `${ft('transactionFailed')}: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle emergency withdraw
  const handleEmergencyWithdraw = async (poolId: string) => {
    if (!isConnected || !address) {
      setNotification({
        type: 'error',
        message: ft('walletConnectRequired')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    const farm = userFarms[poolId];
    
    if (parseFloat(farm.userStaked) <= 0) {
      setNotification({
        type: 'error',
        message: ft('noStakedLp')
      });
      
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    if (window.confirm(ft('emergencyWarning'))) {
      setIsEmergencyWithdrawing(true);
      setIsTransacting({
        ...isTransacting,
        [poolId]: true
      });
      
      try {
        setNotification({
          type: 'loading',
          message: ft('emergencyWithdrawing')
        });
        
        const tx = await emergencyWithdraw(Number(poolId));
        await tx.wait();
        
        setNotification({
          type: 'success',
          message: ft('withdrawSuccess')
        });
        
        // Reload farm data
        await loadUserFarmData();
        
        setTimeout(() => setNotification(null), 5000);
      } catch (error) {
        console.error('Error emergency withdrawing:', error);
        setNotification({
          type: 'error',
          message: `${ft('transactionFailed')}: ${error instanceof Error ? error.message : String(error)}`
        });
        
        setTimeout(() => setNotification(null), 5000);
      } finally {
        setIsEmergencyWithdrawing(false);
        setIsTransacting({
          ...isTransacting,
          [poolId]: false
        });
      }
    }
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
      
      {/* Admin Panel */}
      {isAdmin && (
        <div className="bg-dark-lighter rounded-2xl p-6 mb-8 shadow-lg border border-primary/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{ft('adminPanel')}</h2>
              <p className="text-sm text-gray-400">{ft('adminPanelDesc')}</p>
            </div>
            <div className="bg-red-800/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
              {ft('ownerOnly')}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Farm Management Section */}
            <div className="bg-dark-default rounded-lg p-5 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4 border-b border-gray-700 pb-2">
                {ft('farmManagement')}
              </h3>
              
              {/* Add Pool */}
              <div className="mb-6 bg-dark-lighter p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-3">{ft('addPool')}</h4>
                
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">{ft('lpTokenAddress')}</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className={`w-full bg-dark-default border ${!newPoolLpToken || ethers.utils.isAddress(newPoolLpToken) ? 'border-gray-700' : 'border-red-500'} rounded-lg px-3 py-2 text-white outline-none focus:border-primary transition-colors`}
                    value={newPoolLpToken}
                    onChange={(e) => setNewPoolLpToken(e.target.value)}
                    disabled={isProcessing}
                  />
                  {newPoolLpToken && !ethers.utils.isAddress(newPoolLpToken) && 
                    <p className="text-xs text-red-500 mt-1">{ft('invalidAddress')}</p>
                  }
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">{ft('allocPoints')}</label>
                  <input
                    type="number"
                    placeholder="100"
                    className={`w-full bg-dark-default border ${newPoolAllocPoints > 0 ? 'border-gray-700' : 'border-red-500'} rounded-lg px-3 py-2 text-white outline-none focus:border-primary transition-colors`}
                    value={newPoolAllocPoints}
                    onChange={(e) => setNewPoolAllocPoints(parseInt(e.target.value) || 0)}
                    disabled={isProcessing}
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">{ft('allocPointsHelp')}</p>
                </div>
                
                <button 
                  className={`w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white py-2 rounded-lg transition-all duration-300 ${(isProcessing || !ethers.utils.isAddress(newPoolLpToken) || newPoolAllocPoints <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleAddPool}
                  disabled={isProcessing || !ethers.utils.isAddress(newPoolLpToken) || newPoolAllocPoints <= 0}
                >
                  {isProcessing ? ft('processing') : ft('add')}
                </button>
              </div>
              
              {/* Update Pool */}
              <div className="bg-dark-lighter p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-3">{ft('updatePool')}</h4>
                
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">{ft('poolId')}</label>
                  <input
                    type="number"
                    placeholder="0"
                    className={`w-full bg-dark-default border ${updatePoolId >= 0 ? 'border-gray-700' : 'border-red-500'} rounded-lg px-3 py-2 text-white outline-none focus:border-primary transition-colors`}
                    value={updatePoolId}
                    onChange={(e) => setUpdatePoolId(parseInt(e.target.value) || 0)}
                    disabled={isProcessing}
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{ft('poolIdHelp')}</p>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">{ft('allocPoints')}</label>
                  <input
                    type="number"
                    placeholder="100"
                    className={`w-full bg-dark-default border ${updateAllocPoints >= 0 ? 'border-gray-700' : 'border-red-500'} rounded-lg px-3 py-2 text-white outline-none focus:border-primary transition-colors`}
                    value={updateAllocPoints}
                    onChange={(e) => setUpdateAllocPoints(parseInt(e.target.value) || 0)}
                    disabled={isProcessing}
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{ft('allocPointsHelp')}</p>
                </div>
                
                <button 
                  className={`w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white py-2 rounded-lg transition-all duration-300 ${(isProcessing || updatePoolId < 0 || updateAllocPoints < 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleUpdatePool}
                  disabled={isProcessing || updatePoolId < 0 || updateAllocPoints < 0}
                >
                  {isProcessing ? ft('processing') : ft('update')}
                </button>
              </div>
            </div>
            
            {/* Reward Management Section */}
            <div className="bg-dark-default rounded-lg p-5 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4 border-b border-gray-700 pb-2">
                {ft('rewardManagement')}
              </h3>
              
              {/* Reward Settings */}
              <div className="bg-dark-lighter p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-white mb-3">{ft('rewardSettings')}</h4>
                
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">{ft('aihPerSecond')}</label>
                  <input
                    type="text"
                    placeholder="10000000000000000"
                    className={`w-full bg-dark-default border ${parseFloat(aihPerSecond) > 0 ? 'border-gray-700' : 'border-red-500'} rounded-lg px-3 py-2 text-white outline-none focus:border-primary transition-colors`}
                    value={aihPerSecond}
                    onChange={(e) => setAihPerSecond(e.target.value)}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-gray-500 mt-1">{ft('aihPerSecondHelp')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3 bg-dark-default p-3 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-400">{ft('aihPerSecond')}</p>
                    <p className="text-white font-medium">{ethers.utils.formatUnits(aihPerSecond || '0', 18)} AIH</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{ft('aihPerDay')}</p>
                    <p className="text-white font-medium">
                      {(parseFloat(ethers.utils.formatUnits(aihPerSecond || '0', 18)) * 86400).toFixed(2)} AIH
                    </p>
                  </div>
                </div>
                
                <button 
                  className={`w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white py-2 rounded-lg transition-all duration-300 ${(isProcessing || parseFloat(aihPerSecond) <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleSetRewardRate}
                  disabled={isProcessing || parseFloat(aihPerSecond) <= 0}
                >
                  {isProcessing ? ft('processing') : ft('setRate')}
                </button>
              </div>
              
              {/* Current Farm Statistics */}
              <div className="bg-dark-lighter p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-3">Farm Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-default p-3 rounded-lg">
                    <p className="text-xs text-gray-400">Total Pools</p>
                    <p className="text-white font-medium">{Object.keys(userFarms).length}</p>
                  </div>
                  <div className="bg-dark-default p-3 rounded-lg">
                    <p className="text-xs text-gray-400">Total Staked Value</p>
                    <p className="text-white font-medium">
                      ${Object.values(userFarms).reduce((acc, farm) => 
                      acc + (parseFloat(farm.totalStaked) * farm.value), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                      onClick={() => handleEmergencyWithdraw(farm.id.toString())}
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