import { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';

interface UseContractCallProps {
  address: `0x${string}`;
  abi: any[];
  functionName: string;
  args?: any[];
  enabled?: boolean;
}

export const useContractCall = <T>({
  address,
  abi,
  functionName,
  args = [],
  enabled = true,
}: UseContractCallProps) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    data: contractData,
    isError,
    isLoading: contractLoading,
  } = useContractRead({
    address,
    abi,
    functionName,
    args,
    enabled,
    watch: true,
  });

  useEffect(() => {
    setIsLoading(contractLoading);

    if (contractData !== undefined) {
      setData(contractData as T);
    }

    if (isError) {
      setError(new Error(`Failed to call ${functionName}`));
    }
  }, [contractData, isError, contractLoading, functionName]);

  return { data, isLoading, error };
}; 