import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { getAllPools } from '../utils/farmContracts';
import YieldFarming from './YieldFarming';
import { TOKENS } from '../utils/contracts/addresses';
import { useLanguage } from '@/components/layout/Header';
import { useLiquidity } from '@/contexts/LiquidityContext';
import { isLpToken, getPairAddressFromLpToken } from '@/utils/lpTokenMapping';
import { ethers } from 'ethers';

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
  };
  token2: {
    symbol: string;
    address: string;
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

// Notification type
type NotificationType = 'success' | 'error' | 'loading' | null;

// Farm operation type
type FarmOperation = 'approve' | 'stake' | 'unstake' | 'claim' | 'emergency_withdraw' | 'refresh';

const FarmList: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { language } = useLanguage();
  const { lpTokens, refreshLpTokens, lastUpdated } = useLiquidity();
  
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('apy-desc');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  // Load farm data
  const loadFarms = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all farm pools
      const poolsData = await getAllPools();
      
      // Process farm data
      const processedFarms = await Promise.all(poolsData.map(async (pool: any) => {
        // Check if the pool LP token is a valid LP token
        const validLpToken = await isLpToken(pool.lpToken);
        if (!validLpToken) {
          console.warn(`Pool ${pool.pid} has an invalid LP token: ${pool.lpToken}`);
        }

        // Get pair address from LP token for matching with liquidity positions
        let pairAddress = pool.lpToken;
        try {
          pairAddress = await getPairAddressFromLpToken(pool.lpToken);
        } catch (err) {
          console.warn(`Failed to get pair address for LP token ${pool.lpToken}:`, err);
        }

        // Try to find matching LP token in user's liquidity positions
        const matchingPosition = lpTokens.find(lp => 
          lp.pairAddress?.toLowerCase() === pairAddress.toLowerCase() ||
          lp.lpTokenAddress?.toLowerCase() === pool.lpToken.toLowerCase()
        );
        
        // If we found a matching position, update the farm data accordingly
        let stakedAmount = pool.userInfo?.amount || '0';
        let isApproved = !!pool.userInfo?.isApproved;

        // If we have data about the user's LP tokens, we can provide better information
        if (matchingPosition) {
          console.log(`Found matching LP position for pool ${pool.pid}:`, matchingPosition);
          
          // We can update token symbols if they're missing in the pool data
          const token1Symbol = pool.tokenASymbol || matchingPosition.token0.symbol;
          const token2Symbol = pool.tokenBSymbol || matchingPosition.token1.symbol;
          
          return {
            id: pool.pid.toString(),
            name: `${token1Symbol}-${token2Symbol}`,
            lpToken: pool.lpToken,
            token1: {
              symbol: token1Symbol,
              address: pool.tokenA || matchingPosition.token0.address
            },
            token2: {
              symbol: token2Symbol,
              address: pool.tokenB || matchingPosition.token1.address
            },
            apy: parseFloat(pool.apy || '0'),
            tvl: parseFloat(pool.tvl || '0'),
            stakedAmount,
            pendingRewards: pool.userInfo?.pendingRewards || '0',
            isApproved,
            status: pool.status || 'active',
            startTime: pool.startTime,
            endTime: pool.endTime
          };
        }
        
        // Default case if no matching position found
        return {
          id: pool.pid.toString(),
          name: `${pool.tokenASymbol || 'Unknown'}-${pool.tokenBSymbol || 'Unknown'}`,
          lpToken: pool.lpToken,
          token1: {
            symbol: pool.tokenASymbol || 'Unknown',
            address: pool.tokenA || ''
          },
          token2: {
            symbol: pool.tokenBSymbol || 'Unknown',
            address: pool.tokenB || ''
          },
          apy: parseFloat(pool.apy || '0'),
          tvl: parseFloat(pool.tvl || '0'),
          stakedAmount,
          pendingRewards: pool.userInfo?.pendingRewards || '0',
          isApproved,
          status: pool.status || 'active',
          startTime: pool.startTime,
          endTime: pool.endTime
        };
      }));

      // If we didn't find any pools or failed to load them, generate mock data
      setFarms(processedFarms.length > 0 ? processedFarms : generateMockFarms());
    } catch (error) {
      console.error("Error loading farms:", error);
      setError(language === 'zh' ? "加载农场失败，请稍后再试。" : "Failed to load farms. Please try again later.");
      // Use mock data as fallback
      setFarms(generateMockFarms());
    } finally {
      setLoading(false);
    }
  };

  // Load farms on component mount, when account changes, or when LP tokens change
  useEffect(() => {
    loadFarms();
    
    // Set up refresh interval (every 30 seconds)
    const interval = setInterval(loadFarms, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [address, isConnected, lastUpdated]);

  // Generate mock farms data for development
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
            address: TOKENS[token1 as keyof typeof TOKENS] || ''
          },
          token2: {
            symbol: token2,
            address: TOKENS[token2 as keyof typeof TOKENS] || ''
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

  // Show notification
  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
    
    if (type !== 'loading') {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  // Handle farm updates and refresh LP tokens
  const handleFarmUpdate = async (operation: FarmOperation = 'refresh') => {
    await refreshLpTokens();
    await loadFarms();
    
    // Show different notification messages based on operation type
    let successMessage = '';
    if (language === 'zh') {
      switch (operation) {
        case 'approve':
          successMessage = "代币授权成功";
          break;
        case 'stake':
          successMessage = "质押成功，数据已更新";
          break;
        case 'unstake':
          successMessage = "解除质押成功，数据已更新";
          break;
        case 'claim':
          successMessage = "奖励已成功领取";
          break;
        case 'emergency_withdraw':
          successMessage = "紧急提取成功，资金已返还";
          break;
        default:
          successMessage = "操作成功，数据已更新";
      }
    } else {
      switch (operation) {
        case 'approve':
          successMessage = "Token approval successful";
          break;
        case 'stake':
          successMessage = "Staking successful, data updated";
          break;
        case 'unstake':
          successMessage = "Unstaking successful, data updated";
          break;
        case 'claim':
          successMessage = "Rewards claimed successfully";
          break;
        case 'emergency_withdraw':
          successMessage = "Emergency withdrawal successful, funds returned";
          break;
        default:
          successMessage = "Operation successful, data updated";
      }
    }
    
    showNotification('success', successMessage);
  };

  // Apply filters and sorting to farms
  const filteredAndSortedFarms = useMemo(() => {
    // First apply token filter
    let filtered = farms;
    
    if (tokenFilter !== 'all') {
      filtered = farms.filter(farm => 
        farm.token1.symbol === tokenFilter || farm.token2.symbol === tokenFilter
      );
    }
    
    // Then apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(farm => farm.status === statusFilter);
    }
    
    // Apply search filter if there's a search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(farm => 
        farm.name.toLowerCase().includes(search) ||
        farm.token1.symbol.toLowerCase().includes(search) ||
        farm.token2.symbol.toLowerCase().includes(search) ||
        farm.lpToken.toLowerCase().includes(search)
      );
    }
    
    // Sort the filtered list
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'apy-desc':
          return b.apy - a.apy;
        case 'apy-asc':
          return a.apy - b.apy;
        case 'tvl-desc':
          return b.tvl - a.tvl;
        case 'tvl-asc':
          return a.tvl - b.tvl;
        default:
          return 0;
      }
    });
  }, [farms, sortOption, tokenFilter, statusFilter, searchTerm]);

  // Get translation based on current language
  const t = (en: string, zh: string) => language === 'zh' ? zh : en;

  return (
    <div className="mb-6">
      <div className="bg-gray-800 rounded-xl p-6 shadow-md mb-6 border border-gray-700">
        {/* Filters and Sort */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("Search farms...", "搜索农场...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            />
          </div>
          
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            >
              <option value="apy-desc">{t("APY (High to Low)", "APY (从高到低)")}</option>
              <option value="apy-asc">{t("APY (Low to High)", "APY (从低到高)")}</option>
              <option value="tvl-desc">{t("TVL (High to Low)", "TVL (从高到低)")}</option>
              <option value="tvl-asc">{t("TVL (Low to High)", "TVL (从低到高)")}</option>
            </select>
          </div>
          
          <div>
            <select
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value as TokenFilter)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            >
              <option value="all">{t("All Tokens", "所有代币")}</option>
              <option value="TD">TD</option>
              <option value="FHBI">FHBI</option>
              <option value="FHBI2">FHBI2</option>
              <option value="FHBI3">FHBI3</option>
              <option value="RTK">RTK</option>
            </select>
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            >
              <option value="all">{t("All Status", "所有状态")}</option>
              <option value="active">{t("Active", "活跃")}</option>
              <option value="upcoming">{t("Upcoming", "即将开始")}</option>
              <option value="ended">{t("Ended", "已结束")}</option>
            </select>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 p-4 rounded-lg border border-blue-800">
            <h3 className="text-sm text-gray-400">{t("Total Farms", "农场总数")}</h3>
            <p className="text-xl font-bold text-white">{farms.length}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-green-800">
            <h3 className="text-sm text-gray-400">{t("Active Farms", "活跃农场")}</h3>
            <p className="text-xl font-bold text-white">{farms.filter(f => f.status === 'active').length}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-yellow-800">
            <h3 className="text-sm text-gray-400">{t("Total TVL", "总锁定价值")}</h3>
            <p className="text-xl font-bold text-white">${(farms.reduce((sum, farm) => sum + farm.tvl, 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-purple-800">
            <h3 className="text-sm text-gray-400">{t("Your Pending Rewards", "你的待领取奖励")}</h3>
            <p className="text-xl font-bold text-white">{(farms.reduce((sum, farm) => sum + parseFloat(farm.pendingRewards), 0)).toLocaleString('en-US', { maximumFractionDigits: 4 })} AIH</p>
          </div>
        </div>

        {/* LP Tokens Summary */}
        <div className="bg-gray-900 p-4 rounded-lg border border-indigo-800 mb-6">
          <h3 className="text-sm text-gray-400 mb-2">{t("Your LP Tokens", "你的LP代币")}</h3>
          {lpTokens.length === 0 ? (
            <p className="text-white">{t("You don't have any LP tokens. Add liquidity first to get LP tokens.", "您没有任何LP代币。请先添加流动性以获取LP代币。")}</p>
          ) : (
            <div className="space-y-2">
              {lpTokens.map((token, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="text-white">{token.token0.symbol}-{token.token1.symbol}</div>
                  <div className="text-white">{parseFloat(token.balance).toFixed(4)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <button
              onClick={refreshLpTokens}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              {t("Refresh LP Tokens", "刷新LP代币")}
            </button>
          </div>
        </div>
      </div>
      
      {/* Farm List */}
      {loading ? (
        <div className="text-center py-10 text-white">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>{t("Loading farms...", "加载农场中...")}</p>
        </div>
      ) : error ? (
        <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded-xl relative" role="alert">
          <strong className="font-bold">{t("Error!", "错误!")}</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : filteredAndSortedFarms.length === 0 ? (
        <div className="text-center py-10 text-white">
          <p>{t("No farms found matching your criteria.", "没有找到符合条件的农场。")}</p>
        </div>
      ) : (
        <div>
          {filteredAndSortedFarms.map(farm => (
            <YieldFarming key={farm.id} farm={farm} onUpdate={handleFarmUpdate} language={language} />
          ))}
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-4 right-4 rounded-lg shadow-lg px-6 py-4 z-50 ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' :
          'bg-blue-600'
        }`}>
          <div className="flex items-center">
            {notification.type === 'loading' && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            )}
            <span className="text-white">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmList; 