/**
 * Network configuration for the DApp
 */

// Network information from the latest deployment
export const NETWORK = {
  NAME: "sepolia",
  CHAIN_ID: 11155111,
  DEPLOYMENT_TIME: "2025-04-26T00:48:00.215Z",
  DEPLOYER: "0x0d87d8E1def9cA4A5f1BE181dc37c9ed9622c8d5"
};

// Chain IDs for reference
export const CHAIN_IDS = {
  MAINNET: 1,
  GOERLI: 5,
  SEPOLIA: 11155111,
  LOCALHOST: 31337
};

// RPC URLs - using public endpoints, consider using a service like Infura or Alchemy for production
export const RPC_URLS = {
  [CHAIN_IDS.SEPOLIA]: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  [CHAIN_IDS.GOERLI]: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  [CHAIN_IDS.MAINNET]: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  [CHAIN_IDS.LOCALHOST]: "http://localhost:8545"
};

// Block explorers
export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.SEPOLIA]: "https://sepolia.etherscan.io",
  [CHAIN_IDS.GOERLI]: "https://goerli.etherscan.io",
  [CHAIN_IDS.MAINNET]: "https://etherscan.io",
  [CHAIN_IDS.LOCALHOST]: ""
};

/**
 * Check if the connected chain ID is supported
 */
export const isSupportedChain = (chainId: number): boolean => {
  return chainId === CHAIN_IDS.SEPOLIA;
};

/**
 * Get chain name based on ID
 */
export const getChainName = (chainId: number): string => {
  switch (chainId) {
    case CHAIN_IDS.MAINNET:
      return "Ethereum Mainnet";
    case CHAIN_IDS.GOERLI:
      return "Goerli Testnet";
    case CHAIN_IDS.SEPOLIA:
      return "Sepolia Testnet";
    case CHAIN_IDS.LOCALHOST:
      return "Localhost";
    default:
      return "Unknown Network";
  }
}; 