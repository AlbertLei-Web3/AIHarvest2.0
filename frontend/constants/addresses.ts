// 自动生成的合约地址配置 - Sepolia Testnet
// Last updated: 2025-04-30

// Sepolia testnet addresses
// export const AIH_TOKEN_ADDRESS = '0x34502747D0A5817f84182586A855C7C281b6E66F' as const;
export const AIH_TOKEN_ADDRESS = '0x106AF5A1e76Bb24bD3460cf4d80e13A76bb5c49a' as const;
// export const ROUTER_ADDRESS = '0xdBA22c29985cD60b631a5D20f45EF2168df7b89d' as const;
export const ROUTER_ADDRESS = '0x721808747139902f46213e37A0B9DE936Bb1F3b0' as const;
// export const FACTORY_ADDRESS = '0xdBA22c29985cD60b631a5D20f45EF2168df7b89d' as const;
export const FACTORY_ADDRESS = '0xA8220845FaD2421cDC57025e2Fbf0bd93d59c223' as const;
// export const FARM_ADDRESS = '0xD8c55822bfcE98DACA467232Cf629e4AAF448E2B' as const;
export const FARM_ADDRESS = '0xe880e79f1C437285Ed2A2D907e14d0fF0468d702' as const;

// Contract addresses object for easy import
export const contractAddresses = {
  aihToken: AIH_TOKEN_ADDRESS,
  router: ROUTER_ADDRESS,
  factory: FACTORY_ADDRESS,
  farm: FARM_ADDRESS
};

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 11155111,
  network: "sepolia"
};

// Token list
export const TOKENS = {
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    logo: '/assets/tokens/eth.png'
  },
  AIH: {
    name: 'AI Harvest Token',
    symbol: 'AIH',
    decimals: 18,
    address: AIH_TOKEN_ADDRESS,
    logo: '/assets/tokens/aih.png'
  }
}; 