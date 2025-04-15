import { useState, useEffect } from 'react';
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
  const [approvalSuccess, setApprovalSuccess] = useState<boolean>(false);

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
  const { write: approveWrite, isLoading: isWriteLoading, isSuccess, error: writeError } = useContractWrite(config);

  // Use useEffect to trigger the approval when amountToApprove changes
  useEffect(() => {
    if (amountToApprove && approveWrite) {
      approveWrite();
    }
  }, [amountToApprove, approveWrite]);

  // Handle approval success and error
  useEffect(() => {
    if (isSuccess) {
      setApprovalSuccess(true);
      setIsApproving(false);
    }
    
    if (writeError) {
      setApprovalError(writeError.message);
      setIsApproving(false);
    }
  }, [isSuccess, writeError]);

  /**
   * Approve tokens for a spender
   * @param amount Amount to approve as a string
   * @returns Promise resolving to transaction result
   */
  const approve = async (amount: string) => {
    setIsApproving(true);
    setApprovalError(null);
    setApprovalSuccess(false);
    
    try {
      // Convert amount to BigInt with appropriate decimals
      // Note: In production code, you should get the token's decimals
      const amountInWei = parseUnits(amount, 18);
      
      // Set the amount to approve, which will trigger the useEffect
      setAmountToApprove(amountInWei);
      
      return {
        success: true,
        message: "Approval initiated"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during approval';
      console.error('Approval error:', error);
      setApprovalError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
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
    approvalSuccess,
    resetApprovalState: () => {
      setApprovalError(null);
      setApprovalSuccess(false);
    }
  };
}; 