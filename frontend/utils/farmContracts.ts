/**
 * Re-export farm contract functions from utils/contracts/farm.ts
 * This file serves as a bridge to maintain compatibility with imports in farm.tsx
 */

import {
  getAllPools, 
  depositToFarm, 
  withdrawFromFarm, 
  harvestRewards, 
  getPendingRewards,
  approveForFarming,
  getUserPoolInfo,
  getPoolInfo,
  getPoolCount,
  emergencyWithdraw,
  getFarmContract
} from './contracts/farm';

import { getSigner } from './contracts/helpers';

export {
  getAllPools, 
  depositToFarm, 
  withdrawFromFarm, 
  harvestRewards, 
  getPendingRewards,
  approveForFarming,
  getUserPoolInfo,
  getPoolInfo,
  getPoolCount,
  emergencyWithdraw,
  getFarmContract
};

// 自定义函数来满足页面需求
export const getUserInfo = async (pid: number, userAddress: string) => {
  return await getUserPoolInfo(pid, userAddress);
};

// 临时桩函数，需要在实际合约中实现
export const addPool = async (lpToken: string, allocPoint: number) => {
  const signer = getSigner();
  const farm = getFarmContract(signer);
  return await farm.add(allocPoint, lpToken, false);
};

export const updatePoolAllocation = async (pid: number, allocPoint: number) => {
  const signer = getSigner();
  const farm = getFarmContract(signer);
  return await farm.set(pid, allocPoint, false);
};

export const setRewardRate = async (rewardPerSecond: string) => {
  const signer = getSigner();
  const farm = getFarmContract(signer);
  return await farm.setAIHPerSecond(rewardPerSecond);
}; 