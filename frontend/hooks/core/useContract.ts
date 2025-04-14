import { useState, useEffect } from 'react';
import { useNetwork } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../../utils/constants';

// Extract network ID type
type NetworkId = keyof typeof CONTRACT_ADDRESSES;

// Extract contract key type from the first network (they all have the same keys)
type ContractKey = keyof typeof CONTRACT_ADDRESSES[1337];

interface UseContractProps {
  contractKey: ContractKey;
}

export const useContract = ({ contractKey }: UseContractProps) => {
  const { chain } = useNetwork();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Resolve contract address based on current network
  useEffect(() => {
    try {
      setIsLoading(true);
      
      if (chain?.id) {
        // Use the chain ID or default to hardhat
        const networkId = (chain.id in CONTRACT_ADDRESSES) 
          ? chain.id as NetworkId 
          : 1337 as NetworkId;
          
        const addresses = CONTRACT_ADDRESSES[networkId];
        const address = addresses[contractKey];
        
        if (!address) {
          throw new Error(`Contract address for ${String(contractKey)} not found on network ${chain.id}`);
        }
        
        setContractAddress(address as `0x${string}`);
        setError(null);
      } else {
        setContractAddress(undefined);
      }
    } catch (err) {
      setError(err as Error);
      setContractAddress(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [chain?.id, contractKey]);

  return {
    address: contractAddress,
    isLoading,
    error
  };
}; 