/**
 * Token utility functions for display and formatting
 */
import { ethers } from "ethers";
import { logger } from "./helpers";

/**
 * Format token balance for display with specified decimals
 */
export const formatTokenBalance = (balance: ethers.BigNumber | string, decimals: number = 18): string => {
  if (!balance) return "0";
  
  try {
    const formatted = parseFloat(ethers.utils.formatUnits(balance.toString(), decimals));
    
    // Format the number based on its value
    if (formatted < 0.0001 && formatted > 0) {
      return '< 0.0001';
    } else if (formatted < 1) {
      return formatted.toFixed(4);
    } else if (formatted < 1000) {
      return formatted.toFixed(2);
    } else {
      return formatted.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
  } catch (error) {
    logger.error(`Error formatting token balance: ${balance}`, error);
    return "0";
  }
};

/**
 * Format input amount for better UX
 */
export const formatInputAmount = (amount: string): string => {
  if (!amount) return "";
  
  try {
    // Remove non-numeric characters except decimal point
    let formatted = amount.replace(/[^0-9.]/g, "");
    
    // Ensure only one decimal point
    const decimalIndex = formatted.indexOf(".");
    if (decimalIndex !== -1) {
      formatted = formatted.substring(0, decimalIndex + 1) + 
                 formatted.substring(decimalIndex + 1).replace(/\./g, "");
    }
    
    return formatted;
  } catch (error) {
    logger.error("Error formatting input amount", error);
    return amount; // Return original input if error occurs
  }
};

/**
 * Parse amount to BigNumber with proper decimals
 */
export const parseTokenAmount = (amount: string, decimals: number = 18): ethers.BigNumber => {
  if (!amount || amount === "" || parseFloat(amount) === 0) {
    return ethers.BigNumber.from(0);
  }
  
  try {
    // Remove any non-numeric characters that might cause parseUnits to fail
    const cleanAmount = amount.replace(/[^\d.]/g, '');
    return ethers.utils.parseUnits(cleanAmount, decimals);
  } catch (error) {
    logger.error(`Error parsing token amount: ${amount}`, error);
    return ethers.BigNumber.from(0);
  }
};

/**
 * Format percent value for display
 */
export const formatPercent = (value: number): string => {
  try {
    if (isNaN(value)) return "0%";
    
    if (value < 0.01 && value > 0) {
      return "< 0.01%";
    }
    
    return value.toFixed(2) + "%";
  } catch (error) {
    logger.error(`Error formatting percent: ${value}`, error);
    return "0%";
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number | string): string => {
  try {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) return "$0.00";
    
    if (numPrice < 0.01 && numPrice > 0) {
      return "< $0.01";
    } else if (numPrice < 1) {
      return "$" + numPrice.toFixed(4);
    } else if (numPrice < 1000) {
      return "$" + numPrice.toFixed(2);
    } else if (numPrice < 1000000) {
      return "$" + (numPrice / 1000).toFixed(2) + "K";
    } else {
      return "$" + (numPrice / 1000000).toFixed(2) + "M";
    }
  } catch (error) {
    logger.error(`Error formatting price: ${price}`, error);
    return "$0.00";
  }
};

/**
 * Truncate address for display
 */
export const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  try {
    if (!address || !ethers.utils.isAddress(address)) {
      return "Invalid address";
    }
    
    return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
  } catch (error) {
    logger.error(`Error truncating address: ${address}`, error);
    return "Invalid address";
  }
}; 