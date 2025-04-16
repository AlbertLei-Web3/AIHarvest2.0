// Sepolia testnet addresses
export const AIH_TOKEN_ADDRESS = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' as const;
export const USDC_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;
export const ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const;
export const FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984' as const;
export const FARM_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' as const;

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