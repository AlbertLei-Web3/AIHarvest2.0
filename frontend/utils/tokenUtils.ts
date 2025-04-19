import { erc20ABI } from "../constants/abis";
import { ethers } from "ethers";

// Format token balance for display with specified decimals
export const formatTokenBalance = (balance: ethers.BigNumber | string, decimals: number = 18): string => {
  if (!balance) return "0";
  
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
};

// Format input amount for better UX
export const formatInputAmount = (amount: string): string => {
  if (!amount) return "";
  
  // Remove non-numeric characters except decimal point
  let formatted = amount.replace(/[^0-9.]/g, "");
  
  // Ensure only one decimal point
  const decimalIndex = formatted.indexOf(".");
  if (decimalIndex !== -1) {
    formatted = formatted.substring(0, decimalIndex + 1) + 
               formatted.substring(decimalIndex + 1).replace(/\./g, "");
  }
  
  return formatted;
};

// Parse amount to BigNumber with proper decimals
export const parseTokenAmount = (amount: string, decimals: number = 18): ethers.BigNumber => {
  if (!amount || amount === "" || parseFloat(amount) === 0) {
    return ethers.BigNumber.from(0);
  }
  
  try {
    return ethers.utils.parseUnits(amount, decimals);
  } catch (e) {
    console.error("Error parsing token amount:", e);
    return ethers.BigNumber.from(0);
  }
};

// Check if an approval is needed and return allowance
export const checkAllowance = async (
  tokenContract: any,
  owner: string,
  spender: string,
  amount: ethers.BigNumber
): Promise<{ needsApproval: boolean; allowance: ethers.BigNumber }> => {
  try {
    const allowance = await tokenContract.allowance(owner, spender);
    return {
      needsApproval: allowance.lt(amount),
      allowance
    };
  } catch (e) {
    console.error("Error checking allowance:", e);
    return {
      needsApproval: true,
      allowance: ethers.BigNumber.from(0)
    };
  }
};

// Approve token spending
export const approveToken = async (
  tokenContract: any,
  spender: string,
  amount: ethers.BigNumber,
  language: string
): Promise<boolean> => {
  try {
    const tx = await tokenContract.approve(spender, amount);
    
    console.log(language === 'en' 
      ? 'Approval transaction submitted' 
      : '授权交易已提交');
    
    await tx.wait();
    
    console.log(language === 'en' 
      ? 'Token approved successfully' 
      : '代币授权成功');
    
    return true;
  } catch (e) {
    console.error("Error approving token:", e);
    
    console.error(language === 'en' 
      ? 'Failed to approve token' 
      : '代币授权失败');
    
    return false;
  }
};

// Get token balance for address
export const getTokenBalance = async (
  tokenAddress: string,
  userAddress: string,
  provider: any
): Promise<ethers.BigNumber> => {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      erc20ABI,
      provider
    );
    
    return await tokenContract.balanceOf(userAddress);
  } catch (e) {
    console.error("Error fetching token balance:", e);
    return ethers.BigNumber.from(0);
  }
}; 