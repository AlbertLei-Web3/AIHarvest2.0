import { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { ethers } from 'ethers';
import { erc20ABI } from 'wagmi';

export function useTokenBalance(tokenAddress: string) {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { address: account } = useAccount();
  
  const { data, isError, isLoading } = useContractRead({
    address: tokenAddress && tokenAddress !== '' ? (tokenAddress as `0x${string}`) : undefined,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    enabled: !!account && !!tokenAddress,
    watch: true,
  });
  
  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }
    
    if (isError) {
      setError('Failed to fetch token balance');
      setLoading(false);
      return;
    }
    
    if (data) {
      try {
        const formatted = ethers.utils.formatUnits(data, 18);
        setBalance(formatted);
        setError(null);
      } catch (err) {
        setError('Error formatting token balance');
      }
    }
    
    setLoading(false);
  }, [data, isError, isLoading]);
  
  return { balance, loading, error };
} 