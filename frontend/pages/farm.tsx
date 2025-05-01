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
  getPendingRewards
} from '@/utils/contracts/farm';
import { getTokenBalance, getTokenSymbol, getTokenName } from '@/utils/contracts/erc20';
import { ethers } from 'ethers';
import { FARM_ADDRESS } from '@/constants/addresses';
import { farmABI } from '@/constants/abis';
import { TokenSymbol } from '@/utils/priceSimulation';
import { usePriceSimulation } from '@/hooks/usePriceSimulation';

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
  depositSuccess: string;
  withdrawSuccess: string;
  harvestSuccess: string;
  approveError: string;
  depositError: string;
  withdrawError: string;
  harvestError: string;
  max: string;
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
  
  // Get account and language from hooks
  // 从钩子获取账户和语言
  const { address, isConnected } = useAccount();
  const { language } = useLanguage();
  
  // Use the price simulation hook
  // 使用价格模拟钩子
  const { prices: tokenPrices } = usePriceSimulation((newPrices) => {
    // This callback runs when prices update
    console.log("Price update detected, refreshing APRs with new prices:", newPrices);
    refreshPoolAPRs();
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
      depositSuccess: 'Deposit successful',
      withdrawSuccess: 'Withdraw successful',
      harvestSuccess: 'Harvest successful',
      approveError: 'Approval failed',
      depositError: 'Deposit failed',
      withdrawError: 'Withdraw failed',
      harvestError: 'Harvest failed',
      max: 'MAX'
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
      depositSuccess: '存入成功',
      withdrawSuccess: '提取成功',
      harvestSuccess: '收获成功',
      approveError: '授权失败',
      depositError: '存入失败',
      withdrawError: '提取失败',
      harvestError: '收获失败',
      max: '最大'
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
    
    return () => setMounted(false);
  }, [router.isReady, router.query]);

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
    try {
      if (!window.ethereum) {
        console.error('No provider found');
        return;
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const poolCount = await getPoolCount(provider);
      const pools: FarmPool[] = [];
      const userPositions: FarmPool[] = [];
      
      // Fetch data for each pool
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
          
          pools.push(pool);
          
          if (address && parseFloat(userStaked) > 0) {
            userPositions.push(pool);
          }
        } catch (error) {
          console.error(`[DeFi Error] Failed to fetch data for pool ${pid}:`, error);
        }
      }
      
      setFarmPools(pools);
      setUserFarmPositions(userPositions);
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
        
        // Refresh data after deposit
        await refreshRewards(); // 先刷新奖励
        fetchPoolsData(); // 然后获取完整池子数据
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
      alert('Please enter a valid LP token address');
      return;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const result = await isLpTokenInFarm(provider, newLpToken);
      
      // 如果在Farm中，获取allocPoint信息
      let allocPointValue;
      if (result.isInFarm && result.poolId !== undefined) {
        try {
          const poolInfo = await getPoolInfo(provider, result.poolId);
          allocPointValue = poolInfo ? poolInfo.allocPoint : undefined;
        } catch (e) {
          console.error("Error getting pool allocPoint:", e);
        }
      }
      
      setLpTokenStatus({
        checked: true,
        isInFarm: result.isInFarm,
        poolId: result.poolId,
        allocPoint: allocPointValue
      });
      
      if (result.isInFarm) {
        const statusText = allocPointValue === 0 
          ? `LP token already in farm (Pool ID: ${result.poolId}) - 已禁用`
          : `LP token already in farm (Pool ID: ${result.poolId}) - 活跃中`;
        showNotification('info', statusText);
      } else {
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
  
  // Render the token price displays
  // 渲染代币价格显示
  const renderTokenPrices = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {Object.entries(tokenPrices).map(([token, price]) => (
          <div key={token} className="flex flex-col items-center p-2 bg-white dark:bg-gray-700 rounded shadow">
            <span className="font-bold text-sm">{token}</span>
            <span className="text-green-600 dark:text-green-400">${price.toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Main render function
  // 主渲染函数
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{ft('farm')}</h1>
      
      {/* Token Price Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Token Prices (Simulated)</h2>
        {renderTokenPrices()}
      </div>
      
      {!isConnected && (
        <div className="bg-dark-lighter bg-opacity-50 border-l-4 border-primary text-white p-4 mb-6 rounded-md">
          <p>{ft('walletWarning')}</p>
        </div>
      )}
      
      {/* Notification component */}
      {/* 通知组件 */}
      {notification && (
        <div className={`fixed top-20 right-4 p-4 rounded-md shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-dark-lighter border border-secondary text-secondary' :
          notification.type === 'error' ? 'bg-dark-lighter border border-red-500 text-red-400' :
          notification.type === 'info' ? 'bg-dark-lighter border border-blue-500 text-blue-400' :
          'bg-dark-lighter border border-primary text-primary'
        }`}>
          <div className="flex items-center">
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
      <div className="mb-4 flex flex-wrap items-center justify-between bg-dark-light p-3 rounded-lg">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <label className="text-sm text-gray-400">Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-dark-lighter text-white border border-primary/30 rounded px-2 py-1 text-sm"
          >
            <option value="apr">APR</option>
            <option value="totalStaked">Total Staked</option>
            <option value="userStaked">Your Stake</option>
            <option value="pendingRewards">Pending Rewards</option>
          </select>
          
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="bg-dark-lighter text-white border border-primary/30 rounded px-2 py-1 text-sm"
          >
            {sortDirection === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">Filter:</label>
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value as FilterOption)}
            className="bg-dark-lighter text-white border border-primary/30 rounded px-2 py-1 text-sm"
          >
            <option value="all">All Pools</option>
            <option value="stakedOnly">Staked Only</option>
          </select>
          
          <button
            onClick={refreshRewards}
            disabled={isLoadingRewards}
            className="bg-secondary hover:bg-secondary-hover text-dark-default rounded px-2 py-1 text-sm font-semibold"
          >
            {isLoadingRewards ? 'Refreshing...' : 'Refresh Rewards'}
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      {/* 标签页 */}
      <div className="flex border-b border-primary/20 mb-6">
        <button 
          className={`py-2 px-4 ${activeTab === 'available' ? 'border-b-2 border-secondary text-secondary font-semibold' : 'text-gray-300 hover:text-primary'}`}
          onClick={() => setActiveTab('available')}
        >
          {ft('availablePools')}
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'your-farms' ? 'border-b-2 border-secondary text-secondary font-semibold' : 'text-gray-300 hover:text-primary'}`}
          onClick={() => setActiveTab('your-farms')}
        >
          {ft('yourFarms')}
        </button>
      </div>
      
      {/* Loading Indicator */}
      {/* 加载指示器 */}
      {isLoadingPools && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-3 text-white">Loading pools...</span>
        </div>
      )}
      
      {/* Available Pools */}
      {/* 可用的池子 */}
      {activeTab === 'available' && !isLoadingPools && (
        <div>
          {filteredAndSortedPools.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              No pools found matching your filters
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedPools.map((pool) => (
                <div key={pool.pid} className="bg-dark-light rounded-lg shadow-md p-4 border border-primary/10 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-dark-lighter rounded-full flex items-center justify-center mr-3 border border-primary/20">
                        <span className="text-sm font-semibold text-white">{pool.tokenASymbol}/{pool.tokenBSymbol}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{pool.lpTokenName}</h3>
                        <p className="text-sm text-gray-400">{pool.lpTokenSymbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{ft('apr')}</p>
                      {pool.isLoadingAPR ? (
                        <p className="text-lg font-bold text-blue-500 animate-pulse">Loading...</p>
                      ) : (
                        <p className="font-semibold text-secondary">
                          {isNaN(pool.apr) || pool.apr <= 0 ? 
                            '0.00%' : 
                            `${pool.apr.toFixed(2)}%`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">{ft('totalStaked')}</p>
                      <p className="font-semibold text-white">{parseFloat(pool.totalStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">{ft('walletBalance')}</p>
                      <p className="font-semibold text-white">{parseFloat(pool.userBalance).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                  </div>
                  
                  {parseFloat(pool.userStaked) > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400">{ft('stakedAmount')}</p>
                        <p className="font-semibold text-white">{parseFloat(pool.userStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">{ft('pendingRewards')}</p>
                        {isLoadingRewards ? (
                          <div className="flex items-center">
                            <div className="h-4 w-4 mr-2 border-t-2 border-b-2 border-secondary rounded-full animate-spin"></div>
                            <span className="text-secondary">Loading...</span>
                          </div>
                        ) : (
                          <p className="font-semibold text-secondary">{parseFloat(pool.pendingRewards).toFixed(4)} AIH</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <button 
                      className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors"
                      onClick={() => openDepositModal(pool)}
                      disabled={!isConnected}
                    >
                      {ft('deposit')}
                    </button>
                    
                    {parseFloat(pool.userStaked) > 0 && (
                      <>
                        <button 
                          className="bg-dark-lighter hover:bg-dark-default text-white border border-primary/50 px-4 py-2 rounded-md transition-colors"
                          onClick={() => openWithdrawModal(pool)}
                          disabled={!isConnected || isWithdrawing}
                        >
                          {ft('withdraw')}
                        </button>
                        
                        <button 
                          className="bg-secondary hover:bg-secondary-hover text-dark-default px-4 py-2 rounded-md font-semibold transition-colors"
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
            <div className="bg-dark-lighter bg-opacity-50 border-l-4 border-primary text-white p-4 rounded-md">
              <p>{ft('walletWarning')}</p>
            </div>
          ) : userFarmPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              {ft('noPositions')}
            </div>
          ) : (
            <div className="space-y-4">
              {userFarmPositions.map((pool) => (
                <div key={pool.pid} className="bg-dark-light rounded-lg shadow-md p-4 border border-primary/10 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-dark-lighter rounded-full flex items-center justify-center mr-3 border border-primary/20">
                        <span className="text-sm font-semibold text-white">{pool.tokenASymbol}/{pool.tokenBSymbol}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{pool.lpTokenName}</h3>
                        <p className="text-sm text-gray-400">{pool.lpTokenSymbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{ft('apr')}</p>
                      {pool.isLoadingAPR ? (
                        <p className="text-lg font-bold text-blue-500 animate-pulse">Loading...</p>
                      ) : (
                        <p className="font-semibold text-secondary">
                          {isNaN(pool.apr) || pool.apr <= 0 ? 
                            '0.00%' : 
                            `${pool.apr.toFixed(2)}%`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">{ft('stakedAmount')}</p>
                      <p className="font-semibold text-white">{parseFloat(pool.userStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">{ft('pendingRewards')}</p>
                      {isLoadingRewards ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 mr-2 border-t-2 border-b-2 border-secondary rounded-full animate-spin"></div>
                          <span className="text-secondary">Loading...</span>
                        </div>
                      ) : (
                        <p className="font-semibold text-secondary">{parseFloat(pool.pendingRewards).toFixed(4)} AIH</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button 
                      className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors"
                      onClick={() => openDepositModal(pool)}
                    >
                      {ft('deposit')}
                    </button>
                    
                    <button 
                      className="bg-dark-lighter hover:bg-dark-default text-white border border-primary/50 px-4 py-2 rounded-md transition-colors"
                      onClick={() => openWithdrawModal(pool)}
                      disabled={isWithdrawing}
                    >
                      {ft('withdraw')}
                    </button>
                    
                    <button 
                      className="bg-secondary hover:bg-secondary-hover text-dark-default px-4 py-2 rounded-md font-semibold transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-light rounded-lg p-6 max-w-md w-full border border-primary/20">
            <h2 className="text-xl font-semibold mb-4 text-white">{ft('deposit')} {selectedPool.lpTokenSymbol}</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">{ft('walletBalance')}: {parseFloat(selectedPool.userBalance).toFixed(4)} {selectedPool.lpTokenSymbol}</p>
              
              <div className="flex items-center border border-primary/30 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 p-2 outline-none bg-white text-black placeholder-gray-500"
                />
                <button
                  className="bg-dark-lighter px-3 py-1 text-sm text-secondary hover:bg-dark-light transition-colors"
                  onClick={handleMaxDeposit}
                >
                  {ft('max')}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                className="bg-dark-lighter hover:bg-dark-default text-white px-4 py-2 rounded-md border border-primary/30 transition-colors"
                onClick={() => setShowDepositModal(false)}
              >
                Cancel
              </button>
              
              {parseFloat(selectedPool.userBalance) > 0 && (
                <>
                  <button
                    className="bg-dark-lighter hover:bg-dark-default text-white border border-primary/50 px-4 py-2 rounded-md transition-colors"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? ft('approving') : 'Approve'}
                  </button>
                  
                  <button
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-light rounded-lg p-6 max-w-md w-full border border-primary/20">
            <h2 className="text-xl font-semibold mb-4 text-white">{ft('withdraw')} {selectedPool.lpTokenSymbol}</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">{ft('stakedAmount')}: {parseFloat(selectedPool.userStaked).toFixed(4)} {selectedPool.lpTokenSymbol}</p>
              
              <div className="flex items-center border border-primary/30 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 p-2 outline-none bg-white text-black placeholder-gray-500"
                />
                <button
                  className="bg-dark-lighter px-3 py-1 text-sm text-secondary hover:bg-dark-light transition-colors"
                  onClick={handleMaxWithdraw}
                >
                  {ft('max')}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                className="bg-dark-lighter hover:bg-dark-default text-white px-4 py-2 rounded-md border border-primary/30 transition-colors"
                onClick={() => setShowWithdrawModal(false)}
              >
                取消
              </button>
              
              <button
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors"
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
        <div className="mt-8 p-4 border border-primary/20 rounded-lg bg-dark-light">
          <h2 className="text-xl font-bold mb-4 text-white">Admin: Manage Farm Pools</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-300">LP Token Address</label>
            <div className="flex">
              <input
                type="text"
                value={newLpToken}
                onChange={(e) => {
                  setNewLpToken(e.target.value);
                  // Reset status when address changes
                  setLpTokenStatus({ checked: false, isInFarm: false });
                }}
                placeholder="0x..."
                className="flex-1 p-2 border border-primary/30 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-primary"
                style={{background: 'white', color: 'black'}}
              />
              <button
                className="ml-2 bg-secondary hover:bg-secondary-hover text-dark-default px-4 py-2 rounded-md transition-colors font-semibold"
                onClick={checkLpTokenStatus}
                disabled={!newLpToken || !ethers.utils.isAddress(newLpToken)}
              >
                Check Status
              </button>
            </div>
          </div>
          
          {lpTokenStatus.checked && (
            <div className="mb-4 p-2 border rounded-md bg-dark-default border-primary/20 text-white">
              <p>
                Status: {lpTokenStatus.isInFarm 
                  ? `Already in farm (Pool ID: ${lpTokenStatus.poolId}${
                    lpTokenStatus.allocPoint !== undefined 
                      ? `, Allocation Points: ${lpTokenStatus.allocPoint}${
                        lpTokenStatus.allocPoint === 0 
                          ? ' - 已禁用' 
                          : ' - 活跃中'
                        }` 
                      : ''
                    })` 
                  : 'Not yet in farm'}
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-300">Allocation Points</label>
            <input
              type="number"
              value={allocPoint}
              onChange={(e) => setAllocPoint(e.target.value)}
              placeholder="100"
              className="w-full p-2 border border-primary/30 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-primary"
              style={{background: 'white', color: 'black'}}
            />
          </div>
          
          <div className="flex space-x-2">
            {lpTokenStatus.isInFarm ? (
              <>
                <button
                  className="bg-secondary hover:bg-secondary-hover text-dark-default px-4 py-2 rounded-md transition-colors font-semibold"
                  onClick={handleUpdatePool}
                  disabled={isAddingPool || isUpdatingPool || isDeletingPool}
                >
                  {isUpdatingPool ? 'Updating...' : `Update Pool ${lpTokenStatus.poolId}`}
                </button>
                
                <button
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                  onClick={handleDisablePool}
                  disabled={isAddingPool || isUpdatingPool || isDeletingPool}
                >
                  {isDeletingPool ? '禁用中...' : `禁用池子 ${lpTokenStatus.poolId}`}
                </button>
              </>
            ) : (
              <button
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors"
                onClick={handleAddLpToken}
                disabled={isAddingPool || isUpdatingPool || isDeletingPool || !newLpToken || !ethers.utils.isAddress(newLpToken)}
              >
                {isAddingPool ? 'Adding...' : 'Add LP Token to Farm'}
              </button>
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            <p>注意：只有合约所有者才能添加新池子或更新现有池子。</p>
            <p>禁用池子是将分配点数设置为0，而不是完全删除。这是最安全的方法。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmPage; 