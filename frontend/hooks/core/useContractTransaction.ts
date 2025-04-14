import { useState } from 'react';
import { useContractWrite, useWaitForTransaction } from 'wagmi';

interface UseContractTransactionProps {
  address: `0x${string}`;
  abi: any[];
  functionName: string;
}

export const useContractTransaction = ({
  address,
  abi,
  functionName,
}: UseContractTransactionProps) => {
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  const {
    data: contractData,
    isLoading: isContractLoading,
    isError: isContractError,
    error: contractError,
    write,
  } = useContractWrite({
    address,
    abi,
    functionName,
  });

  const {
    data: txReceipt,
    isLoading: isTxLoading,
    isSuccess: isTxSuccess,
    isError: isTxError,
    error: txError,
  } = useWaitForTransaction({
    hash: contractData?.hash,
    enabled: !!contractData?.hash,
  });

  const execute = async (args?: unknown[]) => {
    try {
      setIsPending(true);
      setIsSuccess(false);
      setError(null);
      setTxHash(null);
      setReceipt(null);

      write({ args });

      if (isContractError && contractError) {
        throw contractError;
      }

      if (contractData?.hash) {
        setTxHash(contractData.hash);
      }

      if (isTxError && txError) {
        throw txError;
      }

      if (isTxSuccess && txReceipt) {
        setReceipt(txReceipt);
        setIsSuccess(true);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsPending(false);
    }
  };

  return {
    execute,
    isPending: isPending || isContractLoading || isTxLoading,
    isSuccess,
    error,
    txHash,
    receipt,
  };
}; 