// Sepolia testnet addresses
// export const AIH_TOKEN_ADDRESS = '0x34502747D0A5817f84182586A855C7C281b6E66F' as const;
export const AIH_TOKEN_ADDRESS = '0xCdD664D1fa232Af5af9911371DaE550c52e249FE' as const;
// export const ROUTER_ADDRESS = '0xdBA22c29985cD60b631a5D20f45EF2168df7b89d' as const;
export const ROUTER_ADDRESS = '0x2ee39982901fEE4DaDd9AAAe23D31FBf2136A590' as const;
// export const FACTORY_ADDRESS = '0xdBA22c29985cD60b631a5D20f45EF2168df7b89d' as const;
export const FACTORY_ADDRESS = '0x2ee39982901fEE4DaDd9AAAe23D31FBf2136A590' as const;
// export const FARM_ADDRESS = '0xD8c55822bfcE98DACA467232Cf629e4AAF448E2B' as const;
export const FARM_ADDRESS = '0xa8c0CD26828eFCb619C02d56f416e36CC144d087' as const;

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