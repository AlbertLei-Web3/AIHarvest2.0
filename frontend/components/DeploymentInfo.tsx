import React from 'react';
import { NETWORK, BLOCK_EXPLORERS, CHAIN_IDS } from '../utils/contracts/network';
import { CONTRACTS } from '../utils/contracts/addresses';
import { truncateAddress } from '../utils/contracts/tokenUtils';

interface DeploymentInfoProps {
  showContracts?: boolean;
  className?: string;
}

const DeploymentInfo: React.FC<DeploymentInfoProps> = ({ 
  showContracts = true,
  className = '' 
}) => {
  // Format deployment date
  const deployDate = new Date(NETWORK.DEPLOYMENT_TIME);
  const formattedDate = deployDate.toLocaleDateString();
  
  // Get block explorer URL
  const explorerBaseUrl = BLOCK_EXPLORERS[CHAIN_IDS.SEPOLIA];
  
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-2">Deployment Information</h3>
      
      <div className="text-sm space-y-1">
        <p>
          <span className="text-gray-400">Network:</span>{' '}
          <span className="text-white">{NETWORK.NAME}</span>
        </p>
        
        <p>
          <span className="text-gray-400">Deployed:</span>{' '}
          <span className="text-white">{formattedDate}</span>
        </p>
        
        <p>
          <span className="text-gray-400">Deployer:</span>{' '}
          <a
            href={`${explorerBaseUrl}/address/${NETWORK.DEPLOYER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            {truncateAddress(NETWORK.DEPLOYER)}
          </a>
        </p>
      </div>
      
      {showContracts && (
        <>
          <h4 className="text-md font-semibold mt-4 mb-2">Contract Addresses</h4>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-400">AIH Token:</span>{' '}
              <a
                href={`${explorerBaseUrl}/address/${CONTRACTS.AIH_TOKEN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {truncateAddress(CONTRACTS.AIH_TOKEN)}
              </a>
            </p>
            
            <p>
              <span className="text-gray-400">Router:</span>{' '}
              <a
                href={`${explorerBaseUrl}/address/${CONTRACTS.ROUTER_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {truncateAddress(CONTRACTS.ROUTER_ADDRESS)}
              </a>
            </p>
            
            <p>
              <span className="text-gray-400">Farm:</span>{' '}
              <a
                href={`${explorerBaseUrl}/address/${CONTRACTS.FARM_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {truncateAddress(CONTRACTS.FARM_ADDRESS)}
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DeploymentInfo; 