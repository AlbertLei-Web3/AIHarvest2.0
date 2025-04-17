import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { TOKENS, getTokenBalance, getSwapQuote, executeSwap, approveToken } from '@/utils/contracts';
import { ethers } from 'ethers';

interface Token {
  name: string;
  symbol: string;
  logo: string;
  balance: string;
  decimals: number;
  address: string;
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

// Update token data to include contract addresses
const tokensData: TokensType = {
  eth: {
    name: 'Ethereum',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.ETH
  },
  aih: {
    name: 'AIH Token',
    symbol: 'AIH',
    logo: 'https://cryptologos.cc/logos/aave-aave-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.AIH
  },
  usdt: {
    name: 'Tether USD',
    symbol: 'USDT',
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
    balance: '0',
    decimals: 6,
    address: TOKENS.USDT
  },
  dai: {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.DAI
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
  const [tokens, setTokens] = useState<TokensType>(tokensData);
  const [fromToken, setFromToken] = useState<string>('eth');
  const [toToken, setToToken] = useState<string>('aih');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [currentSelector, setCurrentSelector] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showExchangeInfo, setShowExchangeInfo] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<number>(0.5); // Default slippage tolerance 0.5%
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<string>('0');
  const [priceImpact, setPriceImpact] = useState<string>('0');
  const [mounted, setMounted] = useState<boolean>(false);
  
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
  
  // Handle client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fetch token balances when connected
  useEffect(() => {
    const fetchBalances = async () => {
      if (isConnected && address) {
        const updatedTokens = { ...tokens };
        
        for (const [key, token] of Object.entries(tokens)) {
          try {
            const balance = await getTokenBalance(token.address, address);
            updatedTokens[key] = { ...token, balance };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
          }
        }
        
        setTokens(updatedTokens);
      }
    };
    
    fetchBalances();
    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [isConnected, address]);
  
  // Calculate output amount based on input
  const calculateOutputAmount = async (): Promise<void> => {
    if (!fromAmount || isNaN(parseFloat(fromAmount)) || parseFloat(fromAmount) <= 0) {
      setToAmount('');
      setShowExchangeInfo(false);
      return;
    }
    
    try {
      setTransactionPending(true);
      
      const fromTokenAddress = tokens[fromToken].address;
      const toTokenAddress = tokens[toToken].address;
      
      const amountOut = await getSwapQuote(
        fromTokenAddress,
        toTokenAddress,
        fromAmount
      );
      
      setToAmount(amountOut);
      
      // Calculate exchange rate (1 fromToken = X toToken)
      const rate = parseFloat(amountOut) / parseFloat(fromAmount);
      setExchangeRate(rate.toFixed(6));
      
      // Placeholder for price impact calculation (in a real app, would be more complex)
      setPriceImpact('0.5'); // Assuming 0.5% impact for now
      
      setShowExchangeInfo(true);
    } catch (error) {
      console.error('Error calculating swap:', error);
      setToAmount('');
    } finally {
      setTransactionPending(false);
    }
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
  
  // Handle approve token
  const handleApprove = async (): Promise<void> => {
    if (!isConnected || !fromAmount) return;
    
    try {
      setIsApproving(true);
      const tx = await approveToken(tokens[fromToken].address, fromAmount);
      
      // Wait for transaction to be mined
      await tx.wait();
      alert(`${tokens[fromToken].symbol} approved for swapping`);
    } catch (error) {
      console.error('Error approving token:', error);
      alert(`Error approving token: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApproving(false);
    }
  };
  
  // Handle swap button click
  const handleSwap = async (): Promise<void> => {
    if (!isConnected) {
      return;
    }
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      alert('Please enter an amount to swap');
      return;
    }
    
    try {
      setIsSwapping(true);
      
      // Calculate minimum output amount based on slippage
      const minOutputAmount = (parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6);
      
      // Execute swap
      const tx = await executeSwap(
        tokens[fromToken].address,
        tokens[toToken].address,
        fromAmount,
        minOutputAmount
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      alert(`Successfully swapped ${fromAmount} ${tokens[fromToken].symbol} for ${toAmount} ${tokens[toToken].symbol}`);
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      setShowExchangeInfo(false);
      
      // Refresh balances after swap
      // We'll rely on the useEffect interval to update balances
    } catch (error) {
      console.error('Error during swap:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        // Check if it's an allowance error
        if (error.message.includes('allowance')) {
          errorMessage = 'Please approve the token first';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`Swap failed: ${errorMessage}`);
    } finally {
      setIsSwapping(false);
    }
  };
  
  // Update output amount when inputs change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (fromAmount) {
        calculateOutputAmount();
      }
    }, 500);
    
    return () => clearTimeout(delayDebounce);
  }, [fromAmount, fromToken, toToken]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg border border-primary/10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{st('swap')}</h1>
            {/* Settings icon with slippage setting */}
            <div className="text-gray-400 cursor-pointer relative group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="absolute right-0 top-8 z-10 w-64 p-4 bg-dark-default rounded-lg shadow-lg border border-primary/20 invisible group-hover:visible transition-all">
                <h3 className="text-white text-sm font-medium mb-2">{st('settings')}</h3>
                <div className="mb-2">
                  <label className="text-gray-400 text-xs">Slippage Tolerance</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <button 
                      className={`px-2 py-1 text-xs rounded ${slippage === 0.1 ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-400'}`}
                      onClick={() => setSlippage(0.1)}
                    >
                      0.1%
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs rounded ${slippage === 0.5 ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-400'}`}
                      onClick={() => setSlippage(0.5)}
                    >
                      0.5%
                    </button>
                    <button 
                      className={`px-2 py-1 text-xs rounded ${slippage === 1 ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-400'}`}
                      onClick={() => setSlippage(1)}
                    >
                      1.0%
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* From token input */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{st('from')}</span>
              <span className="text-sm text-gray-400">
                {!mounted ? st('connectWallet') : (
                  isConnected 
                    ? `${st('balance')}: ${tokens[fromToken].balance} ${tokens[fromToken].symbol}`
                    : st('connectWallet')
                )}
              </span>
            </div>
            <div className="flex items-center bg-dark-default rounded-lg p-4">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  setCurrentSelector('from');
                  setShowTokenModal(true);
                }}
              >
                <div className="w-8 h-8 relative">
                  <Image 
                    src={tokens[fromToken].logo}
                    alt={tokens[fromToken].symbol}
                    width={32}
                    height={32}
                  />
                </div>
                <span className="text-white font-medium">{tokens[fromToken].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <input 
                type="text" 
                className="ml-auto w-1/2 bg-transparent text-white text-right focus:outline-none"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => {
                  // Only allow numeric input with one decimal point
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Prevent multiple decimal points
                  if ((value.match(/\./g) || []).length <= 1) {
                    setFromAmount(value);
                  }
                }}
              />
            </div>
          </div>
          
          {/* Swap direction button */}
          <div className="flex justify-center -my-2 z-10 relative">
            <button 
              className="bg-dark-default p-2 rounded-full border border-primary/20 hover:border-primary transition-colors"
              onClick={handleSwapDirection}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L12 13.586V6a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 11-1.414 1.414L8 6.414V14a1 1 0 01-2 0V6.414L3.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* To token input */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">{st('to')}</span>
              <span className="text-sm text-gray-400">
                {!mounted ? st('connectWallet') : (
                  isConnected 
                    ? `${st('balance')}: ${tokens[toToken].balance} ${tokens[toToken].symbol}`
                    : st('connectWallet')
                )}
              </span>
            </div>
            <div className="flex items-center bg-dark-default rounded-lg p-4">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  setCurrentSelector('to');
                  setShowTokenModal(true);
                }}
              >
                <div className="w-8 h-8 relative">
                  <Image 
                    src={tokens[toToken].logo}
                    alt={tokens[toToken].symbol}
                    width={32}
                    height={32}
                  />
                </div>
                <span className="text-white font-medium">{tokens[toToken].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <input 
                type="text" 
                className="ml-auto w-1/2 bg-transparent text-white text-right focus:outline-none"
                placeholder="0.0"
                value={toAmount}
                readOnly
              />
            </div>
          </div>
          
          {/* Exchange rate and price impact */}
          {showExchangeInfo && (
            <div className="mb-6 bg-dark-default rounded-lg p-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">{st('exchangeRate')}</span>
                <span className="text-white">
                  1 {tokens[fromToken].symbol} ≈ {exchangeRate} {tokens[toToken].symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{st('priceImpact')}</span>
                <span className="text-white">~{priceImpact}%</span>
              </div>
            </div>
          )}
          
          {/* Action button (connect wallet, approve, or swap) */}
          {!mounted ? (
            <div className="text-center text-gray-400 mb-4">
              {st('walletWarning')}
            </div>
          ) : !isConnected ? (
            <div className="text-center text-gray-400 mb-4">
              {st('walletWarning')}
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <button 
                className={`w-full py-3 rounded-lg font-bold text-white ${
                  isApproving || transactionPending
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all'
                }`}
                onClick={handleApprove}
                disabled={isApproving || transactionPending || !fromAmount}
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
              
              <button 
                className={`w-full py-3 rounded-lg font-bold text-white ${
                  !fromAmount || isSwapping || transactionPending
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all'
                }`}
                onClick={handleSwap}
                disabled={!fromAmount || isSwapping || transactionPending}
              >
                {isSwapping ? 'Swapping...' : st('swapButton')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Token selection modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-70" onClick={() => setShowTokenModal(false)}></div>
            <div className="bg-dark-lighter rounded-2xl p-6 w-full max-w-md relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{st('selectToken')}</h2>
                <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(tokens).map(([id, token]) => (
                  <div 
                    key={id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-dark-default ${
                      (currentSelector === 'from' && id === toToken) || 
                      (currentSelector === 'to' && id === fromToken) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                    onClick={() => {
                      if ((currentSelector === 'from' && id !== toToken) || 
                          (currentSelector === 'to' && id !== fromToken)) {
                        handleTokenSelect(id);
                      }
                    }}
                  >
                    <div className="w-8 h-8 relative mr-3">
                      <Image 
                        src={token.logo}
                        alt={token.symbol}
                        width={32}
                        height={32}
                      />
                    </div>
                    <div>
                      <div className="text-white font-medium">{token.symbol}</div>
                      <div className="text-gray-400 text-sm">{token.name}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-white">{token.balance}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapPage; 