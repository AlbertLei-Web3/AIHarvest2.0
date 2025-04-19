import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { 
  TOKENS, 
  getTokenBalance, 
  getPairReserves, 
  calculateLPTokenAmount, 
  addLiquidity,
  removeLiquidity,
  approveToken,
  getUserLiquidityPositions,
  approveLPToken,
  getRouterContract,
  getTokenContract,
  createTokenPair
} from '@/utils/contracts';
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

interface LiquidityPosition {
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenAAmount: string;
  tokenBAmount: string;
  lpBalance: string;
  poolShare: number;
  pairAddress: string;
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
  const [tokens, setTokens] = useState<TokensType>(tokensData);
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
  const [slippage, setSlippage] = useState<number>(0.5); // Default slippage tolerance 0.5%
  const [isApprovingA, setIsApprovingA] = useState<boolean>(false);
  const [isApprovingB, setIsApprovingB] = useState<boolean>(false);
  const [isAddingLiquidity, setIsAddingLiquidity] = useState<boolean>(false);
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState<boolean>(false);
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [pairReserves, setPairReserves] = useState<[string, string]>(["0", "0"]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<string>('');
  
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
  
  // Handle client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fetch token balances and user positions when connected
  useEffect(() => {
    const fetchData = async () => {
      if (isConnected && address && mounted) {
        try {
          // Update token balances
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
          
          // Get pair reserves
          try {
            const reserves = await getPairReserves(
              tokens[tokenA].address,
              tokens[tokenB].address
            );
            setPairReserves(reserves);
          } catch (error) {
            console.error("Error fetching pair reserves:", error);
          }
          
          // Fetch user's liquidity positions using the dedicated function
          await refreshPositions();
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    
    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isConnected, address, mounted, tokenA, tokenB]);
  
  // Calculate token B amount based on token A input
  const calculateTokenBAmount = async (): Promise<void> => {
    if (!tokenAAmount || isNaN(parseFloat(tokenAAmount)) || parseFloat(tokenAAmount) <= 0) {
      setTokenBAmount('');
      setShowLpInfo(false);
      return;
    }
    
    try {
      setTransactionPending(true);
      
      if (parseFloat(pairReserves[0]) === 0 && parseFloat(pairReserves[1]) === 0) {
        // For new pools with no reserves, use a fixed ratio
        // In a real app, you might want to use an oracle or external price source
        const initialRatio = 1; // 1:1 ratio for demonstration
        const amountB = parseFloat(tokenAAmount) * initialRatio;
        setTokenBAmount(amountB.toFixed(6));
      } else {
        // Calculate based on existing reserves
        const reserveA = parseFloat(pairReserves[0]);
        const reserveB = parseFloat(pairReserves[1]);
        const amountB = (parseFloat(tokenAAmount) * reserveB) / reserveA;
        setTokenBAmount(amountB.toFixed(6));
      }
      
      await calculateLpTokens();
    } catch (error) {
      console.error("Error calculating token B amount:", error);
    } finally {
      setTransactionPending(false);
    }
  };
  
  // Calculate token A amount based on token B input
  const calculateTokenAAmount = async (): Promise<void> => {
    if (!tokenBAmount || isNaN(parseFloat(tokenBAmount)) || parseFloat(tokenBAmount) <= 0) {
      setTokenAAmount('');
      setShowLpInfo(false);
      return;
    }
    
    try {
      setTransactionPending(true);
      
      if (parseFloat(pairReserves[0]) === 0 && parseFloat(pairReserves[1]) === 0) {
        // For new pools with no reserves, use a fixed ratio
        const initialRatio = 1; // 1:1 ratio for demonstration
        const amountA = parseFloat(tokenBAmount) / initialRatio;
        setTokenAAmount(amountA.toFixed(6));
      } else {
        // Calculate based on existing reserves
        const reserveA = parseFloat(pairReserves[0]);
        const reserveB = parseFloat(pairReserves[1]);
        const amountA = (parseFloat(tokenBAmount) * reserveA) / reserveB;
        setTokenAAmount(amountA.toFixed(6));
      }
      
      await calculateLpTokens();
    } catch (error) {
      console.error("Error calculating token A amount:", error);
    } finally {
      setTransactionPending(false);
    }
  };
  
  // Calculate LP tokens to receive
  const calculateLpTokens = async (): Promise<void> => {
    if (!tokenAAmount || !tokenBAmount || 
        isNaN(parseFloat(tokenAAmount)) || isNaN(parseFloat(tokenBAmount)) ||
        parseFloat(tokenAAmount) <= 0 || parseFloat(tokenBAmount) <= 0) {
      setShowLpInfo(false);
      return;
    }
    
    try {
      const lpTokens = await calculateLPTokenAmount(
        tokens[tokenA].address,
        tokens[tokenB].address,
        tokenAAmount,
        tokenBAmount
      );
      
      setLpAmount(parseFloat(lpTokens).toFixed(6));
      
      // Calculate pool share
      if (parseFloat(pairReserves[0]) === 0 && parseFloat(pairReserves[1]) === 0) {
        // First liquidity provider gets 100% of the pool
        setPoolShare('100.00%');
      } else {
        const reserveA = parseFloat(pairReserves[0]);
        const amountA = parseFloat(tokenAAmount);
        const share = (amountA / (reserveA + amountA)) * 100;
        setPoolShare(`${share.toFixed(2)}%`);
      }
      
      setShowLpInfo(true);
    } catch (error) {
      console.error("Error calculating LP tokens:", error);
      setShowLpInfo(false);
    }
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
    
    // Reset amounts
    setTokenAAmount('');
    setTokenBAmount('');
    setShowLpInfo(false);
  };
  
  // Handle approve token A
  const handleApproveTokenA = async (): Promise<void> => {
    if (!isConnected || !tokenAAmount) return;
    
    try {
      setIsApprovingA(true);
      const tx = await approveToken(tokens[tokenA].address, tokenAAmount);
      
      // Wait for transaction to be mined
      await tx.wait();
      alert(`${tokens[tokenA].symbol} approved for adding liquidity`);
    } catch (error) {
      console.error('Error approving token A:', error);
      alert(`Error approving token A: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApprovingA(false);
    }
  };
  
  // Handle approve token B
  const handleApproveTokenB = async (): Promise<void> => {
    if (!isConnected || !tokenBAmount) return;
    
    try {
      setIsApprovingB(true);
      const tx = await approveToken(tokens[tokenB].address, tokenBAmount);
      
      // Wait for transaction to be mined
      await tx.wait();
      alert(`${tokens[tokenB].symbol} approved for adding liquidity`);
    } catch (error) {
      console.error('Error approving token B:', error);
      alert(`Error approving token B: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApprovingB(false);
    }
  };
  
  // Handle add liquidity
  const handleAddLiquidity = async (): Promise<void> => {
    if (!isConnected) {
      return;
    }
    
    if (!tokenAAmount || !tokenBAmount || 
        parseFloat(tokenAAmount) <= 0 || parseFloat(tokenBAmount) <= 0) {
      alert('Please enter valid amounts for both tokens');
      return;
    }
    
    try {
      setIsAddingLiquidity(true);
      
      // Execute add liquidity
      const tx = await addLiquidity(
        tokens[tokenA].address,
        tokens[tokenB].address,
        tokenAAmount,
        tokenBAmount,
        slippage
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      alert(`Successfully added ${tokenAAmount} ${tokens[tokenA].symbol} and ${tokenBAmount} ${tokens[tokenB].symbol} to the liquidity pool`);
      
      // Reset form
      setTokenAAmount('');
      setTokenBAmount('');
      setShowLpInfo(false);
      
      // Immediately refresh positions instead of waiting for the interval
      await refreshPositions();
      
    } catch (error) {
      console.error('Error during adding liquidity:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        // Check if it's an allowance error
        if (error.message.includes('allowance')) {
          errorMessage = 'Please approve the tokens first';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`Failed to add liquidity: ${errorMessage}`);
    } finally {
      setIsAddingLiquidity(false);
    }
  };
  
  // Add a dedicated function to refresh positions
  const refreshPositions = async (): Promise<void> => {
    if (!isConnected || !address || !mounted) return;
    
    try {
      // Create all possible token pairs for checking positions
      const possiblePairs: [string, string][] = [];
      const tokenEntries = Object.entries(tokens);
      
      console.log("Token entries for positions check:", tokenEntries.map(entry => `${entry[0]}: ${entry[1].address}`));
      
      for (let i = 0; i < tokenEntries.length; i++) {
        for (let j = i + 1; j < tokenEntries.length; j++) {
          const pair: [string, string] = [
            tokenEntries[i][1].address,
            tokenEntries[j][1].address
          ];
          possiblePairs.push(pair);
          console.log(`Created possible pair: ${tokenEntries[i][0]}-${tokenEntries[j][0]}`);
        }
      }
      
      console.log(`Checking ${possiblePairs.length} possible pairs for user ${address}`);
      const userPositions = await getUserLiquidityPositions(address, possiblePairs);
      console.log("Fetched positions:", userPositions);
      setPositions(userPositions);
    } catch (error) {
      console.error("Error refreshing positions:", error);
    }
  };
  
  // Handle remove liquidity for a position
  const handleRemoveLiquidity = async (position: LiquidityPosition): Promise<void> => {
    if (!address) {
      setError("请连接您的钱包");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`移除流动性: ${position.tokenASymbol}-${position.tokenBSymbol}`);
      console.log(`流动性数量: ${position.lpBalance}`);
      
      try {
        // 使用Direct Remove的模式调用removeLiquidity函数
        const tx = await removeLiquidity(
          position.tokenA,
          position.tokenB,
          position.lpBalance,
          0.1, // 低滑点设置
          true // 绕过检查
        );
        
        console.log(`交易已提交: ${tx.hash}`);
        
        // 等待交易确认
        const receipt = await tx.wait();
        console.log(`交易已确认，区块高度: ${receipt.blockNumber}`);
        
        setSuccess(`流动性已成功移除! 请检查您的钱包余额变化。`);
        
        // 刷新位置列表
        await refreshPositions();
      } catch (error: any) {
        console.error("移除流动性错误:", error);
        setError(`移除流动性失败: ${error.message || "未知错误"}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Update output amount when inputs change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (tokenAAmount) {
        calculateTokenBAmount();
      }
    }, 500);
    
    return () => clearTimeout(delayDebounce);
  }, [tokenAAmount, tokenA, tokenB]);
  
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (tokenBAmount) {
        calculateTokenAAmount();
      }
    }, 500);
    
    return () => clearTimeout(delayDebounce);
  }, [tokenBAmount, tokenA, tokenB]);
  
  // Helper function to find token by address
  const findTokenByAddress = (tokenAddress: string): Token => {
    // Attempt to find the token by address in our tokens object
    for (const [key, token] of Object.entries(tokens)) {
      if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
        return token;
      }
    }
    
    // Return a default token if not found
    return {
      name: 'Unknown Token',
      symbol: tokenAddress.substring(0, 6) + '...',
      logo: 'https://cryptologos.cc/logos/default-logo.svg',
      balance: '0',
      decimals: 18,
      address: tokenAddress
    };
  };
  
  // Add a function to verify if a position is valid
  const verifyPosition = async (position: LiquidityPosition): Promise<string> => {
    if (!address) return "Wallet not connected";
    
    try {
      // Check if token addresses are valid contracts
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const codeA = await provider.getCode(position.tokenA);
      const codeB = await provider.getCode(position.tokenB);
      
      let message = `Position verification for ${position.tokenASymbol}-${position.tokenBSymbol}:\n`;
      message += `Token A (${position.tokenASymbol}) address: ${position.tokenA}\n`;
      message += `Token B (${position.tokenBSymbol}) address: ${position.tokenB}\n`;
      message += `Token A contract code length: ${codeA.length}\n`;
      message += `Token B contract code length: ${codeB.length}\n`;
      
      // Get pair address from router directly
      const router = getRouterContract();
      const pairAddress = await router.getPairAddress(position.tokenA, position.tokenB);
      message += `Pair address from router: ${pairAddress}\n`;
      message += `Position pair address: ${position.pairAddress}\n`;
      
      if (pairAddress !== position.pairAddress) {
        message += `WARNING: Pair addresses don't match!\n`;
      }
      
      // Check if pair address is a valid contract
      const pairCode = await provider.getCode(pairAddress);
      message += `Pair contract code length: ${pairCode.length}\n`;
      
      if (pairCode.length <= 2) {
        message += `ERROR: Pair address is not a valid contract!\n`;
      } else {
        // Try to get LP token info
        try {
          const lpContract = getTokenContract(pairAddress);
          const name = await lpContract.name();
          const symbol = await lpContract.symbol();
          const decimals = await lpContract.decimals();
          message += `LP Token name: ${name}\n`;
          message += `LP Token symbol: ${symbol}\n`;
          message += `LP Token decimals: ${decimals}\n`;
        } catch (e) {
          message += `ERROR: Failed to get LP token info: ${e instanceof Error ? e.message : String(e)}\n`;
        }
        
        // Try to get LP balance
        try {
          const balance = await router.balanceOf(pairAddress, address);
          message += `LP Balance from router: ${ethers.utils.formatUnits(balance)}\n`;
          message += `LP Balance from position: ${position.lpBalance}\n`;
        } catch (e) {
          message += `ERROR: Failed to get LP balance: ${e instanceof Error ? e.message : String(e)}\n`;
        }
      }
      
      return message;
    } catch (e) {
      return `Verification failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  };
  
  // Add handleAddToPosition function
  const handleAddToPosition = (position: LiquidityPosition): void => {
    // 找到token键值
    let tokenAKey = '';
    let tokenBKey = '';
    
    for (const [key, token] of Object.entries(tokens)) {
      if (token.address.toLowerCase() === position.tokenA.toLowerCase()) {
        tokenAKey = key;
      }
      if (token.address.toLowerCase() === position.tokenB.toLowerCase()) {
        tokenBKey = key;
      }
    }
    
    // 如果找到token，设置它们为当前选中的token
    if (tokenAKey && tokenBKey) {
      setTokenA(tokenAKey);
      setTokenB(tokenBKey);
      
      // 滚动到页面顶部显示添加流动性表单
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError(`无法在界面中找到这些代币: ${position.tokenASymbol}-${position.tokenBSymbol}`);
    }
  };
  
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
                {!mounted ? lt('connectWallet') : (
                  isConnected 
                    ? `${lt('balance')}: ${tokens[tokenA].balance} ${tokens[tokenA].symbol}`
                    : lt('connectWallet')
                )}
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
                {!mounted ? lt('connectWallet') : (
                  isConnected 
                    ? `${lt('balance')}: ${tokens[tokenB].balance} ${tokens[tokenB].symbol}`
                    : lt('connectWallet')
                )}
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
          {!mounted ? (
            <div className="text-center text-gray-400 mb-4">
              {lt('walletWarning')}
            </div>
          ) : !isConnected ? (
            <div className="text-center text-gray-400 mb-4">
              {lt('walletWarning')}
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <button 
                  className={`flex-1 py-3 rounded-lg font-bold text-white ${
                    isApprovingA || transactionPending
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all'
                  }`}
                  onClick={handleApproveTokenA}
                  disabled={isApprovingA || transactionPending || !tokenAAmount}
                >
                  {isApprovingA ? 'Approving...' : `Approve ${tokens[tokenA].symbol}`}
                </button>
                
                <button 
                  className={`flex-1 py-3 rounded-lg font-bold text-white ${
                    isApprovingB || transactionPending
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all'
                  }`}
                  onClick={handleApproveTokenB}
                  disabled={isApprovingB || transactionPending || !tokenBAmount}
                >
                  {isApprovingB ? 'Approving...' : `Approve ${tokens[tokenB].symbol}`}
                </button>
              </div>
              
              <button 
                className={`w-full py-3 rounded-lg font-bold text-white ${
                  !tokenAAmount || !tokenBAmount || isAddingLiquidity || transactionPending
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all'
                }`}
                onClick={handleAddLiquidity}
                disabled={!tokenAAmount || !tokenBAmount || isAddingLiquidity || transactionPending}
              >
                {isAddingLiquidity ? 'Adding Liquidity...' : lt('addButton')}
              </button>
            </div>
          )}
        </div>
        
        {/* My Liquidity Positions */}
        <div className="bg-dark-lighter rounded-2xl p-8 shadow-lg border border-primary/10">
          <h2 className="text-xl font-bold text-white mb-4">{lt('myLiquidityPositions')}</h2>
          
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded-lg mb-4">
              <p>{success}</p>
            </div>
          )}
          
          {loading && (
            <div className="bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded-lg mb-4 flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Processing transaction...</p>
            </div>
          )}
          
          {positions.length === 0 ? (
            <div className="text-center py-8 bg-dark-default rounded-lg">
              <p className="text-gray-400">{lt('noPositions')}</p>
            </div>
          ) : (
            <div>
              {positions.map((position, index) => {
                // Get token objects from addresses
                const tokenAObj = findTokenByAddress(position.tokenA);
                const tokenBObj = findTokenByAddress(position.tokenB);
                
                return (
                  <div key={index} className="border border-gray-700 rounded-lg p-4 mb-3 bg-dark-default">
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                            <img src={tokenAObj.logo} className="h-7 w-7" alt={position.tokenASymbol} />
                          </div>
                          <div className="h-7 w-7 rounded-full bg-gray-700 absolute -right-2 -bottom-2 flex items-center justify-center overflow-hidden">
                            <img src={tokenBObj.logo} className="h-7 w-7" alt={position.tokenBSymbol} />
                          </div>
                        </div>
                        <span className="font-medium ml-3 text-white">{position.tokenASymbol}-{position.tokenBSymbol}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          className="text-sm bg-blue-900/30 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/50 transition"
                          onClick={() => handleAddToPosition(position)}
                        >
                          {lt('add')}
                        </button>
                        <button 
                          className="text-sm bg-red-900/30 text-red-400 px-2 py-1 rounded hover:bg-red-900/50 transition"
                          onClick={() => handleRemoveLiquidity(position)}
                        >
                          {lt('remove')}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-gray-400">{lt('pooled')} {position.tokenASymbol}</div>
                        <div className="text-white">{position.tokenAAmount} {position.tokenASymbol}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">{lt('pooled')} {position.tokenBSymbol}</div>
                        <div className="text-white">{position.tokenBAmount} {position.tokenBSymbol}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">{lt('yourShare')}</div>
                        <div className="text-white">{position.poolShare}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
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

      {/* Verification Result Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-light rounded-lg max-w-3xl w-full p-6 border border-primary/20 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Position Verification Results</h3>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={() => setShowVerificationModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto mb-4 flex-1">
              <pre className="p-3 bg-dark-default text-gray-300 rounded whitespace-pre-wrap overflow-x-auto">{verificationResult}</pre>
            </div>
            <div className="flex justify-between">
              <button
                className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-600 transition"
                onClick={() => {
                  navigator.clipboard.writeText(verificationResult)
                    .then(() => setSuccess("Results copied to clipboard!"))
                    .catch(err => setError("Failed to copy: " + err.message));
                }}
              >
                Copy to Clipboard
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
                onClick={() => setShowVerificationModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityPage; 