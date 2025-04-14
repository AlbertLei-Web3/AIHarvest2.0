export * from './AIHTokenABI';
export * from './SimpleSwapRouterABI';
export * from './SimpleFarmABI';

import { AIHTokenABI } from './AIHTokenABI';
import { SimpleSwapRouterABI } from './SimpleSwapRouterABI';
import { SimpleFarmABI } from './SimpleFarmABI';

// For convenient access in components
export const ABIs = {
  AIHToken: AIHTokenABI,
  SimpleSwapRouter: SimpleSwapRouterABI,
  SimpleFarm: SimpleFarmABI,
}; 