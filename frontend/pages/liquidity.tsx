import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';

interface Token {
  name: string;
  symbol: string;
  logo: string;
  balance: number;
  decimals: number;
}

interface TokensType {
  [key: string]: Token;
}

interface ExchangeRatesType {
  [key: string]: number;
}

interface LiquidityPosition {
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
  lpAmount: number;
  sharePercentage: number;
}

interface LiquidityTranslation {
  addLiquidity: string;
  tokenA: string;
  tokenB: string;
  balance: string;
  connectWallet: string;
  lpTokensReceive: string;
  shareOfPool: string;
  walletWarning: string;
  addButton: string;
  selectToken: string;
  searchPlaceholder: string;
  settings: string;
  myLiquidityPositions: string;
  noPositions: string;
  pooled: string;
  yourShare: string;
  add: string;
  remove: string;
}

interface LiquidityTranslationsType {
  en: LiquidityTranslation;
  zh: LiquidityTranslation;
  [key: string]: LiquidityTranslation;
}

// Token data 
const tokens: TokensType = {
  eth: {
    name: 'Ethereum',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    balance: 1.5,
    decimals: 18
  },
  aih: {
    name: 'AIH Token',
    symbol: 'AIH',
    logo: 'https://cryptologos.cc/logos/aave-aave-logo.svg',
    balance: 1000,
    decimals: 18
  },
  usdt: {
    name: 'Tether USD',
    symbol: 'USDT',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    balance: 500,
    decimals: 6
  },
  dai: {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    balance: 500,
    decimals: 18
  }
};

// Exchange rates between tokens
const exchangeRates: ExchangeRatesType = {
  'eth_aih': 1000,
  'eth_usdt': 1800,
  'eth_dai': 1800,
  'aih_usdt': 1.8,
  'aih_dai': 1.8,
  'usdt_dai': 1
};

const LiquidityPage = () => {
  const [tokenA, setTokenA] = useState<string>('eth');
  const [tokenB, setTokenB] = useState<string>('aih');
  const [tokenAAmount, setTokenAAmount] = useState<string>('');
  const [tokenBAmount, setTokenBAmount] = useState<string>('');
  const [currentSelector, setCurrentSelector] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showLpInfo, setShowLpInfo] = useState<boolean>(false);
  const [lpAmount, setLpAmount] = useState<string>('0.0');
  const [poolShare, setPoolShare] = useState<string>('0.00%');
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  
  const { address, isConnected } = useAccount();
  const { language, t } = useLanguage();
  
  // Translations for the liquidity page
  const liquidityTranslations: LiquidityTranslationsType = {
    en: {
      addLiquidity: 'Add Liquidity',
      tokenA: 'Token A',
      tokenB: 'Token B',
      balance: 'Balance',
      connectWallet: 'Connect Wallet',
      lpTokensReceive: 'LP Tokens you will receive:',
      shareOfPool: 'Share of Pool:',
      walletWarning: 'Please connect your wallet to add liquidity',
      addButton: 'Add Liquidity',
      selectToken: 'Select Token',
      searchPlaceholder: 'Search token name or address',
      settings: 'Settings',
      myLiquidityPositions: 'My Liquidity Positions',
      noPositions: 'You don\'t have any liquidity positions yet',
      pooled: 'Pooled',
      yourShare: 'Your Share',
      add: 'Add',
      remove: 'Remove'
    },
    zh: {
      addLiquidity: '添加流动性',
      tokenA: '代币 A',
      tokenB: '代币 B',
      balance: '余额',
      connectWallet: '连接钱包',
      lpTokensReceive: '您将收到的LP代币：',
      shareOfPool: '池子份额：',
      walletWarning: '请连接您的钱包来添加流动性',
      addButton: '添加流动性',
      selectToken: '选择代币',
      searchPlaceholder: '搜索代币名称或地址',
      settings: '设置',
      myLiquidityPositions: '我的流动性仓位',
      noPositions: '您还没有任何流动性仓位',
      pooled: '已存入',
      yourShare: '您的份额',
      add: '添加',
      remove: '移除'
    }
  };
  
  // Function to get translations
  const lt = (key: keyof LiquidityTranslation): string => {
    const translations = liquidityTranslations[language] || liquidityTranslations.en;
    return translations[key] || key;
  };
  
  // Calculate exchange rate between tokens
  const getExchangeRate = (from: string, to: string): number => {
    if (from === to) return 1;
    
    const key = `${from}_${to}`;
    if (exchangeRates[key]) {
      return exchangeRates[key];
    }

    const reverseKey = `${to}_${from}`;
    if (exchangeRates[reverseKey]) {
      return 1 / exchangeRates[reverseKey];
    }

    return 0;
  };
  
  // Calculate token B amount based on token A input
  const calculateTokenBAmount = (): void => {
    if (!tokenAAmount || isNaN(parseFloat(tokenAAmount))) {
      setTokenBAmount('');
      setShowLpInfo(false);
      return;
    }
    
    const rate = getExchangeRate(tokenA, tokenB);
    const output = parseFloat(tokenAAmount) * rate;
    setTokenBAmount(output.toFixed(6));
    
    // Update LP info
    calculateLpAmount();
  };
  
  // Calculate token A amount based on token B input
  const calculateTokenAAmount = (): void => {
    if (!tokenBAmount || isNaN(parseFloat(tokenBAmount))) {
      setTokenAAmount('');
      setShowLpInfo(false);
      return;
    }
    
    const rate = getExchangeRate(tokenB, tokenA);
    const output = parseFloat(tokenBAmount) * rate;
    setTokenAAmount(output.toFixed(6));
    
    // Update LP info
    calculateLpAmount();
  };
  
  // Calculate LP token amount
  const calculateLpAmount = (): void => {
    const amountA = parseFloat(tokenAAmount);
    const amountB = parseFloat(tokenBAmount);
    
    if (!amountA || !amountB || isNaN(amountA) || isNaN(amountB)) {
      setShowLpInfo(false);
      return;
    }
    
    // Simple geometric mean for LP token calculation (simplified)
    const lpTokens = Math.sqrt(amountA * amountB).toFixed(4);
    setLpAmount(lpTokens);
    setPoolShare('0.02%'); // Placeholder for demo
    setShowLpInfo(true);
  };
  
  // Handle token selection
  const handleTokenSelect = (tokenId: string): void => {
    if (currentSelector === 'tokenA') {
      // Don't allow same token for both sides
      if (tokenId === tokenB) {
        // Swap tokens
        setTokenA(tokenB);
        setTokenB(tokenA);
      } else {
        setTokenA(tokenId);
      }
    } else if (currentSelector === 'tokenB') {
      // Don't allow same token for both sides
      if (tokenId === tokenA) {
        // Swap tokens
        setTokenA(tokenB);
        setTokenB(tokenA);
      } else {
        setTokenB(tokenId);
      }
    }
    
    setShowTokenModal(false);
  };
  
  // Add liquidity
  const handleAddLiquidity = (): void => {
    if (!isConnected) {
      return;
    }
    
    if (!tokenAAmount || !tokenBAmount || 
        parseFloat(tokenAAmount) <= 0 || parseFloat(tokenBAmount) <= 0) {
      alert('Please enter valid amounts for both tokens');
      return;
    }
    
    // In a real app, this would call the contract
    // For the prototype, we just add a position
    const newPosition: LiquidityPosition = {
      tokenA,
      tokenB,
      amountA: parseFloat(tokenAAmount),
      amountB: parseFloat(tokenBAmount),
      lpAmount: parseFloat(lpAmount),
      sharePercentage: 0.02 // Placeholder for demo
    };
    
    setPositions([...positions, newPosition]);
    
    // Reset the form
    setTokenAAmount('');
    setTokenBAmount('');
    setShowLpInfo(false);
    
    alert(`Added liquidity: ${tokenAAmount} ${tokens[tokenA].symbol} + ${tokenBAmount} ${tokens[tokenB].symbol}`);
  };
  
  // Update amounts when inputs change
  useEffect(() => {
    if (tokenAAmount) {
      calculateTokenBAmount();
    }
  }, [tokenAAmount, tokenA, tokenB]);
  
  useEffect(() => {
    if (tokenBAmount) {
      calculateTokenAAmount();
    }
  }, [tokenBAmount, tokenA, tokenB]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Add Liquidity Card */}
        <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg border border-primary/10 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{lt('addLiquidity')}</h1>
            <div className="text-gray-400 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          
          {/* Token A input */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{lt('tokenA')}</span>
              <span className="text-sm text-gray-400">
                {isConnected 
                  ? `${lt('balance')}: ${tokens[tokenA].balance} ${tokens[tokenA].symbol}`
                  : lt('connectWallet')
                }
              </span>
            </div>
            <div className="flex items-center bg-dark-default rounded-lg p-3 border border-gray-700">
              <input
                type="number"
                placeholder="0.0"
                className="w-full bg-transparent outline-none text-2xl text-white"
                value={tokenAAmount}
                onChange={(e) => setTokenAAmount(e.target.value)}
              />
              <div 
                className="flex items-center space-x-2 bg-dark-lightest rounded-lg px-3 py-2 hover:bg-dark-light transition cursor-pointer"
                onClick={() => {
                  setCurrentSelector('tokenA');
                  setShowTokenModal(true);
                }}
              >
                <img src={tokens[tokenA].logo} className="h-6 w-6 mr-2" alt={tokens[tokenA].symbol} />
                <span className="font-medium text-white mr-1">{tokens[tokenA].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Plus sign */}
          <div className="flex justify-center my-4">
            <div className="w-10 h-10 bg-dark-lighter rounded-full flex items-center justify-center shadow-md border border-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          
          {/* Token B input */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{lt('tokenB')}</span>
              <span className="text-sm text-gray-400">
                {isConnected 
                  ? `${lt('balance')}: ${tokens[tokenB].balance} ${tokens[tokenB].symbol}`
                  : lt('connectWallet')
                }
              </span>
            </div>
            <div className="flex items-center bg-dark-default rounded-lg p-3 border border-gray-700">
              <input
                type="number"
                placeholder="0.0"
                className="w-full bg-transparent outline-none text-2xl text-white"
                value={tokenBAmount}
                onChange={(e) => setTokenBAmount(e.target.value)}
              />
              <div 
                className="flex items-center space-x-2 bg-dark-lightest rounded-lg px-3 py-2 hover:bg-dark-light transition cursor-pointer"
                onClick={() => {
                  setCurrentSelector('tokenB');
                  setShowTokenModal(true);
                }}
              >
                <img src={tokens[tokenB].logo} className="h-6 w-6 mr-2" alt={tokens[tokenB].symbol} />
                <span className="font-medium text-white mr-1">{tokens[tokenB].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* LP Token Info */}
          {showLpInfo && (
            <div className="bg-dark-default rounded-lg p-4 mb-4 border border-gray-700">
              <h3 className="font-medium text-white mb-2">{lt('lpTokensReceive')}</h3>
              <div className="flex items-center">
                <div className="relative">
                  <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    <img src={tokens[tokenA].logo} className="h-6 w-6" alt={tokens[tokenA].symbol} />
                  </div>
                  <div className="h-6 w-6 rounded-full bg-gray-700 absolute -right-2 -bottom-2 flex items-center justify-center overflow-hidden">
                    <img src={tokens[tokenB].logo} className="h-6 w-6" alt={tokens[tokenB].symbol} />
                  </div>
                </div>
                <span className="ml-4 text-white">{lpAmount} {tokens[tokenA].symbol}-{tokens[tokenB].symbol} LP</span>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>{lt('shareOfPool')}</span>
                  <span>{poolShare}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Connection status and add liquidity button */}
          {!isConnected && (
            <div className="text-center p-3 bg-yellow-900/20 rounded-lg mb-4">
              <p className="text-yellow-500">{lt('walletWarning')}</p>
            </div>
          )}
          
          <button
            className={`w-full py-3 bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white rounded-lg font-medium transition-all duration-300 ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleAddLiquidity}
            disabled={!isConnected}
          >
            {lt('addButton')}
          </button>
        </div>
        
        {/* My Liquidity Positions */}
        <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg border border-primary/10">
          <h2 className="text-xl font-bold text-white mb-4">{lt('myLiquidityPositions')}</h2>
          
          {positions.length === 0 ? (
            <div className="text-center py-8 bg-dark-default rounded-lg">
              <p className="text-gray-400">{lt('noPositions')}</p>
            </div>
          ) : (
            <div>
              {positions.map((position, index) => (
                <div key={index} className="border border-gray-700 rounded-lg p-4 mb-3 bg-dark-default">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                          <img src={tokens[position.tokenA].logo} className="h-7 w-7" alt={tokens[position.tokenA].symbol} />
                        </div>
                        <div className="h-7 w-7 rounded-full bg-gray-700 absolute -right-2 -bottom-2 flex items-center justify-center overflow-hidden">
                          <img src={tokens[position.tokenB].logo} className="h-7 w-7" alt={tokens[position.tokenB].symbol} />
                        </div>
                      </div>
                      <span className="font-medium ml-3 text-white">{tokens[position.tokenA].symbol}-{tokens[position.tokenB].symbol}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-sm bg-blue-900/30 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/50 transition">{lt('add')}</button>
                      <button className="text-sm bg-red-900/30 text-red-400 px-2 py-1 rounded hover:bg-red-900/50 transition">{lt('remove')}</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-gray-400">{lt('pooled')} {tokens[position.tokenA].symbol}</div>
                      <div className="text-white">{position.amountA} {tokens[position.tokenA].symbol}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">{lt('pooled')} {tokens[position.tokenB].symbol}</div>
                      <div className="text-white">{position.amountB} {tokens[position.tokenB].symbol}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">{lt('yourShare')}</div>
                      <div className="text-white">{position.sharePercentage}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Token Selection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-light rounded-lg max-w-md w-full p-4 border border-primary/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">{lt('selectToken')}</h3>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={() => setShowTokenModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input 
              type="text" 
              placeholder={lt('searchPlaceholder')} 
              className="w-full bg-dark-default border border-gray-700 rounded-lg px-3 py-2 mb-4 text-white"
            />
            <div className="max-h-60 overflow-y-auto">
              {Object.keys(tokens).map((tokenId) => (
                <div 
                  key={tokenId}
                  className="flex items-center p-3 hover:bg-dark-default rounded-lg cursor-pointer"
                  onClick={() => handleTokenSelect(tokenId)}
                >
                  <img src={tokens[tokenId].logo} className="h-8 w-8 mr-3" alt={tokens[tokenId].symbol} />
                  <div>
                    <div className="font-medium text-white">{tokens[tokenId].symbol}</div>
                    <div className="text-xs text-gray-400">{tokens[tokenId].name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityPage; 