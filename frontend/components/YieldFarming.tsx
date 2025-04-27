import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  approveForFarming, 
  depositToFarm, 
  withdrawFromFarm, 
  harvestRewards,
  emergencyWithdraw,
  getPoolInfo,
  getUserPoolInfo,
  getPendingRewards
} from '../utils/farmContracts';
import { TOKENS } from '../utils/contracts/addresses';

// Farm status types
type FarmStatus = 'active' | 'upcoming' | 'ended';

// Farm operation type
type FarmOperation = 'approve' | 'stake' | 'unstake' | 'claim' | 'emergency_withdraw' | 'refresh';

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

interface YieldFarmingProps {
  farm: FarmData;
  onUpdate: (operation?: FarmOperation) => void;
  language: string;
}

const YieldFarming: React.FC<YieldFarmingProps> = ({ farm, onUpdate, language }) => {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isEmergencyWithdrawing, setIsEmergencyWithdrawing] = useState<boolean>(false);
  const [stakeModalVisible, setStakeModalVisible] = useState<boolean>(false);
  const [unstakeModalVisible, setUnstakeModalVisible] = useState<boolean>(false);

  // Format number to display with 2 decimal places
  const formatNumber = (num: number | string): string => {
    const parsedNum = typeof num === 'string' ? parseFloat(num) : num;
    return parsedNum.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Format address to display as shortened version
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get status color based on farm status
  const getStatusColor = (status: FarmStatus): string => {
    switch (status) {
      case 'active': return 'bg-green-600 text-white';
      case 'upcoming': return 'bg-blue-600 text-white';
      case 'ended': return 'bg-gray-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  // Handle approve LP token for farming
  const handleApprove = async () => {
    if (!isConnected || !address) return;
    
    setIsApproving(true);
    try {
      // Approve max amount
      const tx = await approveForFarming(
        farm.lpToken,
        ethers.constants.MaxUint256.toString()
      );
      await tx.wait();
      onUpdate('approve'); // Update farm data after approve with operation type
    } catch (error) {
      console.error("Error approving LP token:", error);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle stake LP tokens
  const handleStake = async () => {
    if (!isConnected || !address || !stakeAmount) return;
    
    setIsStaking(true);
    try {
      const tx = await depositToFarm(parseInt(farm.id), stakeAmount);
      await tx.wait();
      setStakeAmount('');
      setStakeModalVisible(false);
      onUpdate('stake'); // Update farm data after stake with operation type
    } catch (error) {
      console.error("Error staking LP tokens:", error);
    } finally {
      setIsStaking(false);
    }
  };

  // Handle unstake LP tokens
  const handleUnstake = async () => {
    if (!isConnected || !address || !unstakeAmount) return;
    
    setIsUnstaking(true);
    try {
      const tx = await withdrawFromFarm(parseInt(farm.id), unstakeAmount);
      await tx.wait();
      setUnstakeAmount('');
      setUnstakeModalVisible(false);
      onUpdate('unstake'); // Update farm data after unstake with operation type
    } catch (error) {
      console.error("Error unstaking LP tokens:", error);
    } finally {
      setIsUnstaking(false);
    }
  };

  // Handle claim rewards
  const handleClaim = async () => {
    if (!isConnected || !address) return;
    
    setIsClaiming(true);
    try {
      const tx = await harvestRewards(parseInt(farm.id));
      await tx.wait();
      onUpdate('claim'); // Update farm data after claim with operation type
    } catch (error) {
      console.error("Error claiming rewards:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle emergency withdraw
  const handleEmergencyWithdraw = async () => {
    if (!isConnected || !address) return;
    
    setIsEmergencyWithdrawing(true);
    try {
      const tx = await emergencyWithdraw(parseInt(farm.id));
      await tx.wait();
      onUpdate('emergency_withdraw'); // Update farm data after emergency withdraw with operation type
    } catch (error) {
      console.error("Error emergency withdrawing:", error);
    } finally {
      setIsEmergencyWithdrawing(false);
    }
  };

  // Format status text
  const getStatusText = (status: FarmStatus): string => {
    if (language === 'zh') {
      switch (status) {
        case 'active': return '活跃';
        case 'upcoming': return '即将开始';
        case 'ended': return '已结束';
        default: return '';
      }
    } else {
      switch (status) {
        case 'active': return 'Active';
        case 'upcoming': return 'Coming Soon';
        case 'ended': return 'Ended';
        default: return '';
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 p-4 mb-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-gray-700 pb-4">
        <div className="flex items-center mb-2 md:mb-0">
          <div className="ml-2">
            <h3 className="text-xl font-bold text-white">{farm.name}</h3>
            <div className="flex items-center mt-1">
              <span className={`${getStatusColor(farm.status)} text-xs px-2 py-1 rounded-full mr-2`}>
                {getStatusText(farm.status)}
              </span>
              <span className="text-gray-400 text-sm">Earn AIH</span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
          <div className="text-white font-bold text-xl">{formatNumber(farm.apy)}%</div>
          <div className="text-white text-xs">APY</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? '总锁定价值' : 'TVL'}</div>
          <div className="text-white font-medium">${formatNumber(farm.tvl)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? '你的质押' : 'Your Stake'}</div>
          <div className="text-white font-medium">{formatNumber(farm.stakedAmount)} LP</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? '待领取奖励' : 'Pending Rewards'}</div>
          <div className="text-white font-medium">{formatNumber(farm.pendingRewards)} AIH</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? 'LP地址' : 'LP Address'}</div>
          <div className="text-white font-medium text-xs">{formatAddress(farm.lpToken)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          {!farm.isApproved ? (
            <button
              onClick={handleApprove}
              disabled={!isConnected || isApproving || farm.status !== 'active'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isApproving ? (language === 'zh' ? '授权中...' : 'Approving...') : (language === 'zh' ? '授权' : 'Approve')}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStakeModalVisible(true)}
                disabled={!isConnected || farm.status !== 'active'}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {language === 'zh' ? '质押' : 'Stake'}
              </button>
              <button
                onClick={() => setUnstakeModalVisible(true)}
                disabled={!isConnected || parseFloat(farm.stakedAmount) <= 0}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {language === 'zh' ? '解除质押' : 'Unstake'}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleClaim}
          disabled={!isConnected || parseFloat(farm.pendingRewards) <= 0 || isClaiming}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isClaiming ? (language === 'zh' ? '领取中...' : 'Claiming...') : (language === 'zh' ? '领取奖励' : 'Claim Rewards')}
        </button>
        <button
          onClick={handleEmergencyWithdraw}
          disabled={!isConnected || parseFloat(farm.stakedAmount) <= 0 || isEmergencyWithdrawing}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isEmergencyWithdrawing ? (language === 'zh' ? '提取中...' : 'Withdrawing...') : (language === 'zh' ? '紧急提取' : 'Emergency Withdraw')}
        </button>
      </div>

      {/* Stake Modal */}
      {stakeModalVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-70" onClick={() => setStakeModalVisible(false)}></div>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md z-10 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">
              {language === 'zh' ? '质押LP代币' : 'Stake LP Tokens'}
            </h3>
            <p className="text-gray-400 mb-4">
              {language === 'zh' 
                ? `质押您的 ${farm.name} LP代币以赚取AIH奖励` 
                : `Stake your ${farm.name} LP tokens to earn AIH rewards`}
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">{language === 'zh' ? '数量' : 'Amount'}</label>
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
            
            <div className="flex gap-4">
              <button
                onClick={() => setStakeModalVisible(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition duration-300"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleStake}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition duration-300"
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isStaking}
              >
                {isStaking 
                  ? (language === 'zh' ? '质押中...' : 'Staking...') 
                  : (language === 'zh' ? '确认' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unstake Modal */}
      {unstakeModalVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-70" onClick={() => setUnstakeModalVisible(false)}></div>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md z-10 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">
              {language === 'zh' ? '解除质押LP代币' : 'Unstake LP Tokens'}
            </h3>
            <p className="text-gray-400 mb-4">
              {language === 'zh' 
                ? `从农场中取出您的 ${farm.name} LP代币` 
                : `Withdraw your ${farm.name} LP tokens from the farm`}
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">{language === 'zh' ? '数量' : 'Amount'}</label>
              <div className="flex">
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-grow bg-gray-900 border border-gray-700 rounded-l-lg p-2 text-white"
                />
                <button
                  onClick={() => setUnstakeAmount(farm.stakedAmount)}
                  className="bg-gray-700 text-white px-4 rounded-r-lg"
                >
                  MAX
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? '已质押余额' : 'Staked Balance'}</div>
                <div className="text-white">{farm.stakedAmount} LP</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? '待领取奖励' : 'Pending Rewards'}</div>
                <div className="text-white">{farm.pendingRewards} AIH</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-400 text-sm mb-1">{language === 'zh' ? '提示' : 'Note'}</div>
                <div className="text-white text-sm">
                  {language === 'zh' 
                    ? '解除质押将自动收获您的待领取奖励' 
                    : 'Unstaking will automatically harvest your pending rewards'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setUnstakeModalVisible(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition duration-300"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleUnstake}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition duration-300"
                disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) > parseFloat(farm.stakedAmount) || isUnstaking}
              >
                {isUnstaking 
                  ? (language === 'zh' ? '解除质押中...' : 'Unstaking...') 
                  : (language === 'zh' ? '确认' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldFarming; 