// Network and chain configuration
export const SUPPORTED_CHAINS = {
  HARDHAT: 1337,
  SEPOLIA: 11155111,
  MAINNET: 1
};

// Default network to use for development
export const DEFAULT_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID 
  ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) 
  : SUPPORTED_CHAINS.HARDHAT;

// RPC URL configuration
export const RPC_URLS: Record<number, string> = {
  [SUPPORTED_CHAINS.HARDHAT]: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545',
  [SUPPORTED_CHAINS.SEPOLIA]: `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID || ''}`,
  [SUPPORTED_CHAINS.MAINNET]: `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID || ''}`
};

// Contract addresses by network
export const CONTRACT_ADDRESSES: Record<number, Record<string, string>> = {
  [SUPPORTED_CHAINS.HARDHAT]: {
    AIH_TOKEN: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Example hardhat address
    SWAP_ROUTER: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    FARM: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  },
  [SUPPORTED_CHAINS.SEPOLIA]: {
    AIH_TOKEN: '', // To be filled after deployment
    SWAP_ROUTER: '',
    FARM: ''
  },
  [SUPPORTED_CHAINS.MAINNET]: {
    AIH_TOKEN: '', // To be filled after deployment
    SWAP_ROUTER: '',
    FARM: ''
  }
};

// UI constants
export const UI_CONSTANTS = {
  SLIPPAGE_TOLERANCE_DEFAULT: 0.5, // 0.5%
  SLIPPAGE_TOLERANCE_OPTIONS: [0.1, 0.5, 1.0, 3.0],
  TRANSACTION_DEADLINE_DEFAULT: 20, // 20 minutes
  MAX_DECIMALS_DISPLAY: 6,
  MAX_UI_DECIMALS: 18,
  RETRY_INTERVAL: 5000, // 5 seconds
  TOAST_DURATION: 5000, // 5 seconds
};

// API endpoints
export const API_ENDPOINTS = {
  BACKEND_BASE: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  SUBGRAPH: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'http://localhost:8000/subgraphs/name/aiharvest'
};

// Token list with metadata
export const DEFAULT_TOKEN_LIST = [
  {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Special native token address
    logo: '/tokens/eth.png',
    isNative: true
  },
  {
    name: 'AIHarvest Token',
    symbol: 'AIH',
    decimals: 18,
    address: '', // Will be populated at runtime based on the network
    logo: '/tokens/aih.png',
    isNative: false
  }
]; 