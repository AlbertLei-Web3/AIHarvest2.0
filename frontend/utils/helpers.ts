import { BigNumber } from 'ethers';
import { UI_CONSTANTS } from './constants';

/**
 * Format an address for display
 * @param address The full address
 * @param start Number of characters to show at start
 * @param end Number of characters to show at end
 * @returns Shortened address with ellipsis
 */
export const shortenAddress = (address: string, start = 6, end = 4): string => {
  if (!address) return '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

/**
 * Format a value with commas
 * @param value The number to format
 * @returns Formatted string with commas
 */
export const formatWithCommas = (value: number | string): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a number to a specific number of decimal places
 * @param value The number to format
 * @param decimals Number of decimal places
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | string,
  decimals = UI_CONSTANTS.MAX_DECIMALS_DISPLAY
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format an amount from wei to a human-readable format
 * @param amount The amount in wei
 * @param decimals Token decimals
 * @param displayDecimals Decimals to display
 * @returns Formatted string
 */
export const formatFromWei = (
  amount: BigNumber | string,
  decimals = 18,
  displayDecimals = UI_CONSTANTS.MAX_DECIMALS_DISPLAY
): string => {
  if (!amount) return '0';
  
  let value: BigNumber;
  if (typeof amount === 'string') {
    value = BigNumber.from(amount);
  } else {
    value = amount;
  }

  // Convert from wei
  const divisor = BigNumber.from(10).pow(decimals);
  const quotient = value.div(divisor);
  const remainder = value.mod(divisor);
  
  const decimalStr = remainder.toString().padStart(decimals, '0');
  const significantDecimals = decimalStr.slice(0, displayDecimals);
  
  // Format with commas for thousands separator
  return formatWithCommas(`${quotient.toString()}.${significantDecimals}`);
};

/**
 * Calculate price impact percentage
 * @param inputAmount Amount being input
 * @param outputAmount Amount being output
 * @param inputPrice Price of input token
 * @param outputPrice Price of output token
 * @returns Price impact percentage
 */
export const calculatePriceImpact = (
  inputAmount: number,
  outputAmount: number,
  inputPrice: number,
  outputPrice: number
): number => {
  const expectedOutput = (inputAmount * inputPrice) / outputPrice;
  const impact = 100 - (outputAmount / expectedOutput) * 100;
  return Math.max(0, impact); // Can't have negative price impact
};

/**
 * Check if a string is a valid Ethereum address
 * @param address The address to check
 * @returns True if valid
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Get the current timestamp in seconds
 * @returns Current timestamp
 */
export const getCurrentTimestamp = (): number => {
  return Math.floor(Date.now() / 1000);
};

/**
 * Calculate deadline timestamp
 * @param minutes Minutes from now
 * @returns Deadline timestamp
 */
export const getDeadlineTimestamp = (minutes = UI_CONSTANTS.TRANSACTION_DEADLINE_DEFAULT): number => {
  return getCurrentTimestamp() + minutes * 60;
}; 