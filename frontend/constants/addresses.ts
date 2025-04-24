// Sepolia testnet addresses
export const AIH_TOKEN_ADDRESS = '0xdc9bef9f72Fa0099A757a5f11f31B90DC7D89C8F' as const;
export const ROUTER_ADDRESS = '0xDc61cE373D3d005d2C20467C87f5481D1471616e' as const;
export const FACTORY_ADDRESS = '0xDc61cE373D3d005d2C20467C87f5481D1471616e' as const;
export const FARM_ADDRESS = '0xf9D52f36e685b6184FBB09926c93696aF26bD720' as const;

// Contract addresses object for easy import
export const contractAddresses = {
  aihToken: AIH_TOKEN_ADDRESS,
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
  }
}; 