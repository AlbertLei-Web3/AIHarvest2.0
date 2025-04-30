import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { 
  getFarmContract, 
  getUserFarmPositions, 
  approveLPTokenForFarm,
  deposit,
  withdraw,
  harvest,
  getPoolCount,
  getPoolInfo,
  getPoolAPR
} from '@/utils/contracts/farm';
import { getTokenBalance, getTokenSymbol, getTokenName } from '@/utils/contracts/erc20';
import { ethers } from 'ethers';

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
  totalStaked: string;
  userBalance: string;
  userStaked: string;
  pendingRewards: string;
  tokenASymbol: string;
  tokenBSymbol: string;
}

// Define farm pools with the provided LP tokens
// 使用提供的LP代币定义农场池
const predefinedPools = [
  {
    lpToken: "0x224a991758c98e5Ce849600c7b00A572d46d08f6",
    lpTokenName: "TD-FHBI LP Token",
    lpTokenSymbol: "TD-FHBILP",
    tokenASymbol: "TD",
    tokenBSymbol: "FHBI"
  },
  {
    lpToken: "0x7CB70b6717b8469DB3Ea2c6c90e9934410459Af3",
    lpTokenName: "FHBI2-FHBI3 LP Token",
    lpTokenSymbol: "FHBI2-FHBI3LP",
    tokenASymbol: "FHBI2",
    tokenBSymbol: "FHBI3"
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
type NotificationType = 'success' | 'error' | 'loading' | null;

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
  
  // Get account and language from hooks
  // 从钩子获取账户和语言
  const { address, isConnected } = useAccount();
  const { language } = useLanguage();
  
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
  
  // Initialize component on mount
  // 在挂载时初始化组件
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Fetch data when wallet is connected
  // 当钱包连接时获取数据
  useEffect(() => {
    if (isConnected && address && mounted) {
      fetchPoolsData();
    }
  }, [isConnected, address, mounted]);
  
  // Fetch all farm pools data
  // 获取所有农场池数据
  const fetchPoolsData = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      // Get pools from smart contract
      // 从智能合约获取池子
      const poolCount = await getPoolCount(provider);
      const pools: FarmPool[] = [];
      const positions: FarmPool[] = [];
      
      // Process each pool
      // 处理每个池子
      for (let pid = 0; pid < poolCount; pid++) {
        const poolInfo = await getPoolInfo(provider, pid);
        
        if (!poolInfo) continue;
        
        const lpTokenAddress = poolInfo.lpToken.toLowerCase();
        
        // Look up known LP tokens
        // 查找已知的LP代币
        let tokenName = "Unknown LP Token";
        let tokenSymbol = "LP";
        let tokenASymbol = "TokenA";
        let tokenBSymbol = "TokenB";
        
        // Use predefined LP token details if available
        // 如果可用，使用预定义的LP代币详情
        if (lpTokenDetails[lpTokenAddress]) {
          tokenName = lpTokenDetails[lpTokenAddress].name;
          tokenSymbol = lpTokenDetails[lpTokenAddress].symbol;
          tokenASymbol = lpTokenDetails[lpTokenAddress].tokenA;
          tokenBSymbol = lpTokenDetails[lpTokenAddress].tokenB;
        } else {
          // Try to get token name and symbol from contract if not predefined
          // 如果未预定义，尝试从合约获取代币名称和符号
          try {
            tokenName = await getTokenName(poolInfo.lpToken);
            tokenSymbol = await getTokenSymbol(poolInfo.lpToken);
          } catch (e) {
            console.error(`Failed to get token info for ${poolInfo.lpToken}:`, e);
          }
        }
        
        // Get APR and other pool metrics
        // 获取APR和其他池指标
        const apr = await getPoolAPR(provider, pid);
        
        // Get token balance if connected
        // 如果已连接，获取代币余额
        let userBalance = '0';
        let userStaked = '0';
        let pendingRewards = '0';
        
        if (isConnected && address) {
          userBalance = await getTokenBalance(poolInfo.lpToken, address);
          
          try {
            // Get user's position in this pool using farm contract directly
            // 直接使用farm合约获取用户在此池中的仓位
            const farmContract = getFarmContract(provider);
            const userInfo = await farmContract.getUserInfo(pid, address);
            
            if (userInfo) {
              userStaked = ethers.utils.formatUnits(userInfo.amount, 18);
              // Get pending rewards directly from contract
              pendingRewards = ethers.utils.formatUnits(
                await farmContract.pendingAIH(pid, address), 
                18
              );
              
              // If user has staked, add to positions
              // 如果用户已质押，添加到仓位
              if (parseFloat(userStaked) > 0) {
                const position: FarmPool = {
                  pid,
                  lpToken: poolInfo.lpToken,
                  lpTokenName: tokenName,
                  lpTokenSymbol: tokenSymbol,
                  apr,
                  totalStaked: ethers.utils.formatUnits(poolInfo.totalStaked, 18),
                  userBalance,
                  userStaked,
                  pendingRewards,
                  tokenASymbol,
                  tokenBSymbol
                };
                
                positions.push(position);
              }
            }
          } catch (error) {
            console.error(`Error getting user data for pool ${pid}:`, error);
          }
        }
        
        // Create pool object
        // 创建池对象
        const pool: FarmPool = {
          pid,
          lpToken: poolInfo.lpToken,
          lpTokenName: tokenName,
          lpTokenSymbol: tokenSymbol,
          apr,
          totalStaked: ethers.utils.formatUnits(poolInfo.totalStaked, 18),
          userBalance,
          userStaked,
          pendingRewards,
          tokenASymbol,
          tokenBSymbol
        };
        
        pools.push(pool);
      }
      
      setFarmPools(pools);
      setUserFarmPositions(positions);
    } catch (error) {
      console.error('Error fetching farm pools:', error);
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
    if (!selectedPool || !depositAmount || parseFloat(depositAmount) <= 0) return;
    
    setIsDepositing(true);
    showNotification('loading', ft('depositing'));
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      const tx = await deposit(signer, selectedPool.pid, depositAmount);
      await tx.wait();
      
      showNotification('success', ft('depositSuccess'));
      setShowDepositModal(false);
      setDepositAmount('');
      
      // Refresh data after deposit
      fetchPoolsData();
    } catch (error) {
      console.error('Deposit error:', error);
      showNotification('error', ft('depositError'));
    } finally {
      setIsDepositing(false);
    }
  };
  
  // Handle withdraw
  // 处理提取
  const handleWithdraw = async () => {
    if (!selectedPool || !address || !withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    
    try {
      setIsWithdrawing(true);
      showNotification('loading', ft('withdrawing'));
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      const tx = await withdraw(signer, selectedPool.pid, withdrawAmount);
      await tx.wait();
      
      showNotification('success', ft('withdrawSuccess'));
      setIsWithdrawing(false);
      setShowWithdrawModal(false);
      
      // Refresh data
      // 刷新数据
      fetchPoolsData();
    } catch (error) {
      console.error('Withdraw error:', error);
      showNotification('error', ft('withdrawError'));
      setIsWithdrawing(false);
    }
  };
  
  // Handle harvest
  // 处理收获
  const handleHarvest = async (pool: FarmPool) => {
    if (!address) return;
    
    try {
      setIsHarvesting(true);
      showNotification('loading', ft('harvesting'));
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      const tx = await harvest(signer, pool.pid);
      await tx.wait();
      
      showNotification('success', ft('harvestSuccess'));
      setIsHarvesting(false);
      
      // Refresh data
      // 刷新数据
      fetchPoolsData();
    } catch (error) {
      console.error('Harvest error:', error);
      showNotification('error', ft('harvestError'));
      setIsHarvesting(false);
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
  
  // Main render function
  // 主渲染函数
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">{ft('farm')}</h1>
      
      {!isConnected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p>{ft('walletWarning')}</p>
        </div>
      )}
      
      {/* Notification component */}
      {/* 通知组件 */}
      {notification && (
        <div className={`fixed top-20 right-4 p-4 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' :
          notification.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' && <span className="mr-2">✅</span>}
            {notification.type === 'error' && <span className="mr-2">❌</span>}
            {notification.type === 'loading' && <span className="mr-2">⏳</span>}
            <p>{notification.message}</p>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      {/* 标签页 */}
      <div className="flex border-b mb-6">
        <button 
          className={`py-2 px-4 ${activeTab === 'available' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('available')}
        >
          {ft('availablePools')}
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'your-farms' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('your-farms')}
        >
          {ft('yourFarms')}
        </button>
      </div>
      
      {/* Available Pools */}
      {/* 可用的池子 */}
      {activeTab === 'available' && (
        <div>
          {farmPools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Loading pools...
            </div>
          ) : (
            <div className="space-y-4">
              {farmPools.map((pool) => (
                <div key={pool.pid} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold">{pool.tokenASymbol}/{pool.tokenBSymbol}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{pool.lpTokenName}</h3>
                        <p className="text-sm text-gray-500">{pool.lpTokenSymbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{ft('apr')}</p>
                      <p className="font-semibold text-green-600">{pool.apr.toFixed(2)}%</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">{ft('totalStaked')}</p>
                      <p className="font-semibold">{parseFloat(pool.totalStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{ft('walletBalance')}</p>
                      <p className="font-semibold">{parseFloat(pool.userBalance).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                  </div>
                  
                  {parseFloat(pool.userStaked) > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">{ft('stakedAmount')}</p>
                        <p className="font-semibold">{parseFloat(pool.userStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{ft('pendingRewards')}</p>
                        <p className="font-semibold">{parseFloat(pool.pendingRewards).toFixed(4)} AIH</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <button 
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                      onClick={() => openDepositModal(pool)}
                      disabled={!isConnected}
                    >
                      {ft('deposit')}
                    </button>
                    
                    {parseFloat(pool.userStaked) > 0 && (
                      <>
                        <button 
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                          onClick={() => openWithdrawModal(pool)}
                          disabled={!isConnected || isWithdrawing}
                        >
                          {ft('withdraw')}
                        </button>
                        
                        <button 
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                          onClick={() => handleHarvest(pool)}
                          disabled={!isConnected || isHarvesting || parseFloat(pool.pendingRewards) <= 0}
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
      {activeTab === 'your-farms' && (
        <div>
          {!isConnected ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
              <p>{ft('walletWarning')}</p>
            </div>
          ) : userFarmPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {ft('noPositions')}
            </div>
          ) : (
            <div className="space-y-4">
              {userFarmPositions.map((pool) => (
                <div key={pool.pid} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold">{pool.tokenASymbol}/{pool.tokenBSymbol}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{pool.lpTokenName}</h3>
                        <p className="text-sm text-gray-500">{pool.lpTokenSymbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{ft('apr')}</p>
                      <p className="font-semibold text-green-600">{pool.apr.toFixed(2)}%</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">{ft('stakedAmount')}</p>
                      <p className="font-semibold">{parseFloat(pool.userStaked).toFixed(4)} {pool.lpTokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{ft('pendingRewards')}</p>
                      <p className="font-semibold">{parseFloat(pool.pendingRewards).toFixed(4)} AIH</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button 
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                      onClick={() => openDepositModal(pool)}
                    >
                      {ft('deposit')}
                    </button>
                    
                    <button 
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                      onClick={() => openWithdrawModal(pool)}
                      disabled={isWithdrawing}
                    >
                      {ft('withdraw')}
                    </button>
                    
                    <button 
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                      onClick={() => handleHarvest(pool)}
                      disabled={isHarvesting || parseFloat(pool.pendingRewards) <= 0}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">{ft('deposit')} {selectedPool.lpTokenSymbol}</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">{ft('walletBalance')}: {parseFloat(selectedPool.userBalance).toFixed(4)} {selectedPool.lpTokenSymbol}</p>
              
              <div className="flex items-center border rounded-md overflow-hidden">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 p-2 outline-none"
                />
                <button
                  className="bg-gray-200 px-2 py-1 text-sm"
                  onClick={handleMaxDeposit}
                >
                  {ft('max')}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                onClick={() => setShowDepositModal(false)}
              >
                Cancel
              </button>
              
              {parseFloat(selectedPool.userBalance) > 0 && (
                <>
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mr-2"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? ft('approving') : 'Approve'}
                  </button>
                  
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">{ft('withdraw')} {selectedPool.lpTokenSymbol}</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">{ft('stakedAmount')}: {parseFloat(selectedPool.userStaked).toFixed(4)} {selectedPool.lpTokenSymbol}</p>
              
              <div className="flex items-center border rounded-md overflow-hidden">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 p-2 outline-none"
                />
                <button
                  className="bg-gray-200 px-2 py-1 text-sm"
                  onClick={handleMaxWithdraw}
                >
                  {ft('max')}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </button>
              
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(selectedPool.userStaked)}
              >
                {isWithdrawing ? ft('withdrawing') : ft('withdraw')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmPage; 