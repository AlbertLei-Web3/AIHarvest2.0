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

interface SwapTranslation {
  swap: string;
  from: string;
  to: string;
  balance: string;
  connectWallet: string;
  exchangeRate: string;
  priceImpact: string;
  walletWarning: string;
  swapButton: string;
  selectToken: string;
  searchPlaceholder: string;
  settings: string;
}

interface SwapTranslationsType {
  en: SwapTranslation;
  zh: SwapTranslation;
  [key: string]: SwapTranslation;
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

const SwapPage = () => {
  const [fromToken, setFromToken] = useState<string>('eth');
  const [toToken, setToToken] = useState<string>('aih');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [currentSelector, setCurrentSelector] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showExchangeInfo, setShowExchangeInfo] = useState<boolean>(false);
  
  const { address, isConnected } = useAccount();
  const { language, t } = useLanguage();
  
  // Translations for the swap page
  const swapTranslations: SwapTranslationsType = {
    en: {
      swap: 'Swap',
      from: 'From',
      to: 'To',
      balance: 'Balance',
      connectWallet: 'Connect Wallet',
      exchangeRate: 'Exchange Rate',
      priceImpact: 'Price Impact',
      walletWarning: 'Please connect your wallet to swap tokens',
      swapButton: 'Swap',
      selectToken: 'Select Token',
      searchPlaceholder: 'Search token name or address',
      settings: 'Settings',
    },
    zh: {
      swap: '交换',
      from: '从',
      to: '到',
      balance: '余额',
      connectWallet: '连接钱包',
      exchangeRate: '汇率',
      priceImpact: '价格影响',
      walletWarning: '请连接您的钱包来交换代币',
      swapButton: '交换',
      selectToken: '选择代币',
      searchPlaceholder: '搜索代币名称或地址',
      settings: '设置',
    }
  };
  
  // Function to get translations
  const st = (key: keyof SwapTranslation): string => {
    const translations = swapTranslations[language] || swapTranslations.en;
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
  
  // Calculate output amount based on input
  const calculateOutputAmount = (): void => {
    if (!fromAmount || isNaN(parseFloat(fromAmount))) {
      setToAmount('');
      setShowExchangeInfo(false);
      return;
    }
    
    const rate = getExchangeRate(fromToken, toToken);
    const output = parseFloat(fromAmount) * rate;
    setToAmount(output.toFixed(6));
    
    // Update exchange rate display
    setShowExchangeInfo(true);
  };
  
  // Handle swapping token positions
  const handleSwapDirection = (): void => {
    setFromToken(toToken);
    setToToken(fromToken);
    
    // Swap amounts if they exist
    if (fromAmount) {
      setFromAmount(toAmount);
      setToAmount(fromAmount);
    }
  };
  
  // Handle token selection
  const handleTokenSelect = (tokenId: string): void => {
    if (currentSelector === 'from') {
      // Don't allow same token for both sides
      if (tokenId === toToken) {
        handleSwapDirection();
      } else {
        setFromToken(tokenId);
      }
    } else if (currentSelector === 'to') {
      // Don't allow same token for both sides
      if (tokenId === fromToken) {
        handleSwapDirection();
      } else {
        setToToken(tokenId);
      }
    }
    
    setShowTokenModal(false);
  };
  
  // Handle swap button click
  const handleSwap = (): void => {
    if (!isConnected) {
      return;
    }
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      alert('Please enter an amount to swap');
      return;
    }
    
    alert(`Swap ${fromAmount} ${tokens[fromToken].symbol} for ${toAmount} ${tokens[toToken].symbol}`);
    
    // In a real app, this would call the contract
    // For the prototype, we just reset the form
    setFromAmount('');
    setToAmount('');
    setShowExchangeInfo(false);
  };
  
  // Update output amount when inputs change
  useEffect(() => {
    calculateOutputAmount();
  }, [fromAmount, fromToken, toToken]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg border border-primary/10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{st('swap')}</h1>
            <div className="text-gray-400 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          
          {/* From token input */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{st('from')}</span>
              <span className="text-sm text-gray-400">
                {isConnected 
                  ? `${st('balance')}: ${tokens[fromToken].balance} ${tokens[fromToken].symbol}`
                  : st('connectWallet')
                }
              </span>
            </div>
            <div className="flex items-center bg-dark-default rounded-lg p-3 border border-gray-700">
              <input
                type="number"
                placeholder="0.0"
                className="w-full bg-transparent outline-none text-2xl text-white"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
              />
              <div 
                className="flex items-center space-x-2 bg-dark-lightest rounded-lg px-3 py-2 hover:bg-dark-light transition cursor-pointer"
                onClick={() => {
                  setCurrentSelector('from');
                  setShowTokenModal(true);
                }}
              >
                <img src={tokens[fromToken].logo} className="h-6 w-6 mr-2" alt={tokens[fromToken].symbol} />
                <span className="font-medium text-white mr-1">{tokens[fromToken].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Swap direction button */}
          <div className="flex justify-center my-2">
            <button 
              className="w-10 h-10 bg-dark-lighter rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:rotate-180 duration-300 border border-primary/20"
              onClick={handleSwapDirection}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
          
          {/* To token input */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{st('to')}</span>
              <span className="text-sm text-gray-400">
                {isConnected 
                  ? `${st('balance')}: ${tokens[toToken].balance} ${tokens[toToken].symbol}`
                  : st('connectWallet')
                }
              </span>
            </div>
            <div className="flex items-center bg-dark-default rounded-lg p-3 border border-gray-700">
              <input
                type="number"
                placeholder="0.0"
                className="w-full bg-transparent outline-none text-2xl text-white"
                value={toAmount}
                readOnly
              />
              <div 
                className="flex items-center space-x-2 bg-dark-lightest rounded-lg px-3 py-2 hover:bg-dark-light transition cursor-pointer"
                onClick={() => {
                  setCurrentSelector('to');
                  setShowTokenModal(true);
                }}
              >
                <img src={tokens[toToken].logo} className="h-6 w-6 mr-2" alt={tokens[toToken].symbol} />
                <span className="font-medium text-white mr-1">{tokens[toToken].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Exchange rate info */}
          {showExchangeInfo && (
            <div className="text-sm text-gray-400 mb-4 p-3 bg-dark-default rounded-lg">
              <div className="flex justify-between">
                <span>{st('exchangeRate')}</span>
                <span>1 {tokens[fromToken].symbol} = {getExchangeRate(fromToken, toToken)} {tokens[toToken].symbol}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>{st('priceImpact')}</span>
                <span className="text-green-500">&lt; 0.01%</span>
              </div>
            </div>
          )}
          
          {/* Connection status and swap button */}
          {!isConnected && (
            <div className="text-center p-3 bg-yellow-900/20 rounded-lg mb-4">
              <p className="text-yellow-500">{st('walletWarning')}</p>
            </div>
          )}
          
          <button
            className={`w-full py-3 bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white rounded-lg font-medium transition-all duration-300 ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSwap}
            disabled={!isConnected}
          >
            {st('swapButton')}
          </button>
        </div>
      </div>

      {/* Token Selection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-light rounded-lg max-w-md w-full p-4 border border-primary/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">{st('selectToken')}</h3>
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
              placeholder={st('searchPlaceholder')} 
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

export default SwapPage; 