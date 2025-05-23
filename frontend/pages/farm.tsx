// 在文件顶部声明全局变量类型
declare global {
  interface Window {
    harvestCancelled?: boolean;
    _originalEthereumRequest?: any;
    _lastTransactionTime?: number;
    ethereum?: {
      isMetaMask?: boolean;
      selectedAddress?: string;
      chainId?: string;
      isConnected?: () => boolean;
      request: (args: { method: string; params?: any }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { 
  getFarmContract, 
  getUserFarmPositions, 
  approveLPTokenForFarm,
  deposit,
  withdraw,
  harvest,
  getPoolCount,
  getPoolInfo,
  getPoolAPR,
  addLpTokenToFarm,
  isFarmOwner,
  isLpTokenInFarm,
  updatePoolAllocPoints,
  getPendingRewards,
  calculateTotalAllocPoint
} from '@/utils/contracts/farm';
import { getTokenBalance, getTokenSymbol, getTokenName } from '@/utils/contracts/erc20';
import { ethers } from 'ethers';
import { FARM_ADDRESS } from '@/constants/addresses';
import { farmABI } from '@/constants/abis';
import { TokenSymbol } from '@/utils/priceSimulation';
import { usePriceSimulation } from '@/hooks/usePriceSimulation';
import PriceCarousel from '@/components/PriceCarousel';
import styles from '@/styles/farm.module.css';

// Define interfaces
// 定义接口
interface FarmTranslation {
  farm: string;
  staking: string;
  harvest: string;
  deposit: string;
  withdraw: string;
  balance: string;
  connectWallet: string;
  apr: string;
  pendingRewards: string;
  stakedAmount: string;
  totalStaked: string;
  earnedRewards: string;
  walletBalance: string;
  walletWarning: string;
  availablePools: string;
  yourFarms: string;
  noPositions: string;
  approving: string;
  depositing: string;
  withdrawing: string;
  harvesting: string;
  approved: string;
  approve: string;
  depositSuccess: string;
  withdrawSuccess: string;
  harvestSuccess: string;
  approveError: string;
  depositError: string;
  withdrawError: string;
  harvestError: string;
  max: string;
  refresh: string;
  sortBy: string;
  sortApr: string;
  sortTotalStaked: string;
  sortYourStake: string;
  sortPendingRewards: string;
  sortAsc: string;
  sortDesc: string;
  filter: string;
  filterAll: string;
  filterStakedOnly: string;
  loading: string;
  loadingPools: string;
  noPoolsFound: string;
  // Admin panel translations
  adminManagePools: string;
  lpTokenAddress: string;
  checkStatus: string;
  allocPoints: string;
  statusInFarm: string;
  statusNotInFarm: string;
  alreadyInFarm: string;
  active: string;
  disabled: string;
  updatePool: string;
  updating: string;
  disablePool: string;
  disabling: string;
  addLpToken: string;
  adding: string;
  adminNote1: string;
  adminNote2: string;
  adminNote3: string;
  cancel: string;
  estimatedShare: string;
  currentTotalPoints: string;
}

interface FarmTranslationsType {
  en: FarmTranslation;
  zh: FarmTranslation;
  [key: string]: FarmTranslation;
}

// Farm Pool interface for display
// 农场池接口，用于显示
interface FarmPool {
  pid: number;
  lpToken: string;
  lpTokenName: string;
  lpTokenSymbol: string;
  apr: number;
  isLoadingAPR?: boolean;
  totalStaked: string;
  userBalance: string;
  userStaked: string;
  pendingRewards: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  allocPoint: number;
  isActive: boolean;
}

// Define farm pools with the provided LP tokens
// 使用提供的LP代币定义农场池
const predefinedPools = [
  {
    lpToken: "0x86AfD9C00F6f70dd3d0a32ae405CC4d1AB3EAFb1",
    lpTokenName: "FHBI-TD LP Token",
    lpTokenSymbol: "FHBI-TDLP",
    tokenASymbol: "FHBI",
    tokenBSymbol: "TD"
  }
];

// Record for LP token lookup
// LP代币查询的记录
const lpTokenDetails: Record<string, { name: string, symbol: string, tokenA: string, tokenB: string }> = {};
predefinedPools.forEach(pool => {
  lpTokenDetails[pool.lpToken.toLowerCase()] = {
    name: pool.lpTokenName,
    symbol: pool.lpTokenSymbol,
    tokenA: pool.tokenASymbol,
    tokenB: pool.tokenBSymbol
  };
});

// Notification type
// 通知类型
type NotificationType = 'success' | 'error' | 'loading' | 'info' | null;

// 筛选和排序选项类型
// Filter and sort options types
type SortOption = 'apr' | 'totalStaked' | 'userStaked' | 'pendingRewards';
type FilterOption = 'all' | 'stakedOnly';

// Farm Page Component
// 农场页面组件
const FarmPage = () => {
  // State variables
  // 状态变量
  const [farmPools, setFarmPools] = useState<FarmPool[]>([]);
  const [userFarmPositions, setUserFarmPositions] = useState<FarmPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<FarmPool | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'available' | 'your-farms'>('available');
  const [mounted, setMounted] = useState<boolean>(false);
  
  // Notification state
  // 通知状态
  const [notification, setNotification] = useState<{
    type: NotificationType;
    message: string;
  } | null>(null);
  
  // Admin state variables
  // 管理员状态变量
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [newLpToken, setNewLpToken] = useState<string>('');
  const [allocPoint, setAllocPoint] = useState<string>('100');
  const [isAddingPool, setIsAddingPool] = useState<boolean>(false);
  const [isUpdatingPool, setIsUpdatingPool] = useState<boolean>(false);
  const [isDeletingPool, setIsDeletingPool] = useState<boolean>(false);
  const [lpTokenStatus, setLpTokenStatus] = useState<{
    checked: boolean;
    isInFarm: boolean;
    poolId?: number;
    allocPoint?: number;
  }>({ checked: false, isInFarm: false });
  const [totalAllocPoints, setTotalAllocPoints] = useState<number>(0);
  const [estimatedRewardShare, setEstimatedRewardShare] = useState<string>('0');
  
  // Get account and language from hooks
  // 从钩子获取账户和语言
  const { address, isConnected } = useAccount();
  const { language } = useLanguage();
  
  // Use the price simulation hook
  // 使用价格模拟钩子
  const [aprUpdateTimer, setAprUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  const { prices: tokenPrices, prevPrices } = usePriceSimulation((newPrices) => {
    // This callback runs when prices update - add debounce to prevent too frequent updates
    console.log("Price update detected, will refresh APRs with debounce");
    
    // Clear any existing timer
    if (aprUpdateTimer) {
      clearTimeout(aprUpdateTimer);
    }
    
    // Set a new timer with 1000ms delay
    const timer = setTimeout(() => {
      console.log("Debounced APR refresh with prices:", newPrices);
      refreshPoolAPRs();
    }, 1000);
    
    setAprUpdateTimer(timer);
  });
  
  // Translations for the farm page
  // 农场页面的翻译
  const farmTranslations: FarmTranslationsType = {
    en: {
      farm: 'Farm',
      staking: 'Staking',
      harvest: 'Harvest',
      deposit: 'Deposit',
      withdraw: 'Withdraw',
      balance: 'Balance',
      connectWallet: 'Connect Wallet',
      apr: 'APR',
      pendingRewards: 'Pending Rewards',
      stakedAmount: 'Staked Amount',
      totalStaked: 'Total Staked',
      earnedRewards: 'Earned Rewards',
      walletBalance: 'Wallet Balance',
      walletWarning: 'Please connect your wallet to use farm',
      availablePools: 'Available Pools',
      yourFarms: 'Your Farms',
      noPositions: 'No farming positions found',
      approving: 'Approving...',
      depositing: 'Depositing...',
      withdrawing: 'Withdrawing...',
      harvesting: 'Harvesting...',
      approved: 'Token approved successfully',
      approve: 'Approve',
      depositSuccess: 'Deposit successful',
      withdrawSuccess: 'Withdraw successful',
      harvestSuccess: 'Harvest successful',
      approveError: 'Approval failed',
      depositError: 'Deposit failed',
      withdrawError: 'Withdraw failed',
      harvestError: 'Harvest failed',
      max: 'MAX',
      refresh: 'Refresh',
      sortBy: 'Sort by',
      sortApr: 'APR',
      sortTotalStaked: 'Total Staked',
      sortYourStake: 'Your Stake',
      sortPendingRewards: 'Pending Rewards',
      sortAsc: '↑ Asc',
      sortDesc: '↓ Desc',
      filter: 'Filter',
      filterAll: 'All Pools',
      filterStakedOnly: 'Staked Only',
      loading: 'Loading...',
      loadingPools: 'Loading pools...',
      noPoolsFound: 'No pools found matching your filters',
      // Admin panel translations
      adminManagePools: 'Admin: Manage Farm Pools',
      lpTokenAddress: 'LP Token Address',
      checkStatus: 'Check Status',
      allocPoints: 'Allocation Points',
      statusInFarm: 'Status',
      statusNotInFarm: 'Not yet in farm',
      alreadyInFarm: 'Already in farm (Pool ID: ',
      active: 'Active',
      disabled: 'Disabled',
      updatePool: 'Update Pool',
      updating: 'Updating...',
      disablePool: 'Disable Pool',
      disabling: 'Disabling...',
      addLpToken: 'Add LP Token to Farm',
      adding: 'Adding...',
      adminNote1: 'Note: Allocation Points determine the reward share of each pool. The contract distributes 0.1 AIH per second across all pools based on their point ratio.',
      adminNote2: 'Example: If Pool A has 100 points, Pool B has 300 points (total 400), then Pool A gets 25% of rewards, Pool B gets 75%.',
      adminNote3: 'Disabling a pool sets allocation points to 0, which stops new rewards but preserves existing stakes.',
      cancel: 'Cancel',
      estimatedShare: 'Estimated Share',
      currentTotalPoints: 'Current Total Points'
    },
    zh: {
      farm: '农场',
      staking: '质押',
      harvest: '收获',
      deposit: '存入',
      withdraw: '提取',
      balance: '余额',
      connectWallet: '连接钱包',
      apr: '年化收益率',
      pendingRewards: '待领取奖励',
      stakedAmount: '已质押数量',
      totalStaked: '总质押量',
      earnedRewards: '已赚取奖励',
      walletBalance: '钱包余额',
      walletWarning: '请连接您的钱包以使用农场',
      availablePools: '可用池子',
      yourFarms: '您的农场',
      noPositions: '未找到农场仓位',
      approving: '授权中...',
      depositing: '存入中...',
      withdrawing: '提取中...',
      harvesting: '收获中...',
      approved: '代币授权成功',
      approve: '授权',
      depositSuccess: '存入成功',
      withdrawSuccess: '提取成功',
      harvestSuccess: '收获成功',
      approveError: '授权失败',
      depositError: '存入失败',
      withdrawError: '提取失败',
      harvestError: '收获失败',
      max: '最大',
      refresh: '刷新',
      sortBy: '排序',
      sortApr: '年化收益率',
      sortTotalStaked: '总质押量',
      sortYourStake: '您的质押量',
      sortPendingRewards: '待领取奖励',
      sortAsc: '升序',
      sortDesc: '降序',
      filter: '筛选',
      filterAll: '所有池子',
      filterStakedOnly: '已质押池子',
      loading: '加载中...',
      loadingPools: '加载池子...',
      noPoolsFound: '没有找到匹配您筛选条件的池子',
      // Admin panel translations
      adminManagePools: '管理员：管理农场池',
      lpTokenAddress: 'LP代币地址',
      checkStatus: '检查状态',
      allocPoints: '分配点数',
      statusInFarm: '状态',
      statusNotInFarm: '尚未在农场中',
      alreadyInFarm: '已在农场中（池ID：',
      active: '活跃中',
      disabled: '已禁用',
      updatePool: '更新池子',
      updating: '更新中...',
      disablePool: '禁用池子',
      disabling: '禁用中...',
      addLpToken: '添加LP代币到农场',
      adding: '添加中...',
      adminNote1: '注意：分配点数决定每个池子的奖励份额。合约每秒分配0.1个AIH代币，根据点数比例分配给所有池子。',
      adminNote2: '示例：如果A池有100点，B池有300点（总计400点），那么A池获得25%的奖励，B池获得75%。',
      adminNote3: '禁用池子是将分配点数设置为0，这会停止新的奖励分配，但保留现有的质押。',
      cancel: '取消',
      estimatedShare: '估计奖励份额',
      currentTotalPoints: '当前总分配点数'
    }
  };
  
  // Translation helper function
  // 翻译辅助函数
  const ft = (key: keyof FarmTranslation): string => {
    return farmTranslations[language]?.[key] || farmTranslations.en[key];
  };
  
  // Loading states
  // 加载状态
  const [isLoadingPools, setIsLoadingPools] = useState<boolean>(false);
  const [isLoadingRewards, setIsLoadingRewards] = useState<boolean>(false);
  
  // Sort and filter states
  // 排序和筛选状态
  const [sortBy, setSortBy] = useState<SortOption>('apr');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  
  // Router for URL params
  // 用于URL参数的路由器
  const router = useRouter();
  
  // 添加交易处理状态
  const [pendingTx, setPendingTx] = useState<{
    type: 'deposit' | 'withdraw' | 'harvest' | null,
    hash: string | null
  }>({ type: null, hash: null });
  
  // 添加一个简单但有效的防重复交易请求方法
  const preventRepeatedTransaction = () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    
    // 检查全局变量是否已经存在
    if (!window._originalEthereumRequest) {
      console.log("设置MetaMask交易防重复系统");
      
      try {
        // 保存原始request方法
        window._originalEthereumRequest = window.ethereum.request;
        
        // 创建一个标记最后交易时间的变量
        window._lastTransactionTime = 0;
        
        // 替换为包装的request方法
        window.ethereum.request = async function(args) {
          // 只拦截交易方法
          if (args.method === 'eth_sendTransaction' || args.method === 'eth_signTransaction') {
            const now = Date.now();
            
            // 如果上一次交易请求在5秒内，拒绝这次请求
            if (now - (window._lastTransactionTime || 0) < 5000) {
              console.log("拒绝频繁交易请求");
              alert("请等待几秒后再尝试");
              throw new Error("操作太频繁，请等待几秒后再试");
            }
            
            // 记录这次交易请求的时间
            window._lastTransactionTime = now;
          }
          
          // 调用原始方法
          return await window._originalEthereumRequest.call(window.ethereum, args);
        };
        
        console.log("MetaMask交易防重复系统已设置");
      } catch (err) {
        console.error("设置MetaMask交易防重复系统失败:", err);
      }
    }
  };
  
  // 在组件挂载时设置一次
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      preventRepeatedTransaction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Initialize component on mount
  // 在挂载时初始化组件
  useEffect(() => {
    setMounted(true);
    
    // Get initial sort and filter from URL params
    // 从URL参数获取初始排序和筛选选项
    if (router.isReady) {
      const { sort, dir, filter } = router.query;
      if (sort && ['apr', 'totalStaked', 'userStaked', 'pendingRewards'].includes(sort as string)) {
        setSortBy(sort as SortOption);
      }
      if (dir && ['asc', 'desc'].includes(dir as string)) {
        setSortDirection(dir as 'asc' | 'desc');
      }
      if (filter && ['all', 'stakedOnly'].includes(filter as string)) {
        setFilterOption(filter as FilterOption);
      }
    }
    
    return () => {
      setMounted(false);
      
      // Clean up the APR update timer
      if (aprUpdateTimer) {
        clearTimeout(aprUpdateTimer);
      }
    };
  }, [router.isReady, router.query, aprUpdateTimer]);

  // Sync URL params when sort/filter changes
  // 当排序/筛选更改时同步URL参数
  useEffect(() => {
    if (router.isReady && mounted) {
      router.replace({
        pathname: router.pathname,
        query: {
          ...router.query,
          sort: sortBy,
          dir: sortDirection,
          filter: filterOption
        }
      }, undefined, { shallow: true });
    }
  }, [sortBy, sortDirection, filterOption, mounted, router.isReady]);
  
  // Fetch data when wallet is connected
  // 当钱包连接时获取数据
  useEffect(() => {
    if (isConnected && address && mounted) {
      fetchPoolsData();
    }
  }, [isConnected, address, mounted]);
  
  // Check if connected address is admin (for demo purposes)
  // 检查连接的地址是否为管理员（用于演示目的）
  useEffect(() => {
    const checkAdmin = async () => {
      if (isConnected && address && window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum as any);
          // Check if the user is the farm owner
          const isOwner = await isFarmOwner(provider, address);
          
          // For backup, also check hardcoded admin addresses
          const adminAddresses = [
            '0x0d87d8E1def9cA4A5f1BE181dc37c9ed9622c8d5'.toLowerCase(),
            // Add other admin addresses if needed
          ];
          
          setIsAdmin(isOwner || adminAddresses.includes(address.toLowerCase()));
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, [isConnected, address]);
  
  // Fetch all farm pools data
  // 获取所有农场池数据
  const fetchPoolsData = async () => {
    if (!FARM_ADDRESS || !ethers.utils.isAddress(FARM_ADDRESS)) {
      console.error("Invalid farm address");
        return;
      }
      
    setIsLoadingPools(true);
    
    try {
      console.log("Fetching pools data...");
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      const signerAddress = isConnected ? await signer.getAddress() : null;
      const farmContract = getFarmContract(provider);
      
      // Get pool count
      const poolCount = await getPoolCount(provider);
      console.log("Pool count:", poolCount);
      
      // Get total allocation points
      await getTotalAllocPoints();
      
      // Get pool details for each pool
      const poolsData: FarmPool[] = [];
      
      for (let pid = 0; pid < poolCount; pid++) {
        try {
          // Get pool info
          const poolInfo = await getPoolInfo(provider, pid);
          if (!poolInfo) {
            console.log(`Pool ${pid} info not available, skipping`);
            continue;
          }
          
          // 如果这个池子的allocPoint为0，表示该池子已被禁用，不显示在界面上
          if (poolInfo.allocPoint === 0) {
            console.log(`跳过已禁用的池子 ${pid}（分配点数为0）`);
            continue;
          }
          
          let lpTokenSymbol = '';
          let lpTokenName = '';
          let tokenASymbol = 'Token A';
          let tokenBSymbol = 'Token B';
          let userBalance = '0';
          let userStaked = '0';
          let pendingRewards = '0';
          
          // Get details from predefined list or try to fetch from contract
          const lpAddress = poolInfo.lpToken.toLowerCase();
          if (lpTokenDetails[lpAddress]) {
            lpTokenName = lpTokenDetails[lpAddress].name;
            lpTokenSymbol = lpTokenDetails[lpAddress].symbol;
            tokenASymbol = lpTokenDetails[lpAddress].tokenA;
            tokenBSymbol = lpTokenDetails[lpAddress].tokenB;
          } else {
            try {
              lpTokenSymbol = await getTokenSymbol(poolInfo.lpToken);
              lpTokenName = await getTokenName(poolInfo.lpToken);
              
              // 尝试获取LP代币的基础代币信息
              try {
                const pairContract = new ethers.Contract(
                  poolInfo.lpToken,
                  ['function token0() view returns (address)', 'function token1() view returns (address)'],
                  provider
                );
                
                const token0 = await pairContract.token0();
                const token1 = await pairContract.token1();
                
                tokenASymbol = await getTokenSymbol(token0);
                tokenBSymbol = await getTokenSymbol(token1);
                
                console.log(`Pool ${pid} token pair: ${tokenASymbol}/${tokenBSymbol}`);
              } catch (err) {
                console.warn(`无法获取LP代币 ${poolInfo.lpToken} 的基础代币信息:`, err);
              }
            } catch (error) {
              console.warn(`[DeFi Warning] Error getting token info for ${poolInfo.lpToken}:`, error);
              lpTokenSymbol = `LP-${pid}`;
              lpTokenName = `Liquidity Pool ${pid}`;
            }
          }
          
          // Try to calculate APR (may fail for some pools)
          let apr = 0;
          let isLoadingAPR = false;
          
          try {
            isLoadingAPR = true;
            apr = await getPoolAPR(
              provider, 
              pid,
              { tokenA: tokenASymbol, tokenB: tokenBSymbol }
            );
            isLoadingAPR = false;
            console.log(`Pool ${pid} APR: ${apr}%`);
          } catch (error) {
            isLoadingAPR = false;
            console.warn(`[DeFi Warning] Error calculating APR for pool ${pid}:`, error);
          }
          
          // Get user-specific data if connected
          if (address) {
            try {
              userBalance = await getTokenBalance(poolInfo.lpToken, address);
            } catch (error) {
              console.warn(`[DeFi Warning] Error getting token balance for ${poolInfo.lpToken}:`, error);
            }
            
            try {
              // Get user staked amount from the pool
              const userInfo = await getFarmContract(provider).getUserInfo(pid, address);
              userStaked = ethers.utils.formatEther(userInfo.amount);
              
              // Get pending rewards separately for better reliability
              setIsLoadingRewards(true);
              pendingRewards = await getPendingRewards(provider, pid, address);
              console.log(`Pool ${pid} pending rewards:`, pendingRewards);
              setIsLoadingRewards(false);
            } catch (error) {
              console.warn(`[DeFi Warning] Error getting user farm info for pool ${pid}:`, error);
              setIsLoadingRewards(false);
            }
          }
          
          const pool: FarmPool = {
            pid,
            lpToken: poolInfo.lpToken,
            lpTokenName,
            lpTokenSymbol,
            apr,
            isLoadingAPR,
            totalStaked: ethers.utils.formatEther(poolInfo.totalStaked),
            userBalance,
            userStaked,
            pendingRewards,
            tokenASymbol,
            tokenBSymbol,
            allocPoint: poolInfo.allocPoint,
            isActive: poolInfo.allocPoint > 0
          };
          
          poolsData.push(pool);
          
          if (address && parseFloat(userStaked) > 0) {
            userFarmPositions.push(pool);
          }
        } catch (error) {
          console.error(`[DeFi Error] Failed to fetch data for pool ${pid}:`, error);
        }
      }
      
      setFarmPools(poolsData);
      setUserFarmPositions(userFarmPositions);
    } catch (error) {
      console.error('[DeFi Error] Failed to fetch farm data:', error);
    } finally {
      setIsLoadingPools(false);
    }
  };
  
  // Show notification
  // 显示通知
  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
    
    // Auto hide after 5 seconds
    // 5秒后自动隐藏
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };
  
  // Handle deposit modal
  // 处理存入模态框
  const openDepositModal = (pool: FarmPool) => {
    setSelectedPool(pool);
    setDepositAmount('');
    setShowDepositModal(true);
  };
  
  // Handle withdraw modal
  // 处理提取模态框
  const openWithdrawModal = (pool: FarmPool) => {
    setSelectedPool(pool);
    setWithdrawAmount('');
    setShowWithdrawModal(true);
  };
  
  // Handle approve LP token for farm
  // 处理授权LP代币用于农场
  const handleApprove = async () => {
    if (!selectedPool) return;
    
    setIsApproving(true);
    showNotification('loading', ft('approving'));
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      const tx = await approveLPTokenForFarm(signer, selectedPool.lpToken);
      
      // If tx is null, the token is already approved
      if (tx === null) {
        showNotification('success', ft('approved'));
        setIsApproving(false);
        return;
      }
      
      await tx.wait();
      showNotification('success', ft('approved'));
      
      // Refresh data after approval
      fetchPoolsData();
    } catch (error) {
      console.error('Approval error:', error);
      showNotification('error', ft('approveError'));
    } finally {
      setIsApproving(false);
    }
  };
  
  // Handle deposit LP tokens into the farm
  // 处理将LP代币存入农场
  const handleDeposit = async () => {
    if (!selectedPool || !depositAmount || parseFloat(depositAmount) <= 0 || pendingTx.type === 'deposit') return;
    
    setIsDepositing(true);
    setPendingTx({ type: 'deposit', hash: null });
    showNotification('loading', ft('depositing'));
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      // 添加交易参数
      const txParams = {
        gasLimit: 300000, // 显式设置gas限制
        nonce: await signer.getTransactionCount() // 明确设置nonce
      };
      
      try {
        const tx = await deposit(signer, selectedPool.pid, depositAmount, txParams);
        setPendingTx({ type: 'deposit', hash: tx.hash });
        
        await tx.wait();
        
        showNotification('success', ft('depositSuccess'));
        setShowDepositModal(false);
        setDepositAmount('');
        
        // 刷新数据 - 立即刷新一次
        await refreshRewards();
        await fetchPoolsData();
        
        // 显示正在更新的通知
        showNotification('info', '更新数据中...');
        
        // 延迟后再刷新一次，以确保获取最新数据
        setTimeout(async () => {
          await refreshRewards();
          await fetchPoolsData();
          
          // 再延迟一次，确保数据完全更新
          setTimeout(async () => {
            await refreshRewards();
            await fetchPoolsData();
          }, 2000);
        }, 1000);
        
      } catch (err: any) {
        if (err.code === 4001) { // 用户拒绝错误
          showNotification('info', '交易已取消');
        } else if (err.code === 4100) { // 垃圾邮件过滤器错误
          showNotification('error', '交易被钱包阻止，请稍后再试或减小金额');
        } else {
          console.error('Deposit error:', err);
          showNotification('error', ft('depositError'));
        }
      }
    } finally {
      setIsDepositing(false);
      setPendingTx({ type: null, hash: null });
    }
  };
  
  // Handle withdraw
  // 处理提取
  const handleWithdraw = async () => {
    if (!selectedPool || !address || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || pendingTx.type === 'withdraw') return;
    
    try {
      setIsWithdrawing(true);
      setPendingTx({ type: 'withdraw', hash: null });
      showNotification('loading', ft('withdrawing'));
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      try {
        // 使用正确的参数传递方式
        const tx = await withdraw(
          signer, 
          selectedPool.pid, 
          withdrawAmount
        );
        setPendingTx({ type: 'withdraw', hash: tx.hash });
        
        await tx.wait();
        
        showNotification('success', ft('withdrawSuccess'));
        setShowWithdrawModal(false);
        
        // Immediately refresh rewards after withdrawal to see updated rewards
        // 提款后立即刷新奖励，查看更新的奖励
        await refreshRewards();
        
        // Then refresh other pool data
        // 然后刷新其他池子数据
        fetchPoolsData();
      } catch (err: any) {
        if (err.code === 4001) { // 用户拒绝错误
          showNotification('info', '交易已取消');
        } else if (err.code === 4100) { // 垃圾邮件过滤器错误
          showNotification('error', '交易被钱包阻止，请稍后再试或减小金额');
        } else {
          console.error('Withdraw error:', err);
          showNotification('error', ft('withdrawError'));
        }
      }
    } finally {
      setIsWithdrawing(false);
      setPendingTx({ type: null, hash: null });
    }
  };
  
  // Handle harvest with a simple cooldown timer
  // 使用简单的冷却计时器处理收获
  const handleHarvest = async (pool: FarmPool) => {
    // 检查是否已经在收获中
    if (!address || isHarvesting || pendingTx.type === 'harvest') return;
    
    // 设置收获状态为true，无论如何5秒内不允许再次点击
    setIsHarvesting(true);
    
    // 设置5秒的冷却时间，无论交易是否成功
    setTimeout(() => {
      setIsHarvesting(false);
    }, 5000);
    
    try {
      setPendingTx({ type: 'harvest', hash: null });
      showNotification('loading', ft('harvesting'));
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      try {
        const tx = await harvest(signer, pool.pid);
        setPendingTx({ type: 'harvest', hash: tx.hash });
        
        // 交易提交成功，等待确认
        showNotification('info', '交易已提交，等待确认');
        
        try {
          const receipt = await tx.wait();
          console.log(`交易已确认:`, receipt);
          showNotification('success', ft('harvestSuccess'));
          
          // 刷新数据
          await refreshRewards();
        } catch (confirmErr) {
          // 交易确认失败
          console.error('交易确认失败:', confirmErr);
          showNotification('error', '交易确认失败');
        }
      } catch (txErr: any) {
        // 用户可能取消了交易
        if (txErr.code === 4001) {
          console.log('用户取消了交易');
          showNotification('info', '交易已取消');
        } else {
          console.error('Harvest error:', txErr);
          showNotification('error', ft('harvestError'));
        }
      }
    } finally {
      setPendingTx({ type: null, hash: null });
      // 注意：不在这里设置isHarvesting为false，我们依赖之前设置的timer
    }
  };
  
  // Set maximum amount for deposit
  // 设置最大存入金额
  const handleMaxDeposit = () => {
    if (selectedPool) {
      setDepositAmount(selectedPool.userBalance);
    }
  };
  
  // Set maximum amount for withdraw
  // 设置最大提取金额
  const handleMaxWithdraw = () => {
    if (selectedPool) {
      setWithdrawAmount(selectedPool.userStaked);
    }
  };
  
  // Check if LP token is already in farm
  // 检查LP代币是否已在农场中
  const checkLpTokenStatus = async () => {
    if (!newLpToken || !ethers.utils.isAddress(newLpToken)) {
      alert('请输入有效的LP代币地址');
      return;
    }
    
    setLpTokenStatus({ checked: false, isInFarm: false });
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      const result = await isLpTokenInFarm(provider, newLpToken);
      
      let allocPointValue = 0;
      if (result.isInFarm && typeof result.poolId === 'number') {
          const poolInfo = await getPoolInfo(provider, result.poolId);
        allocPointValue = poolInfo ? poolInfo.allocPoint : 0;
      }
      
      // 更新状态
      setLpTokenStatus({
        checked: true,
        isInFarm: result.isInFarm,
        poolId: result.poolId,
        allocPoint: allocPointValue
      });
      
      // 如果找到池子，计算它的奖励份额
      if (result.isInFarm) {
        // 设置当前分配点数为该池子的分配点数
        setAllocPoint(allocPointValue.toString());
        
        // 估算奖励份额
        const share = calculateEstimatedRewardShare(allocPointValue, totalAllocPoints);
        setEstimatedRewardShare(share);
        
        const statusText = allocPointValue === 0 
          ? `LP token already in farm (Pool ID: ${result.poolId}) - 已禁用`
          : `LP token already in farm (Pool ID: ${result.poolId}) - 活跃中`;
        showNotification('info', statusText);
      } else {
        // 对于新池子，使用默认的分配点数(100)估算
        const newPoints = parseInt(allocPoint) || 100;
        const share = calculateEstimatedRewardShare(newPoints, totalAllocPoints + newPoints);
        setEstimatedRewardShare(share);
        showNotification('info', 'LP token not yet in farm');
      }
    } catch (error) {
      console.error('Error checking LP token status:', error);
      showNotification('error', 'Failed to check LP token status');
    }
  };
  
  // Handle adding new LP token to farm
  // 处理向农场添加新的LP代币
  const handleAddLpToken = async () => {
    if (!newLpToken || !ethers.utils.isAddress(newLpToken)) {
      alert('Please enter a valid LP token address');
      return;
    }
    
   
    setIsAddingPool(true);
    showNotification('loading', 'Adding LP token to farm...');
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      
      console.log("Current address:", signerAddress);
      console.log("Farm deployment address:", "0x0d87d8E1def9cA4A5f1BE181dc37c9ed9622c8d5");
      
      // First check if the LP token is already in the farm
      const result = await isLpTokenInFarm(provider, newLpToken);
      
      if (result.isInFarm) {
        showNotification('error', `LP token already in farm (Pool ID: ${result.poolId})`);
        setIsAddingPool(false);
        return;
      }
      
      // Check if token is a valid LP token
      try {
        // Try to validate if it's a proper LP token
        const lpContract = new ethers.Contract(
          newLpToken,
          [
            'function token0() external view returns (address)',
            'function token1() external view returns (address)',
            'function totalSupply() external view returns (uint256)',
            'function balanceOf(address) external view returns (uint256)'
          ],
          provider
        );
        
        try {
          const token0 = await lpContract.token0();
          const token1 = await lpContract.token1();
          console.log("Valid LP token with underlying tokens:", { token0, token1 });
        } catch (err) {
          console.warn("Failed to verify LP token pair data:", err);
          if (!confirm("This address might not be a valid LP token. Do you want to continue anyway?")) {
            setIsAddingPool(false);
            return;
          }
        }
        
        // Check LP token balance and supply
        const totalSupply = await lpContract.totalSupply();
        console.log("LP token total supply:", ethers.utils.formatEther(totalSupply));
        
        if (totalSupply.eq(0)) {
          if (!confirm("This LP token has 0 total supply. Do you want to continue anyway?")) {
            setIsAddingPool(false);
            return;
          }
        }
      } catch (err) {
        console.error("LP token validation error:", err);
        if (!confirm("This address may not be a valid token. Do you want to continue anyway?")) {
          setIsAddingPool(false);
          return;
        }
      }
      
      console.log("Proceeding to add LP token to farm:", newLpToken);
      console.log("With allocation points:", allocPoint);
      
      // Call the Farm contract directly with the correct parameters
      try {
        // Get farm contract
        const farmContract = new ethers.Contract(
          FARM_ADDRESS,
          farmABI,
          signer
        );
        
        console.log("Calling with 2 parameters - allocPoint, lpToken");
        
        // 实际部署的Farm合约只接受2个参数:
        // 1. allocPoint: 分配点数
        // 2. lpToken: LP代币地址
        // 不需要withUpdate参数
        const tx = await farmContract.add(
          parseInt(allocPoint),
          newLpToken,
          {
            gasLimit: 500000, // 明确的gas限制
          }
        );
        
        console.log("Transaction sent:", tx.hash);
        showNotification('info', `Transaction submitted: ${tx.hash.substring(0, 10)}...`);
        
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);
        
        showNotification('success', 'LP token added to farm successfully');
        setNewLpToken('');
        setAllocPoint('100');
        setLpTokenStatus({ checked: false, isInFarm: false });
        
        // Refresh data
        await fetchPoolsData();
      } catch (error: any) {
        console.error('Detailed error adding LP token to farm:', error);
        
        // Extract more detailed error information
        let errorMessage = 'Failed to add LP token to farm.';
        
        if (error.reason) {
          errorMessage += ` Reason: ${error.reason}`;
        }
        
        if (error.error && error.error.message) {
          errorMessage += ` Message: ${error.error.message}`;
        }
        
        if (error.message && error.message.includes("execution reverted")) {
          const revertMsg = error.message.split("execution reverted:")[1]?.trim() || "Unknown revert reason";
          errorMessage += ` Contract reverted: ${revertMsg}`;
        }
        
        showNotification('error', errorMessage);
      }
    } catch (error) {
      console.error('Error adding LP token to farm:', error);
      showNotification('error', 'Failed to add LP token to farm. You may not have permission, or there might be another issue with the contract.');
    } finally {
      setIsAddingPool(false);
    }
  };
  
  // Handle updating allocation points for an existing pool
  // 处理更新现有池的分配点数
  const handleUpdatePool = async () => {
    if (!lpTokenStatus.isInFarm || lpTokenStatus.poolId === undefined) {
      alert('This LP token is not in the farm yet');
      return;
    }
    
    setIsUpdatingPool(true);
    showNotification('loading', `Updating pool ${lpTokenStatus.poolId}...`);
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      const tx = await updatePoolAllocPoints(signer, lpTokenStatus.poolId, parseInt(allocPoint));
      await tx.wait();
      
      showNotification('success', `Pool ${lpTokenStatus.poolId} updated successfully`);
      setNewLpToken('');
      setAllocPoint('100');
      setLpTokenStatus({ checked: false, isInFarm: false });
      
      // Refresh data
      await fetchPoolsData();
    } catch (error) {
      console.error('Error updating pool:', error);
      showNotification('error', 'Failed to update pool. You may not have permission.');
    } finally {
      setIsUpdatingPool(false);
    }
  };
  
  // Handle deleting pool (actually setting allocation points to 0)
  // 处理删除池子（实际是将分配点数设置为0）
  const handleDisablePool = async () => {
    if (!lpTokenStatus.isInFarm || lpTokenStatus.poolId === undefined) {
      showNotification('error', '此LP代币不在农场中');
      return;
    }
    
    if (!confirm(`确定要禁用池子 ${lpTokenStatus.poolId} 吗？这将设置其分配点数为0`)) {
      return;
    }
    
    setIsDeletingPool(true);
    showNotification('loading', `正在禁用池子 ${lpTokenStatus.poolId}...`);
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      // Call the updatePoolAllocPoints function to set allocation points to 0
      const tx = await updatePoolAllocPoints(signer, lpTokenStatus.poolId, 0);
      await tx.wait();
      
      showNotification('success', `池子 ${lpTokenStatus.poolId} 已成功禁用`);
      setNewLpToken('');
      setAllocPoint('100');
      setLpTokenStatus({ checked: false, isInFarm: false });
      
      // Refresh data
      await fetchPoolsData();
    } catch (error) {
      console.error('Error disabling pool:', error);
      showNotification('error', '禁用池子失败。您可能没有必要的权限。');
    } finally {
      setIsDeletingPool(false);
    }
  };
  
  // Add manual refresh rewards functionality
  // 添加手动刷新奖励功能
  const refreshRewards = async () => {
    if (!address || farmPools.length === 0) return;
    
    setIsLoadingRewards(true);
    showNotification('loading', 'Refreshing rewards data...');
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const updatedPools = [...farmPools];
      const updatedPositions = [...userFarmPositions];
      
      for (let i = 0; i < updatedPools.length; i++) {
        const pool = updatedPools[i];
        const pendingRewards = await getPendingRewards(provider, pool.pid, address);
        updatedPools[i] = { ...pool, pendingRewards };
        
        // 更新用户仓位中的对应池子
        const posIndex = updatedPositions.findIndex(p => p.pid === pool.pid);
        if (posIndex >= 0) {
          updatedPositions[posIndex] = { ...updatedPositions[posIndex], pendingRewards };
        }
      }
      
      setFarmPools(updatedPools);
      setUserFarmPositions(updatedPositions);
      showNotification('success', 'Rewards data updated');
    } catch (error) {
      console.error('Failed to refresh rewards:', error);
      showNotification('error', 'Failed to refresh rewards data');
    } finally {
      setIsLoadingRewards(false);
    }
  };
  
  // Refresh rewards for a specific pool immediately
  // 立即刷新特定池子的奖励
  const refreshPoolRewards = async (poolId: number) => {
    if (!address) return;
    
    setIsLoadingRewards(true);
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      // Get the latest pending rewards for this pool
      const latestRewards = await getPendingRewards(provider, poolId, address);
      console.log(`Updated rewards for pool ${poolId}: ${latestRewards}`);
      
      // Update the farmPools state with new rewards
      const updatedPools = farmPools.map(pool => 
        pool.pid === poolId ? {...pool, pendingRewards: latestRewards} : pool
      );
      setFarmPools(updatedPools);
      
      // Also update userFarmPositions if this pool is in user positions
      const userPoolIndex = userFarmPositions.findIndex(p => p.pid === poolId);
      if (userPoolIndex >= 0) {
        const updatedPositions = [...userFarmPositions];
        updatedPositions[userPoolIndex] = {
          ...updatedPositions[userPoolIndex],
          pendingRewards: latestRewards
        };
        setUserFarmPositions(updatedPositions);
      }
    } catch (error) {
      console.error(`Error refreshing rewards for pool ${poolId}:`, error);
    } finally {
      setIsLoadingRewards(false);
    }
  };
  
  // Refresh APR values for all pools
  // 刷新所有池子的APR值
  const refreshPoolAPRs = async () => {
    try {
      if (!window.ethereum) return;
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Update APR for each pool in the farmPools array
      const updatedPools = await Promise.all(farmPools.map(async (pool) => {
        // Set loading flag
        return {
          ...pool,
          isLoadingAPR: true
        };
      }));
      
      // Update state immediately to show loading indicators
      setFarmPools(updatedPools);
      
      // Log the current prices for debugging
      console.log("Current token prices used for APR calculation:", tokenPrices);
      
      // Then calculate actual APRs
      const finalUpdatedPools = await Promise.all(updatedPools.map(async (pool) => {
        try {
          // Get LP token symbol parts to determine the tokens
          const tokenParts = pool.lpTokenSymbol.split('-');
          let tokenA: string | undefined;
          let tokenB: string | undefined;
          
          // Extract token symbols from LP token name if possible
          if (tokenParts.length > 1) {
            // First token is usually straightforward
            tokenA = tokenParts[0];
            
            // Second token might have various formats like LP suffix
            // Specially handle known formats
            if (tokenParts[1] === 'TDLP') {
              tokenB = 'TD';
            } else if (tokenParts[1].endsWith('LP')) {
              // Remove LP suffix if present
              tokenB = tokenParts[1].replace('LP', '');
            } else {
              tokenB = tokenParts[1];
            }
            
            console.log(`Pool ${pool.pid}: 从LP代币符号提取：${tokenA} 和 ${tokenB}`);
          } else {
            // Fallback to existing tokenA/tokenB symbols
            tokenA = pool.tokenASymbol;
            tokenB = pool.tokenBSymbol;
            console.log(`Pool ${pool.pid}: 使用预定义的代币符号：${tokenA} 和 ${tokenB}`);
          }
          
          // Make sure token symbols are valid and present in the price data
          if (tokenA && tokenB) {
            console.log(`Pool ${pool.pid}: Calculating APR with tokens ${tokenA} and ${tokenB}`);
            
            // Check if these tokens have prices in our simulation
            const validTokenA = Object.keys(tokenPrices).includes(tokenA) ? tokenA : undefined;
            const validTokenB = Object.keys(tokenPrices).includes(tokenB) ? tokenB : undefined;
            
            if (!validTokenA || !validTokenB) {
              console.warn(`Pool ${pool.pid}: Token symbols not found in price data - ${validTokenA ? '' : tokenA} ${validTokenB ? '' : tokenB}`);
            }
            
            // Get dynamic APR with token details
            const apr = await getPoolAPR(provider, pool.pid, {
              tokenA: validTokenA || tokenA,
              tokenB: validTokenB || tokenB
            });
            
            console.log(`Pool ${pool.pid}: Updated APR to ${apr}%`);
            
            return {
              ...pool,
              apr,
              isLoadingAPR: false
            };
          } else {
            console.warn(`Pool ${pool.pid}: Could not determine token symbols`);
            
            // Fallback to simple APR calculation
            const apr = await getPoolAPR(provider, pool.pid);
            
            return {
              ...pool,
              apr,
              isLoadingAPR: false
            };
          }
        } catch (error) {
          console.error(`Error updating APR for pool ${pool.pid}:`, error);
          return {
            ...pool,
            isLoadingAPR: false
          };
        }
      }));
      
      setFarmPools(finalUpdatedPools);
      
      // Also update user positions if user is connected
      if (isConnected && address) {
        const userPositionsWithAPR = userFarmPositions.map(position => {
          const matchingPool = finalUpdatedPools.find(p => p.pid === position.pid);
          if (matchingPool) {
            return {
              ...position,
              apr: matchingPool.apr
            };
          }
          return position;
        });
        
        setUserFarmPositions(userPositionsWithAPR);
      }
    } catch (error) {
      console.error('Error refreshing APRs:', error);
    }
  };
  
  // Apply client-side filtering and sorting
  // 应用客户端过滤和排序
  const filteredAndSortedPools = useMemo(() => {
    // First apply filtering
    // 首先应用过滤
    let result = [...farmPools];
    
    if (filterOption === 'stakedOnly') {
      result = result.filter(pool => parseFloat(pool.userStaked) > 0);
    }
    
    // Then apply sorting
    // 然后应用排序
    result.sort((a, b) => {
      let valueA: number, valueB: number;
      
      switch (sortBy) {
        case 'apr':
          valueA = a.apr;
          valueB = b.apr;
          break;
        case 'totalStaked':
          valueA = parseFloat(a.totalStaked);
          valueB = parseFloat(b.totalStaked);
          break;
        case 'userStaked':
          valueA = parseFloat(a.userStaked);
          valueB = parseFloat(b.userStaked);
          break;
        case 'pendingRewards':
          valueA = parseFloat(a.pendingRewards);
          valueB = parseFloat(b.pendingRewards);
          break;
        default:
          valueA = a.apr;
          valueB = b.apr;
      }
      
      // Apply direction
      // 应用方向
      return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
    });
    
    return result;
  }, [farmPools, sortBy, sortDirection, filterOption]);
  
  // Render the token price displays (replaced with PriceCarousel)
  // 渲染代币价格显示（替换为PriceCarousel）
  const renderTokenPrices = () => {
    return (
      <PriceCarousel 
        prices={tokenPrices} 
        prevPrices={prevPrices} 
        refreshInterval={6000} 
      />
    );
  };
  
  // 获取总分配点数
  const getTotalAllocPoints = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      // Use the calculateTotalAllocPoint function which is more robust
      // This function already has fallback mechanisms if direct contract call fails
      const totalPoints = await calculateTotalAllocPoint(provider);
      
      console.log("Total allocation points:", totalPoints.toString());
      setTotalAllocPoints(parseInt(totalPoints.toString()));
      return parseInt(totalPoints.toString());
    } catch (error) {
      console.error("Error getting total allocation points:", error);
      // 计算池子合计分配点数作为备选方案
      if (farmPools.length > 0) {
        const total = farmPools.reduce((acc, pool) => acc + pool.allocPoint, 0);
        setTotalAllocPoints(total);
        return total;
      }
      return 0;
    }
  };

  // 计算估计的奖励份额
  const calculateEstimatedRewardShare = (points: number, total: number) => {
    if (total === 0) return "0";
    const percentage = (points / total) * 100;
    return percentage.toFixed(2);
  };

  // Handle allocation points input change
  const handleAllocPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAllocPoint(value);
    
    // Calculate estimated reward share
    const points = parseInt(value) || 0;
    let totalPoints = totalAllocPoints;
    
    // If updating an existing pool, subtract its current allocation points
    if (lpTokenStatus.isInFarm && lpTokenStatus.allocPoint !== undefined) {
      totalPoints = totalAllocPoints - lpTokenStatus.allocPoint + points;
    } else {
      totalPoints = totalAllocPoints + points;
    }
    
    const share = calculateEstimatedRewardShare(points, totalPoints);
    setEstimatedRewardShare(share);
  };
  
  // Main render function
  // 主渲染函数
  return (
    <div className={styles.container}>
      {/* Token Price Carousel at top */}
      {/* 顶部的代币价格轮播 */}
      {renderTokenPrices()}
      
      {/* Notification component */}
      {/* 通知组件 */}
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type || 'info']}`}>
          <div>
            {notification.type === 'success' && <span className="mr-2">✅</span>}
            {notification.type === 'error' && <span className="mr-2">❌</span>}
            {notification.type === 'loading' && <span className="mr-2">⏳</span>}
            {notification.type === 'info' && <span className="mr-2">ℹ️</span>}
            <p>{notification.message}</p>
          </div>
        </div>
      )}
      
      {/* Sort and Filter Controls */}
      {/* 排序和筛选控件 */}
      <div className={styles.controlsContainer}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>{ft('sortBy')}:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={styles.select}
          >
            <option value="apr">{ft('sortApr')}</option>
            <option value="totalStaked">{ft('sortTotalStaked')}</option>
            <option value="userStaked">{ft('sortYourStake')}</option>
            <option value="pendingRewards">{ft('sortPendingRewards')}</option>
          </select>
          
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className={styles.sortDirectionBtn}
          >
            {sortDirection === 'desc' ? ft('sortDesc') : ft('sortAsc')}
          </button>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>{ft('filter')}:</label>
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value as FilterOption)}
            className={styles.select}
          >
            <option value="all">{ft('filterAll')}</option>
            <option value="stakedOnly">{ft('filterStakedOnly')}</option>
          </select>
        </div>
      </div>
      
      {/* Tabs */}
      {/* 标签页 */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'available' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('available')}
        >
          {ft('availablePools')}
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'your-farms' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('your-farms')}
        >
          {ft('yourFarms')}
        </button>
      </div>
      
      {/* Loading Indicator */}
      {/* 加载指示器 */}
      {isLoadingPools && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingText}>{ft('loadingPools')}</span>
        </div>
      )}
      
      {/* Available Pools */}
      {/* 可用的池子 */}
      {activeTab === 'available' && !isLoadingPools && (
        <div>
          {filteredAndSortedPools.length === 0 ? (
            <div className={styles.emptyMessage}>
              {ft('noPoolsFound')}
            </div>
          ) : (
            <div className={styles.poolsContainer}>
              {filteredAndSortedPools.map((pool) => (
                <div key={pool.pid} className={styles.poolCard}>
                  <div className={styles.poolHeader}>
                    <div className={styles.poolInfo}>
                      <div className={styles.poolIcon}>
                        <span className={styles.poolSymbol}>{pool.tokenASymbol}/{pool.tokenBSymbol}</span>
                      </div>
                      <div className={styles.poolDetails}>
                        <h3 className={styles.poolName}>{pool.lpTokenName}</h3>
                        <p className={styles.poolTokenSymbol}>{pool.lpTokenSymbol}</p>
                      </div>
                    </div>
                    <div className={styles.aprContainer}>
                      <p className={styles.aprLabel}>{ft('apr')}</p>
                      {pool.isLoadingAPR ? (
                        <p className={styles.aprLoading}>Loading...</p>
                      ) : (
                        <p className={styles.aprValue}>
                          {isNaN(pool.apr) || pool.apr <= 0 ? 
                            '0.00%' : 
                            (pool.apr < 100 ? 
                              `${pool.apr.toFixed(2)}%` : 
                              `${Math.floor(pool.apr)}%`)
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <p className={styles.statLabel}>{ft('totalStaked')}</p>
                      <p className={styles.statValue}>{parseFloat(pool.totalStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                    <div className={styles.statItem}>
                      <p className={styles.statLabel}>{ft('walletBalance')}</p>
                      <p className={styles.statValue}>{parseFloat(pool.userBalance).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                  </div>
                  
                  {parseFloat(pool.userStaked) > 0 && (
                    <div className={styles.statsGrid}>
                      <div className={styles.statItem}>
                        <p className={styles.statLabel}>{ft('stakedAmount')}</p>
                        <p className={styles.statValue}>{parseFloat(pool.userStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                      </div>
                      <div className={styles.statItem}>
                        <p className={styles.statLabel}>{ft('pendingRewards')}</p>
                        {isLoadingRewards ? (
                          <div className="flex items-center">
                            <div className="h-4 w-4 mr-2 border-t-2 border-b-2 border-secondary rounded-full animate-spin"></div>
                            <span className="text-secondary">{ft('loading')}</span>
                          </div>
                        ) : (
                          <div className={styles.rewardsContainer}>
                            <p className={styles.rewardsValue}>{parseFloat(pool.pendingRewards).toFixed(4)} AIH</p>
                            {/* Refresh Rewards Button moved inline with small gap */}
                            <button
                              onClick={() => refreshPoolRewards(pool.pid)}
                              disabled={isLoadingRewards}
                              className={styles.refreshButton}
                            >
                              {isLoadingRewards ? '...' : ft('refresh')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className={styles.actionsContainer}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => openDepositModal(pool)}
                      disabled={!isConnected}
                    >
                      {ft('deposit')}
                    </button>
                    
                    {parseFloat(pool.userStaked) > 0 && (
                      <>
                        <button 
                          className={styles.actionButton}
                          onClick={() => openWithdrawModal(pool)}
                          disabled={!isConnected || isWithdrawing}
                        >
                          {ft('withdraw')}
                        </button>
                        
                        <button 
                          className={styles.actionButton}
                          onClick={() => handleHarvest(pool)}
                          disabled={isHarvesting || parseFloat(pool.pendingRewards) <= 0 || pendingTx.type === 'harvest'}
                        >
                          {ft('harvest')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Your Farms */}
      {/* 您的农场 */}
      {activeTab === 'your-farms' && !isLoadingPools && (
        <div>
          {!isConnected ? (
            <div className={styles.warningMessage}>
              <p>{ft('walletWarning')}</p>
            </div>
          ) : userFarmPositions.length === 0 ? (
            <div className={styles.emptyMessage}>
              {ft('noPositions')}
            </div>
          ) : (
            <div className={styles.poolsContainer}>
              {userFarmPositions.map((pool) => (
                <div key={pool.pid} className={styles.poolCard}>
                  <div className={styles.poolHeader}>
                    <div className={styles.poolInfo}>
                      <div className={styles.poolIcon}>
                        <span className={styles.poolSymbol}>{pool.tokenASymbol}/{pool.tokenBSymbol}</span>
                      </div>
                      <div className={styles.poolDetails}>
                        <h3 className={styles.poolName}>{pool.lpTokenName}</h3>
                        <p className={styles.poolTokenSymbol}>{pool.lpTokenSymbol}</p>
                      </div>
                    </div>
                    <div className={styles.aprContainer}>
                      <p className={styles.aprLabel}>{ft('apr')}</p>
                      {pool.isLoadingAPR ? (
                        <p className={styles.aprLoading}>Loading...</p>
                      ) : (
                        <p className={styles.aprValue}>
                          {isNaN(pool.apr) || pool.apr <= 0 ? 
                            '0.00%' : 
                            (pool.apr < 100 ? 
                              `${pool.apr.toFixed(2)}%` : 
                              `${Math.floor(pool.apr)}%`)
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <p className={styles.statLabel}>{ft('stakedAmount')}</p>
                      <p className={styles.statValue}>{parseFloat(pool.userStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                    <div className={styles.statItem}>
                      <p className={styles.statLabel}>{ft('pendingRewards')}</p>
                      {isLoadingRewards ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 mr-2 border-t-2 border-b-2 border-secondary rounded-full animate-spin"></div>
                          <span className="text-secondary">{ft('loading')}</span>
                        </div>
                      ) : (
                        <div className={styles.rewardsContainer}>
                          <p className={styles.rewardsValue}>{parseFloat(pool.pendingRewards).toFixed(4)} AIH</p>
                          {/* Refresh Rewards Button moved inline with small gap */}
                          <button
                            onClick={() => refreshPoolRewards(pool.pid)}
                            disabled={isLoadingRewards}
                            className={styles.refreshButton}
                          >
                            {isLoadingRewards ? '...' : ft('refresh')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.actionsContainer}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => openDepositModal(pool)}
                    >
                      {ft('deposit')}
                    </button>
                    
                    <button 
                      className={styles.actionButton}
                      onClick={() => openWithdrawModal(pool)}
                      disabled={isWithdrawing}
                    >
                      {ft('withdraw')}
                    </button>
                    
                    <button 
                      className={styles.actionButton}
                      onClick={() => handleHarvest(pool)}
                      disabled={isHarvesting || parseFloat(pool.pendingRewards) <= 0 || pendingTx.type === 'harvest'}
                    >
                      {ft('harvest')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Deposit Modal */}
      {/* 存入模态框 */}
      {showDepositModal && selectedPool && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{ft('deposit')} {selectedPool.lpTokenSymbol}</h2>
            
            <div className={styles.modalContent}>
              <p className={styles.balanceInfo}>{ft('walletBalance')}: {parseFloat(selectedPool.userBalance).toFixed(4)} {selectedPool.lpTokenSymbol}</p>
              
              <div className={styles.inputContainer}>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0"
                  className={styles.input}
                />
                <button
                  className={styles.maxButton}
                  onClick={handleMaxDeposit}
                >
                  {ft('max')}
                </button>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDepositModal(false)}
              >
                {ft('cancel')}
              </button>
              
              {parseFloat(selectedPool.userBalance) > 0 && (
                <>
                  <button
                    className={styles.actionButton}
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? ft('approving') : ft('approve')}
                  </button>
                  
                  <button
                    className={styles.actionButton}
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > parseFloat(selectedPool.userBalance)}
                  >
                    {isDepositing ? ft('depositing') : ft('deposit')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Withdraw Modal */}
      {/* 提取模态框 */}
      {showWithdrawModal && selectedPool && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{ft('withdraw')} {selectedPool.lpTokenSymbol}</h2>
            
            <div className={styles.modalContent}>
              <p className={styles.balanceInfo}>{ft('stakedAmount')}: {parseFloat(selectedPool.userStaked).toFixed(4)} {selectedPool.lpTokenSymbol}</p>
              
              <div className={styles.inputContainer}>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className={styles.input}
                />
                <button
                  className={styles.maxButton}
                  onClick={handleMaxWithdraw}
                >
                  {ft('max')}
                </button>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowWithdrawModal(false)}
              >
                {ft('cancel')}
              </button>
              
              <button
                className={styles.actionButton}
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(selectedPool.userStaked)}
              >
                {isWithdrawing ? ft('withdrawing') : ft('withdraw')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Admin Panel if isAdmin */}
      {isAdmin && (
        <div className={styles.adminPanel}>
          <h2 className={styles.adminTitle}>{ft('adminManagePools')}</h2>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{ft('lpTokenAddress')}</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={newLpToken}
                onChange={(e) => {
                  setNewLpToken(e.target.value);
                  // Reset status when address changes
                  setLpTokenStatus({ checked: false, isInFarm: false });
                }}
                placeholder="0x..."
                className={styles.adminInput}
              />
              <button
                className={styles.checkButton}
                onClick={checkLpTokenStatus}
                disabled={!newLpToken || !ethers.utils.isAddress(newLpToken)}
              >
                {ft('checkStatus')}
              </button>
            </div>
          </div>
          
          {lpTokenStatus.checked && (
            <div className={styles.statusBox}>
              <p>
                {ft('statusInFarm')}: {lpTokenStatus.isInFarm 
                  ? `${ft('alreadyInFarm')}${lpTokenStatus.poolId}${
                    lpTokenStatus.allocPoint !== undefined 
                      ? `, ${ft('allocPoints')}: ${lpTokenStatus.allocPoint}${
                        lpTokenStatus.allocPoint === 0 
                          ? ` - ${ft('disabled')}` 
                          : ` - ${ft('active')}`
                        }` 
                      : ''
                    })` 
                  : ft('statusNotInFarm')}
              </p>
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{ft('allocPoints')}</label>
            <input
              type="number"
              value={allocPoint}
              onChange={handleAllocPointChange}
              placeholder="100"
              className={styles.adminInput}
            />
            {/* 显示估计奖励份额 */}
            <div className={styles.rewardEstimate}>
              <span>{`${ft('estimatedShare')}: ${estimatedRewardShare}%`}</span>
              <span>{`${ft('currentTotalPoints')}: ${totalAllocPoints}`}</span>
            </div>
          </div>
          
          <div className={styles.adminButtonsContainer}>
            {lpTokenStatus.isInFarm ? (
              <>
                <button
                  className={styles.updateButton}
                  onClick={handleUpdatePool}
                  disabled={isAddingPool || isUpdatingPool || isDeletingPool}
                >
                  {isUpdatingPool ? ft('updating') : `${ft('updatePool')} ${lpTokenStatus.poolId}`}
                </button>
                
                <button
                  className={styles.disableButton}
                  onClick={handleDisablePool}
                  disabled={isAddingPool || isUpdatingPool || isDeletingPool}
                >
                  {isDeletingPool ? ft('disabling') : `${ft('disablePool')} ${lpTokenStatus.poolId}`}
                </button>
              </>
            ) : (
              <button
                className={styles.updateButton}
                onClick={handleAddLpToken}
                disabled={isAddingPool || isUpdatingPool || isDeletingPool || !newLpToken || !ethers.utils.isAddress(newLpToken)}
              >
                {isAddingPool ? ft('adding') : ft('addLpToken')}
              </button>
            )}
          </div>
          
          <div className={styles.adminNotes}>
            <p>{ft('adminNote1')}</p>
            <p>{ft('adminNote2')}</p>
            <p>{ft('adminNote3')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmPage; 