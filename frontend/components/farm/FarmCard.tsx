import React, { useState } from 'react';
import Image from 'next/image';
import { Token } from '../../types/token';

interface FarmCardProps {
  farmAddress: string;
  poolId: number;
  lpToken: Token;
  rewardToken: Token;
  apr: string;
  userStaked: string;
  totalStaked: string;
  pendingRewards: string;
  onDeposit: (amount: string) => void;
  onWithdraw: (amount: string) => void;
  onHarvest: () => void;
  isDepositLoading?: boolean;
  isWithdrawLoading?: boolean;
  isHarvestLoading?: boolean;
  lpBalance: string;
  isLpBalanceLoading?: boolean;
}

export const FarmCard: React.FC<FarmCardProps> = ({
  farmAddress,
  poolId,
  lpToken,
  rewardToken,
  apr,
  userStaked,
  totalStaked,
  pendingRewards,
  onDeposit,
  onWithdraw,
  onHarvest,
  isDepositLoading = false,
  isWithdrawLoading = false,
  isHarvestLoading = false,
  lpBalance = '0',
  isLpBalanceLoading = false,
}) => {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Handle deposit
  const handleDeposit = () => {
    if (!depositAmount || isDepositLoading) return;
    onDeposit(depositAmount);
    setDepositAmount('');
  };

  // Handle withdraw
  const handleWithdraw = () => {
    if (!withdrawAmount || isWithdrawLoading) return;
    onWithdraw(withdrawAmount);
    setWithdrawAmount('');
  };

  // Format numbers for display
  const formatAmount = (amount: string): string => {
    if (!amount) return '0';
    const num = parseFloat(amount);
    if (num < 0.0001) return '<0.0001';
    return num.toLocaleString(undefined, { 
      maximumFractionDigits: 4,
      minimumFractionDigits: 0
    });
  };

  const hasPendingRewards = parseFloat(pendingRewards) > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden p-6">
      {/* Farm Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {lpToken.logo && (
            <div className="relative h-10 w-10 mr-2">
              <Image
                src={lpToken.logo}
                alt={lpToken.symbol}
                fill
                className="rounded-full"
              />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{lpToken.symbol} Farm</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Earn {rewardToken.symbol}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-md font-medium">APR</div>
          <div className="text-green-500 font-bold">{apr}%</div>
        </div>
      </div>

      {/* Farm Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Staked</p>
          <p className="font-medium">
            {formatAmount(userStaked)} {lpToken.symbol}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Rewards</p>
          <p className="font-medium">
            {formatAmount(pendingRewards)} {rewardToken.symbol}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 ${
            activeTab === 'deposit'
              ? 'border-b-2 border-blue-500 font-medium'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('deposit')}
        >
          Deposit
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'withdraw'
              ? 'border-b-2 border-blue-500 font-medium'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('withdraw')}
        >
          Withdraw
        </button>
      </div>

      {/* Deposit Tab */}
      {activeTab === 'deposit' && (
        <div>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="text-sm text-gray-600 dark:text-gray-400">Amount</label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Balance: {isLpBalanceLoading ? 'Loading...' : `${formatAmount(lpBalance)} ${lpToken.symbol}`}
              </span>
            </div>
            <div className="flex">
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                className="w-full p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setDepositAmount(lpBalance)}
                className="bg-gray-200 dark:bg-gray-700 px-3 rounded-r hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                MAX
              </button>
            </div>
          </div>
          <button
            onClick={handleDeposit}
            disabled={isDepositLoading || !depositAmount}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDepositLoading ? 'Depositing...' : 'Deposit'}
          </button>
        </div>
      )}

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && (
        <div>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="text-sm text-gray-600 dark:text-gray-400">Amount</label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Staked: {formatAmount(userStaked)} {lpToken.symbol}
              </span>
            </div>
            <div className="flex">
              <input
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                className="w-full p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setWithdrawAmount(userStaked)}
                className="bg-gray-200 dark:bg-gray-700 px-3 rounded-r hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                MAX
              </button>
            </div>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawLoading || !withdrawAmount}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawLoading ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </div>
      )}

      {/* Harvest Button */}
      <div className="mt-4">
        <button
          onClick={onHarvest}
          disabled={isHarvestLoading || !hasPendingRewards}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isHarvestLoading ? 'Harvesting...' : `Harvest ${formatAmount(pendingRewards)} ${rewardToken.symbol}`}
        </button>
      </div>
    </div>
  );
}; 