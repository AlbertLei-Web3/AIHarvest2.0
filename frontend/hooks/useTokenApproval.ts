import { useState } from 'react';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { erc20ABI } from 'wagmi';
import { parseUnits } from 'viem';

/**
 * Hook for handling ERC20 token approvals
 */
export const useTokenApproval = (tokenAddress: string, spenderAddress: string) => {
  const { address } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Track the amount to approve
  const [amountToApprove, setAmountToApprove] = useState<bigint | null>(null);

  // Prepare approval contract write with the amount when it's set
  const { config } = usePrepareContractWrite({
    address: tokenAddress as `0x${string}`,
    abi: erc20ABI,
    functionName: 'approve',
    args: amountToApprove ? [spenderAddress as `0x${string}`, amountToApprove] : undefined,
    enabled: !!tokenAddress && !!spenderAddress && !!address && !!amountToApprove,
  });

  // Contract write function
  const { write: approveWrite, isLoading: isWriteLoading } = useContractWrite(config);

  /**
   * Approve tokens for a spender
   * @param amount Amount to approve as a string
   * @returns Promise resolving to transaction hash
   */
  const approve = async (amount: string) => {
    setIsApproving(true);
    setApprovalError(null);
    
    try {
      // Convert amount to BigInt with appropriate decimals
      // Note: In production code, you should get the token's decimals
      const amountInWei = parseUnits(amount, 18);
      
      // Set the amount to approve, which will update the config
      setAmountToApprove(amountInWei);
      
      // Wait a bit for the config to update
      setTimeout(() => {
        if (approveWrite) {
          approveWrite();
        } else {
          throw new Error('Approval not available');
        }
      }, 100);
      
      return "Transaction sent";
    } catch (error) {
      console.error('Approval error:', error);
      setApprovalError(error instanceof Error ? error.message : 'Unknown error during approval');
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Check if the given amount is approved
   * This is a placeholder - in a real app you'd call the allowance function
   */
  const isApproved = (amount: string): boolean => {
    // In a real implementation, this would check the current allowance
    // For now, we'll just return false to always trigger an approval
    return false;
  };

  return {
    approve,
    isApproved,
    isApproving: isApproving || isWriteLoading,
    approvalError,
  };
}; 