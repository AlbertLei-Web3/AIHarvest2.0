import { useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

export const useTokenBalance = (tokenAddress?: `0x${string}`) => {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { address } = useAccount();
  
  const { data, isError, isLoading: balanceLoading } = useBalance({
    address,
    token: tokenAddress,
    watch: true,
  });

  useEffect(() => {
    setIsLoading(balanceLoading);
    
    if (data) {
      setBalance(data.formatted);
    }
    
    if (isError) {
      setError(new Error('Failed to fetch balance'));
    }
  }, [data, isError, balanceLoading]);

  return { balance, isLoading, error, symbol: data?.symbol || 'ETH' };
}; 