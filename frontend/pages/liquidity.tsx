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
  pleaseConnectWallet: string;
  removingLiquidity: string;
  liquidityAmount: string;
  transactionSubmitted: string;
  transactionConfirmed: string;
  liquidityRemoved: string;
  checkWalletBalance: string;
  removeLiquidityError: string;
  unknownError: string;
  blockHeight: string;
  approved: string;
  error: string;
  liquidityAdded: string;
  success: string;
  approving: string;
  addingLiquidity: string;
  processing: string;
  initialLiquidityWarning: string;
  initialLiquidityWarningText: string;
  pairAddress: string;
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
  
  // 添加通知弹窗状态
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'loading'>('success');
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
  
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
      searchPlaceholder: 'Search token by name or address',
      settings: 'Settings',
      myLiquidityPositions: 'My Liquidity Positions',
      noPositions: 'No liquidity positions found',
      pooled: 'Pooled',
      yourShare: 'Your share',
      add: 'Add',
      remove: 'Remove',
      pleaseConnectWallet: 'Please connect your wallet',
      removingLiquidity: 'Removing Liquidity',
      liquidityAmount: 'Liquidity Amount',
      transactionSubmitted: 'Transaction submitted',
      transactionConfirmed: 'Transaction confirmed',
      liquidityRemoved: 'Liquidity removed successfully',
      checkWalletBalance: 'Please check your wallet balance',
      removeLiquidityError: 'Error removing liquidity',
      unknownError: 'An unknown error occurred',
      blockHeight: 'Block Height',
      approved: 'Approved',
      error: 'Error',
      liquidityAdded: 'Liquidity added successfully',
      success: 'Success',
      approving: 'Approving',
      addingLiquidity: 'Adding liquidity',
      processing: 'Processing',
      initialLiquidityWarning: 'Minimum Initial Liquidity Required',
      initialLiquidityWarningText: 'For new pools, you must provide enough tokens so that the square root of (amount1 × amount2) is at least 1000. The recommended minimum is 5000 of each token for a new pool. Add enough liquidity to meet this requirement, otherwise the transaction will fail.',
      pairAddress: 'Pair Address'
    },
    zh: {
      addLiquidity: '添加流动性',
      tokenA: '代币 A',
      tokenB: '代币 B',
      balance: '余额',
      connectWallet: '连接钱包',
      lpTokensReceive: '您将收到的LP代币：',
      shareOfPool: '池中份额：',
      walletWarning: '请连接您的钱包以添加流动性',
      addButton: '添加流动性',
      selectToken: '选择代币',
      searchPlaceholder: '按名称或地址搜索代币',
      settings: '设置',
      myLiquidityPositions: '我的流动性持仓',
      noPositions: '未找到流动性持仓',
      pooled: '已池化',
      yourShare: '您的份额',
      add: '添加',
      remove: '移除',
      pleaseConnectWallet: '请连接您的钱包',
      removingLiquidity: '移除流动性',
      liquidityAmount: '流动性数量',
      transactionSubmitted: '交易已提交',
      transactionConfirmed: '交易已确认',
      liquidityRemoved: '流动性已成功移除',
      checkWalletBalance: '请检查您的钱包余额',
      removeLiquidityError: '移除流动性出错',
      unknownError: '发生未知错误',
      blockHeight: '区块高度',
      approved: '已批准',
      error: '错误',
      liquidityAdded: '流动性添加成功',
      success: '成功',
      approving: '批准中',
      addingLiquidity: '添加流动性中',
      processing: '处理中',
      initialLiquidityWarning: '需要最小初始流动性',
      initialLiquidityWarningText: '对于新池，您必须提供足够的代币，使得（数量1 × 数量2）的平方根至少为1000。新池的建议最小值是每种代币5000。添加足够的流动性以满足此要求，否则交易将失败。',
      pairAddress: '配对地址'
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
      
      console.log("LP tokens calculation result:", lpTokens);
      
      // Ensure we have a valid number for display
      const lpTokensNumber = parseFloat(lpTokens);
      if (isNaN(lpTokensNumber) || lpTokensNumber <= 0) {
        console.error("Invalid LP tokens amount:", lpTokens);
        setLpAmount("0.000000");
        setShowLpInfo(false);
        return;
      }
      
      setLpAmount(lpTokensNumber.toFixed(6));
      
      // Calculate pool share
      if (parseFloat(pairReserves[0]) === 0 && parseFloat(pairReserves[1]) === 0) {
        // First liquidity provider gets 100% of the pool
        setPoolShare('100.00%');
      } else {
        const reserveA = parseFloat(pairReserves[0]);
        const amountA = parseFloat(tokenAAmount);
        
        // Prevent division by zero
        if (reserveA + amountA > 0) {
          const share = (amountA / (reserveA + amountA)) * 100;
          setPoolShare(`${share.toFixed(2)}%`);
        } else {
          setPoolShare('0.00%');
        }
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
      showLoading(`${lt('approving')} ${tokens[tokenA].symbol}...`);
      
      const tx = await approveToken(tokens[tokenA].address, tokenAAmount);
      
      // Wait for transaction to be mined
      await tx.wait();
      hideLoading();
      showSuccess(`${tokens[tokenA].symbol} ${lt('approved')}`);
    } catch (error) {
      console.error('Error approving token A:', error);
      hideLoading();
      showError(`${lt('error')}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApprovingA(false);
    }
  };
  
  // Handle approve token B
  const handleApproveTokenB = async (): Promise<void> => {
    if (!isConnected || !tokenBAmount) return;
    
    try {
      setIsApprovingB(true);
      showLoading(`${lt('approving')} ${tokens[tokenB].symbol}...`);
      
      const tx = await approveToken(tokens[tokenB].address, tokenBAmount);
      
      // Wait for transaction to be mined
      await tx.wait();
      hideLoading();
      showSuccess(`${tokens[tokenB].symbol} ${lt('approved')}`);
    } catch (error) {
      console.error('Error approving token B:', error);
      hideLoading();
      showError(`${lt('error')}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApprovingB(false);
    }
  };
  
  // Handle add liquidity
  const handleAddLiquidity = async (): Promise<void> => {
    if (!isConnected) {
      showError(lt('pleaseConnectWallet'));
      return;
    }
    
    if (!tokenAAmount || !tokenBAmount || 
        parseFloat(tokenAAmount) <= 0 || parseFloat(tokenBAmount) <= 0) {
      showError('Please enter valid amounts for both tokens');
      return;
    }
    
    try {
      setIsAddingLiquidity(true);
      showLoading(lt('addingLiquidity'));
      
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
      
      hideLoading();
      showSuccess(lt('liquidityAdded'));
      
      // Reset form
      setTokenAAmount('');
      setTokenBAmount('');
      setShowLpInfo(false);
      
      // Immediately refresh positions instead of waiting for the interval
      await refreshPositions();
      
    } catch (error) {
      console.error('Error during adding liquidity:', error);
      hideLoading();
      
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        // Handle specific errors with user-friendly messages
        if (error.message.includes('allowance')) {
          errorMessage = 'Please approve the tokens first';
        } else if (error.message.includes('INSUFFICIENT_INITIAL_LIQUIDITY') || 
                  error.message.includes('INSUFFICIENT_INITIAL_AMOUNTS')) {
          errorMessage = 'Initial liquidity too low. Please provide at least 5000 of each token for new pools.';
        } else if (error.message.includes('ZERO_RESERVES')) {
          errorMessage = 'Internal error: Zero reserves. Please try with larger amounts.';
        } else if (error.message.includes('INSUFFICIENT_LIQUIDITY_MINTED')) {
          errorMessage = 'Not enough LP tokens would be minted. Try adding more tokens.';
        } else {
          // Extract the revert reason if it's an EVM error
          const revertMatch = error.message.match(/reason="([^"]+)"/);
          if (revertMatch && revertMatch[1]) {
            errorMessage = revertMatch[1];
          } else {
            errorMessage = error.message;
          }
        }
      }
      
      showError(`${lt('error')}: ${errorMessage}`);
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
      showError(lt('pleaseConnectWallet'));
      return;
    }
    
    try {
      setIsRemovingLiquidity(true);
      showLoading(`${lt('removingLiquidity')} ${position.tokenASymbol}-${position.tokenBSymbol}...`);
      
      console.log(`${lt('removingLiquidity')}: ${position.tokenASymbol}-${position.tokenBSymbol}`);
      console.log(`${lt('liquidityAmount')}: ${position.lpBalance}`);
      
      try {
        // 使用Direct Remove的模式调用removeLiquidity函数
        const tx = await removeLiquidity(
          position.tokenA,
          position.tokenB,
          position.lpBalance,
          0.1, // 低滑点设置
          true // 绕过检查
        );
        
        console.log(`${lt('transactionSubmitted')}: ${tx.hash}`);
        
        // 等待交易确认
        const receipt = await tx.wait();
        console.log(`${lt('transactionConfirmed')}, ${lt('blockHeight')}: ${receipt.blockNumber}`);
        
        hideLoading();
        showSuccess(`${lt('liquidityRemoved')} ${lt('checkWalletBalance')}`);
        
        // 刷新位置列表
        await refreshPositions();
      } catch (error: any) {
        console.error(`${lt('removeLiquidityError')}:`, error);
        hideLoading();
        showError(`${lt('removeLiquidityError')}: ${error.message || lt('unknownError')}`);
      }
    } finally {
      setIsRemovingLiquidity(false);
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
      showError(`无法在界面中找到这些代币: ${position.tokenASymbol}-${position.tokenBSymbol}`);
    }
  };

  // 创建一个新的显示通知的函数
  const showNotificationMessage = (type: 'success' | 'error' | 'loading', message: string, duration: number = 5000) => {
    // 清除之前的超时
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    // 设置新的通知
    setNotificationType(type);
    setNotificationMessage(message);
    setShowNotification(true);
    
    // 如果不是加载类型且持续时间大于0，则设置自动关闭
    if (type !== 'loading' && duration > 0) {
      const timeout = setTimeout(() => {
        setShowNotification(false);
      }, duration);
      setNotificationTimeout(timeout);
    }
  };

  // 关闭通知的函数
  const closeNotification = () => {
    setShowNotification(false);
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      setNotificationTimeout(null);
    }
  };

  // 修改原有的setError、setSuccess和setLoading函数
  const showError = (message: string) => {
    setError(message); // 保留原有状态以便与其他代码兼容
    showNotificationMessage('error', message);
  };

  const showSuccess = (message: string) => {
    setSuccess(message); // 保留原有状态以便与其他代码兼容
    showNotificationMessage('success', message);
  };

  const showLoading = (message: string) => {
    setLoading(true); // 保留原有状态以便与其他代码兼容
    showNotificationMessage('loading', message, 0); // 持续时间为0表示不自动关闭
  };

  const hideLoading = () => {
    setLoading(false);
    setShowNotification(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 全局通知组件 */}
      {showNotification && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className={`max-w-md w-full p-4 rounded-lg shadow-xl border ${
            notificationType === 'success' ? 'bg-green-900/80 border-green-500' : 
            notificationType === 'error' ? 'bg-red-900/80 border-red-500' : 
            'bg-blue-900/80 border-blue-500'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {notificationType === 'success' && (
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                
                {notificationType === 'error' && (
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                
                {notificationType === 'loading' && (
                  <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
              
              <div className="ml-3 w-0 flex-1">
                <p className={`text-sm font-medium ${
                  notificationType === 'success' ? 'text-green-200' : 
                  notificationType === 'error' ? 'text-red-200' : 
                  'text-blue-200'
                }`}>
                  {notificationType === 'success' ? lt('success') : 
                   notificationType === 'error' ? lt('error') : 
                   lt('processing')}
                </p>
                <p className={`mt-1 text-sm ${
                  notificationType === 'success' ? 'text-green-300' : 
                  notificationType === 'error' ? 'text-red-300' : 
                  'text-blue-300'
                }`}>
                  {notificationMessage}
                </p>
              </div>
              
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={closeNotification}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationType === 'success' ? 'text-green-400 hover:text-green-300 focus:ring-green-500' : 
                    notificationType === 'error' ? 'text-red-400 hover:text-red-300 focus:ring-red-500' : 
                    'text-blue-400 hover:text-blue-300 focus:ring-blue-500'
                  }`}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          
          {/* Minimum Liquidity Warning */}
          <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-lg p-4 mb-4 text-yellow-200 text-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="font-medium">{lt('initialLiquidityWarning')}</h3>
                <div className="mt-2">
                  <p>{lt('initialLiquidityWarningText')}</p>
                </div>
              </div>
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
                    <div className="grid grid-cols-3 gap-2 text-sm mb-2">
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
                        <div className="text-white">{(position.poolShare).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="mt-1 pt-1 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mt-1">{lt('pairAddress')}:</div>
                      <div className="text-xs text-blue-400 break-all">{position.pairAddress}</div>
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
                    .then(() => showSuccess("Results copied to clipboard!"))
                    .catch(err => showError("Failed to copy: " + err.message));
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