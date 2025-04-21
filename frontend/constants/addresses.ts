// Sepolia testnet addresses
export const AIH_TOKEN_ADDRESS = '0x23572E77d0Ba0893b4d83757eB23137729decd87' as const;
export const USDC_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;
export const ROUTER_ADDRESS = '0x6252F147Accf98c2527EFbd7446955b51A3f2Cf4' as const;
export const FACTORY_ADDRESS = '0x6252F147Accf98c2527EFbd7446955b51A3f2Cf4' as const;
export const FARM_ADDRESS = '0x0A309B405f1933E77033Fa98a7CDDf71cbe5c92F' as const;

// Contract addresses object for easy import
export const contractAddresses = {
  aihToken: AIH_TOKEN_ADDRESS,
  usdc: USDC_TOKEN_ADDRESS, 
  router: ROUTER_ADDRESS,
  factory: FACTORY_ADDRESS,
  farm: FARM_ADDRESS
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
  },
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    address: USDC_TOKEN_ADDRESS,
    logo: '/assets/tokens/usdc.png'
  }
}; 