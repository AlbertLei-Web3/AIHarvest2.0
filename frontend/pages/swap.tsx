import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { TOKENS } from '@/utils/contracts/addresses';
import { getTokenBalance, approveToken } from '@/utils/contracts/erc20';
import { getSwapQuote, executeSwap, getPairReserves, getRouterContract } from '@/utils/contracts/router';
import { ethers } from 'ethers';
import dynamic from 'next/dynamic';

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

interface Notification {
  type: NotificationType;
  message: string;
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
  approving: string;
  swapping: string;
  approved: string;
  swapSuccess: string;
  swapError: string;
  approveError: string;
  close: string;
}

interface SwapTranslationsType {
  en: SwapTranslation;
  zh: SwapTranslation;
  [key: string]: SwapTranslation;
}

// Updated token data - removed USDT, DAI and kept custom tokens
const tokensData: TokensType = {
  aih: {
    name: 'AIH Token',
    symbol: 'AIH',
    logo: 'https://cryptologos.cc/logos/aave-aave-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.AIH
  },
  td: {
    name: 'TD Token',
    symbol: 'TD',
    logo: 'https://cryptologos.cc/logos/default-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.TD
  },
  fhbi: {
    name: 'FHBI Token',
    symbol: 'FHBI',
    logo: 'https://cryptologos.cc/logos/default-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.FHBI
  },
  fhbi2: {
    name: 'FHBI2 Token',
    symbol: 'FHBI2',
    logo: 'https://cryptologos.cc/logos/default-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.FHBI2
  },
  fhbi3: {
    name: 'FHBI3 Token',
    symbol: 'FHBI3',
    logo: 'https://cryptologos.cc/logos/default-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.FHBI3
  },
  rtk: {
    name: 'RTK Token',
    symbol: 'RTK',
    logo: 'https://cryptologos.cc/logos/default-logo.svg',
    balance: '0',
    decimals: 18,
    address: TOKENS.RTK
  }
};

// Exchange rates between tokens
const exchangeRates: ExchangeRatesType = {
  'aih_td': 10,
  'aih_fhbi': 10,
  'aih_fhbi2': 10,
  'aih_fhbi3': 10,
  'aih_rtk': 10,
  'td_fhbi': 1,
  'td_fhbi2': 1,
  'td_fhbi3': 1, 
  'td_rtk': 1,
  'fhbi_fhbi2': 1,
  'fhbi_fhbi3': 1,
  'fhbi_rtk': 1,
  'fhbi2_fhbi3': 1,
  'fhbi2_rtk': 1,
  'fhbi3_rtk': 1
};

// Add notification types
type NotificationType = 'success' | 'error' | 'loading' | null;

const SwapPage = () => {
  const [tokens, setTokens] = useState<TokensType>(tokensData);
  const [fromToken, setFromToken] = useState<string>('aih');
  const [toToken, setToToken] = useState<string>('td');
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
  const [availablePairs, setAvailablePairs] = useState<{from: string, to: string}[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { address, isConnected } = useAccount();
  const { language, t } = useLanguage();
  
  const [notification, setNotification] = useState<Notification | null>(null);
  
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
      approving: 'Approving...',
      swapping: 'Swapping...',
      approved: 'Token approved successfully',
      swapSuccess: 'Swap completed successfully',
      swapError: 'Swap failed',
      approveError: 'Approval failed',
      close: 'Close'
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
      approving: '正在授权...',
      swapping: '正在交换...',
      approved: '代币授权成功',
      swapSuccess: '交换成功完成',
      swapError: '交换失败',
      approveError: '授权失败',
      close: '关闭'
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
  
  // Fetch available pairs with liquidity
  useEffect(() => {
    const fetchAvailablePairs = async () => {
      try {
        if (!mounted) return;
        
        console.log('Fetching available pairs with liquidity...');
        const router = getRouterContract();
        
        // Create all possible token pairs from our tokens
        const tokenAddresses = Object.values(tokens).map(token => token.address);
        const pairs: {from: string, to: string}[] = [];
        const tokensWithLiquidity = new Set<string>();
        
        // Check each pair combination for liquidity
        for (let i = 0; i < tokenAddresses.length; i++) {
          for (let j = i + 1; j < tokenAddresses.length; j++) {
            try {
              const tokenA = tokenAddresses[i];
              const tokenB = tokenAddresses[j];
              
              // Get pair address
              const pairAddress = await router.getPairAddress(tokenA, tokenB);
              
              if (pairAddress !== ethers.constants.AddressZero) {
                // Pair exists, check if it has liquidity
                const [reserveA, reserveB] = await getPairReserves(tokenA, tokenB);
                
                if (parseFloat(reserveA) > 0 && parseFloat(reserveB) > 0) {
                  console.log(`Found pair with liquidity: ${tokenA} - ${tokenB}`);
                  pairs.push({ from: tokenA, to: tokenB });
                  tokensWithLiquidity.add(tokenA.toLowerCase());
                  tokensWithLiquidity.add(tokenB.toLowerCase());
                }
              }
            } catch (err) {
              console.error(`Error checking pair ${tokenAddresses[i]} - ${tokenAddresses[j]}:`, err);
            }
          }
        }
        
        setAvailablePairs(pairs);
        
        // Filter tokens that have liquidity
        const filteredTokenIds = Object.keys(tokens).filter(tokenId => 
          tokensWithLiquidity.has(tokens[tokenId].address.toLowerCase())
        );
        
        if (filteredTokenIds.length > 0) {
          setFilteredTokens(filteredTokenIds);
          // Set initial token selection to first available pair
          if (pairs.length > 0) {
            // Find corresponding token ids for the first pair
            const fromTokenId = findTokenIdByAddress(pairs[0].from);
            const toTokenId = findTokenIdByAddress(pairs[0].to);
            
            if (fromTokenId && toTokenId) {
              setFromToken(fromTokenId);
              setToToken(toTokenId);
            }
          }
        } else {
          // If no tokens with liquidity found, keep all tokens available
          setFilteredTokens(Object.keys(tokens));
        }
      } catch (error) {
        console.error('Error fetching available pairs:', error);
        // If an error occurs, keep all tokens available
        setFilteredTokens(Object.keys(tokens));
      }
    };
    
    if (mounted) {
      fetchAvailablePairs();
    }
  }, [mounted]);
  
  // Find token ID by address
  const findTokenIdByAddress = (address: string): string | undefined => {
    const normalized = address.toLowerCase();
    for (const [tokenId, token] of Object.entries(tokens)) {
      if (token.address.toLowerCase() === normalized) {
        return tokenId;
      }
    }
    return undefined;
  };
  
  // Check if a pair has liquidity
  const hasPairLiquidity = (from: string, to: string): boolean => {
    if (availablePairs.length === 0) return true; // Default to true if we haven't loaded pairs yet
    
    const fromAddress = tokens[from].address.toLowerCase();
    const toAddress = tokens[to].address.toLowerCase();
    
    return availablePairs.some(
      pair => 
        (pair.from.toLowerCase() === fromAddress && pair.to.toLowerCase() === toAddress) ||
        (pair.from.toLowerCase() === toAddress && pair.to.toLowerCase() === fromAddress)
    );
  };
  
  // Filter tokens for display in modal
  const getFilteredModalTokens = (): string[] => {
    // If we're selecting the 'from' token, filter tokens that have pairs with any other token
    if (currentSelector === 'from') {
      if (searchQuery) {
        return filteredTokens.filter(id => 
          tokens[id].name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          tokens[id].symbol.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return filteredTokens;
    }
    
    // If we're selecting the 'to' token, only show tokens that have a pair with the selected 'from' token
    if (currentSelector === 'to') {
      const hasLiquidityWithFrom = (tokenId: string): boolean => {
        if (availablePairs.length === 0) return true; // Default to true if we haven't loaded pairs yet
        
        const fromAddress = tokens[fromToken].address.toLowerCase();
        const tokenAddress = tokens[tokenId].address.toLowerCase();
        
        return availablePairs.some(
          pair => 
            (pair.from.toLowerCase() === fromAddress && pair.to.toLowerCase() === tokenAddress) ||
            (pair.from.toLowerCase() === tokenAddress && pair.to.toLowerCase() === fromAddress)
        );
      };
      
      const tokensList = filteredTokens.filter(id => id !== fromToken && hasLiquidityWithFrom(id));
      
      if (searchQuery) {
        return tokensList.filter(id => 
          tokens[id].name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          tokens[id].symbol.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      return tokensList;
    }
    
    return [];
  };
  
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
      
      // Get the swap quote from the router
      const amountOut = await getSwapQuote(
        fromTokenAddress,
        toTokenAddress,
        fromAmount
      );
      
      setToAmount(amountOut);
      
      // Calculate exchange rate (1 fromToken = X toToken)
      if (parseFloat(amountOut) > 0) {
        const rate = parseFloat(amountOut) / parseFloat(fromAmount);
        setExchangeRate(rate.toFixed(6));
        
        // Get pair reserves to calculate price impact
        const [reserveFrom, reserveTo] = await getPairReserves(
          fromTokenAddress,
          toTokenAddress
        );
        
        // Calculate price impact
        // Price impact = (spot price - execution price) / spot price * 100
        const spotPrice = parseFloat(reserveTo) / parseFloat(reserveFrom);
        const executionPrice = parseFloat(amountOut) / parseFloat(fromAmount);
        
        let impact = 0;
        if (spotPrice > 0) {
          impact = Math.abs((spotPrice - executionPrice) / spotPrice * 100);
        }
        
        setPriceImpact(impact.toFixed(2));
      } else {
        setExchangeRate('0');
        setPriceImpact('0');
      }
      
      setShowExchangeInfo(Boolean(parseFloat(amountOut) > 0));
    } catch (error) {
      console.error('Error calculating swap:', error);
      setToAmount('');
      setShowExchangeInfo(false);
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
  
  // Show notification
  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
    
    // Auto-dismiss success and error notifications after 5 seconds
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  // Hide notification
  const hideNotification = () => {
    setNotification(null);
  };
  
  // Handle approve token
  const handleApprove = async (): Promise<void> => {
    if (!isConnected || !fromAmount) return;
    
    try {
      setIsApproving(true);
      showNotification('loading', st('approving'));
      
      const fromTokenAddress = tokens[fromToken].address;
      console.log(`Approving ${fromAmount} ${tokens[fromToken].symbol} (${fromTokenAddress})...`);
      
      // Call approve function
      const tx = await approveToken(fromTokenAddress, fromAmount);
      console.log(`Approval transaction submitted: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Approval confirmed in block ${receipt.blockNumber}`);
      
      showNotification('success', st('approved'));
    } catch (error) {
      console.error('Error approving token:', error);
      let errorMessage = st('approveError');
      
      if (error instanceof Error) {
        errorMessage = `${st('approveError')}: ${error.message}`;
      }
      
      showNotification('error', errorMessage);
    } finally {
      setIsApproving(false);
    }
  };
  
  // Handle swap button click
  const handleSwap = async (): Promise<void> => {
    if (!isConnected) {
      showNotification('error', st('walletWarning'));
      return;
    }
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      showNotification('error', 'Please enter an amount to swap');
      return;
    }
    
    try {
      setIsSwapping(true);
      showNotification('loading', st('swapping'));
      
      const fromTokenAddress = tokens[fromToken].address;
      const toTokenAddress = tokens[toToken].address;
      
      // Calculate minimum output amount based on slippage
      const minOutputAmount = (parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6);
      console.log(`Swapping ${fromAmount} ${tokens[fromToken].symbol} for minimum ${minOutputAmount} ${tokens[toToken].symbol}...`);
      
      // Execute swap
      const tx = await executeSwap(
        fromTokenAddress,
        toTokenAddress,
        fromAmount,
        minOutputAmount
      );
      
      console.log(`Swap transaction submitted: ${tx.hash}`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Swap confirmed in block ${receipt.blockNumber}`);
      
      const successMessage = `${st('swapSuccess')}: ${fromAmount} ${tokens[fromToken].symbol} → ${toAmount} ${tokens[toToken].symbol}`;
      showNotification('success', successMessage);
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      setShowExchangeInfo(false);
      
      // Refresh balances after swap
      const updatedTokens = { ...tokens };
      
      for (const [key, token] of Object.entries(tokens)) {
        try {
          if (key === fromToken || key === toToken) {
            const balance = await getTokenBalance(token.address, address!);
            updatedTokens[key] = { ...token, balance };
          }
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
        }
      }
      
      setTokens(updatedTokens);
    } catch (error) {
      console.error('Error during swap:', error);
      let errorMessage = st('swapError');
      
      if (error instanceof Error) {
        // Check if it's an allowance error
        if (error.message.includes('allowance')) {
          errorMessage = `${st('swapError')}: Please approve the token first`;
        } else {
          errorMessage = `${st('swapError')}: ${error.message}`;
        }
      }
      
      showNotification('error', errorMessage);
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
      {/* Global Notification */}
      {notification && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={hideNotification}></div>
          <div className={`relative bg-dark-lighter p-5 rounded-lg shadow-lg max-w-md w-full text-center ${
            notification.type === 'error' ? 'border-2 border-red-500' :
            notification.type === 'success' ? 'border-2 border-green-500' :
            'border border-primary/20'
          }`}>
            {notification.type === 'loading' && (
              <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-primary mx-auto mb-3"></div>
            )}
            
            {notification.type === 'success' && (
              <div className="text-green-500 text-3xl mb-3">✓</div>
            )}
            
            {notification.type === 'error' && (
              <div className="text-red-500 text-3xl mb-3">×</div>
            )}
            
            <div className="text-white mb-4">{notification.message}</div>
            
            {notification.type !== 'loading' && (
              <button 
                className="text-gray-400 hover:text-white border border-gray-600 hover:border-white px-4 py-2 rounded-lg"
                onClick={hideNotification}
              >
                {st('close')}
              </button>
            )}
          </div>
        </div>
      )}
  
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
          
          {/* 交换方向按钮 - 已调整位置和大小 / Swap direction button - Position and size adjusted */}
          <div className="flex justify-center my-4 z-10 relative">
            <button 
              className="bg-dark-default p-3 rounded-full shadow-lg border border-primary/30 hover:border-primary transition-all transform hover:scale-110 active:scale-95 hover:shadow-glow-sm"
              onClick={handleSwapDirection}
              aria-label="Swap direction"
            >
              <div className="bg-gradient-to-r from-primary to-secondary rounded-full sm:w-10 sm:h-10 w-8 h-8 flex items-center justify-center overflow-hidden relative">
                {/* 上下交换箭头 - 添加动画效果 / Up-down swap arrows with animation */}
                <div className="flex flex-col items-center transform hover:translate-y-1 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-bounce-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-white mt-1 animate-bounce-slow-reverse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
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
              
              <input 
                type="text" 
                className="w-full p-3 bg-dark-default border border-gray-700 rounded-lg mb-4 text-white"
                placeholder={st('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <div className="space-y-3">
                {getFilteredModalTokens().map((id) => (
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
                    <div className="ml-3">
                      <div className="font-semibold text-white">{tokens[id].symbol}</div>
                      <div className="text-sm text-gray-400">{tokens[id].name}</div>
                    </div>
                    <div className="ml-auto text-sm text-gray-300">
                      {tokens[id].balance}
                    </div>
                  </div>
                ))}
                
                {getFilteredModalTokens().length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    {searchQuery ? 'No tokens match your search' : 'No tokens with liquidity found'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap the SwapPage component with dynamic import to prevent hydration issues
const SwapPageWithNoSSR = dynamic(() => Promise.resolve(SwapPage), { 
  ssr: false 
});

export default SwapPageWithNoSSR; 