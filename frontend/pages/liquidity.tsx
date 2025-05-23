import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/layout/Header';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { TOKENS } from '@/utils/contracts/addresses';
import { 
  calculateLPTokenAmount, 
  addLiquidity,
  removeLiquidity,
  approveLPToken, 
  getUserLiquidityPositions,
  addLPTokenToWallet,
  verifyLPTokenMint
} from '@/utils/contracts/liquidity';
import { getTokenBalance, approveToken, getTokenContract } from '@/utils/contracts/erc20';
import { getRouterContract, getPairReserves, createTokenPair } from '@/utils/contracts/router';
import { ethers } from 'ethers';
import { useRouter } from 'next/router';
import styles from '@/styles/liquidity.module.css';

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
  lpTokenAddress: string; // Make it required, not optional
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
  pairAddress: string;
  copy: string;
  lpTokenBalance: string;
  addToWallet: string;
}

interface LiquidityTranslationsType {
  en: LiquidityTranslation;
  zh: LiquidityTranslation;
  [key: string]: LiquidityTranslation;
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

// Update exchange rates to only include relevant pairs
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

const LiquidityPage = () => {
  const [tokens, setTokens] = useState<TokensType>(tokensData);
  const [tokenA, setTokenA] = useState<string>('aih');
  const [tokenB, setTokenB] = useState<string>('td');
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
      pairAddress: 'Pair Address',
      copy: 'Copy',
      lpTokenBalance: 'LP Token Balance',
      addToWallet: 'Add to Wallet',
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
      liquidityAdded: '流动性已成功添加',
      success: '成功',
      approving: '正在批准',
      addingLiquidity: '正在添加流动性',
      processing: '处理中',
      pairAddress: '交易对地址',
      copy: '复制',
      lpTokenBalance: 'LP代币余额',
      addToWallet: '添加到钱包',
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
    
    // Direct immediate refresh once when component mounts
    const immediateRefresh = async () => {
      if (isConnected && address) {
        try {
          console.log("Initial positions refresh on mount");
          await refreshPositions();
        } catch (error) {
          console.error("Error during initial positions refresh:", error);
        }
      }
    };
    
    setTimeout(immediateRefresh, 1000); // Slight delay to ensure wallet is fully connected
  }, []);
  
  // Fetch token balances and user positions when connected
  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetch data function called");
      
      if (!isConnected) {
        console.log("Not connected, skipping data fetch");
        return;
      }
      
      if (!address) {
        console.log("No address available, skipping data fetch");
        return;
      }
      
      if (!mounted) {
        console.log("Component not mounted, skipping data fetch");
        return;
      }
      
      try {
        console.log("Fetching data for connected wallet:", address);
        
        // Update token balances
        const updatedTokens = { ...tokens };
        
        for (const [key, token] of Object.entries(tokens)) {
          try {
            const balance = await getTokenBalance(token.address, address);
            console.log(`Token ${key} balance: ${balance}`);
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
    
    // Prevent multiple simultaneous transactions
    if (isProcessingTransaction) {
      showError('Transaction in progress. Please wait...');
      return;
    }
    
    try {
      setIsProcessingTransaction(true);
      setIsApprovingA(true);
      showLoading(`${lt('approving')} ${tokens[tokenA].symbol}...`);
      
      // Execute approval with timeout
      const tx = await Promise.race([
        approveToken(tokens[tokenA].address, tokenAAmount),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Approval timeout')), 30000)
        )
      ]) as any;
      
      // Wait for transaction with timeout
      await Promise.race([
        tx.wait(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ]);
      
      hideLoading();
      showSuccess(`${tokens[tokenA].symbol} ${lt('approved')}`);
    } catch (error) {
      console.error('Error approving token A:', error);
      hideLoading();
      
      let errorMessage = String(error);
      if (error instanceof Error) {
        if (error.message.includes('ReentrancyGuard') || error.message.includes('reentrant call')) {
          errorMessage = 'Contract is already processing a transaction. Please wait a few minutes and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(`${lt('error')}: ${errorMessage}`);
    } finally {
      setIsApprovingA(false);
      // Add a delay before allowing new transactions
      setTimeout(() => {
        setIsProcessingTransaction(false);
      }, 3000);
    }
  };
  
  // Handle approve token B
  const handleApproveTokenB = async (): Promise<void> => {
    if (!isConnected || !tokenBAmount) return;
    
    // Prevent multiple simultaneous transactions
    if (isProcessingTransaction) {
      showError('Transaction in progress. Please wait...');
      return;
    }
    
    try {
      setIsProcessingTransaction(true);
      setIsApprovingB(true);
      showLoading(`${lt('approving')} ${tokens[tokenB].symbol}...`);
      
      // Execute approval with timeout
      const tx = await Promise.race([
        approveToken(tokens[tokenB].address, tokenBAmount),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Approval timeout')), 30000)
        )
      ]) as any;
      
      // Wait for transaction with timeout
      await Promise.race([
        tx.wait(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ]);
      
      hideLoading();
      showSuccess(`${tokens[tokenB].symbol} ${lt('approved')}`);
    } catch (error) {
      console.error('Error approving token B:', error);
      hideLoading();
      
      let errorMessage = String(error);
      if (error instanceof Error) {
        if (error.message.includes('ReentrancyGuard') || error.message.includes('reentrant call')) {
          errorMessage = 'Contract is already processing a transaction. Please wait a few minutes and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showError(`${lt('error')}: ${errorMessage}`);
    } finally {
      setIsApprovingB(false);
      // Add a delay before allowing new transactions
      setTimeout(() => {
        setIsProcessingTransaction(false);
      }, 3000);
    }
  };
  
  // Add a debounce mechanism to prevent multiple rapid calls
  const [isProcessingTransaction, setIsProcessingTransaction] = useState<boolean>(false);
  
  // Add contract reset function
  const resetContractState = async (): Promise<void> => {
    try {
      showLoading("Resetting contract state...");
      
      // Handle case where there's no connected wallet
      if (!address) {
        console.log("No wallet connected, can't reset contract state");
        hideLoading();
        return;
      }
      
      // Try a different approach that doesn't rely on specific router functions
      try {
        // Get provider directly
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        
        // Check network status
        const network = await provider.getNetwork();
        console.log("Current network:", network);
        
        // Get latest block - this can help refresh state
        const latestBlock = await provider.getBlockNumber();
        console.log("Latest block:", latestBlock);
      } catch (error) {
        console.error("Error checking network:", error);
      }
      
      hideLoading();
      showSuccess("Ready to proceed with transaction");
      return;
    } catch (error) {
      console.error("Error resetting contract state:", error);
      hideLoading();
      showError(`Failed to reset: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // We need to check the contract's actual function signature
  // Let's add a debugging function to log contract methods
  const debugContractMethods = async () => {
    try {
      console.log("Debugging contract methods...");
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      // Get router contract
      const routerContract = getRouterContract().connect(signer);
      
      // Log contract address
      console.log("Router contract address:", routerContract.address);
      
      // List all functions in the router contract
      console.log("Router contract interface:", routerContract.interface.fragments.map(f => {
        if (f.type === "function") {
          const fragment = f as ethers.utils.FunctionFragment;
          return {
            name: fragment.name,
            inputs: fragment.inputs?.map(i => i.type),
            outputs: fragment.outputs?.map(o => o.type)
          };
        }
        return null;
      }).filter(Boolean));
      
      // Check specifically for addLiquidity function
      const addLiquidityFunction = routerContract.interface.getFunction("addLiquidity");
      if (addLiquidityFunction) {
        console.log("addLiquidity function details:", {
          name: addLiquidityFunction.name,
          params: addLiquidityFunction.inputs.map(input => ({ 
            name: input.name, 
            type: input.type 
          })),
          parameterCount: addLiquidityFunction.inputs.length,
          signature: addLiquidityFunction.format()
        });
      }
      
    } catch (error) {
      console.error("Error debugging contract:", error);
    }
  };

  // Call the debug function
  debugContractMethods();

  // Let's modify how we call addLiquidity
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

    // Prevent multiple simultaneous transactions
    if (isProcessingTransaction) {
      showError('Transaction in progress. Please wait...');
      return;
    }
    
    try {
      setIsProcessingTransaction(true);
      setIsAddingLiquidity(true);
      
      // First try to reset contract state
      await resetContractState();
      
      // Small delay after reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showLoading(lt('addingLiquidity'));
      
      // Get provider directly
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      // Validate address
      const signerAddress = await signer.getAddress();
      if (signerAddress !== address) {
        throw new Error("Signer address mismatch");
      }
      
      // Get router contract and explicitly connect it to signer
      const routerContract = getRouterContract().connect(signer);
      
      console.log("Router contract info:", {
        address: routerContract.address,
        hasSigner: !!routerContract.signer,
        signerAddress: await routerContract.signer.getAddress()
      });
      
      // Make sure we have a valid contract
      if (!routerContract || !routerContract.address) {
        throw new Error("Invalid router contract");
      }
      
      // Get token contracts with signer
      const tokenAContract = getTokenContract(tokens[tokenA].address).connect(signer);
      const tokenBContract = getTokenContract(tokens[tokenB].address).connect(signer);
      
      if (!tokenAContract || !tokenBContract) {
        throw new Error("Failed to get token contracts");
      }
      
      // Check if tokens are approved
      const tokenAAllowance = await tokenAContract.allowance(address, routerContract.address);
      const tokenBAllowance = await tokenBContract.allowance(address, routerContract.address);
      
      const tokenAAmountWei = ethers.utils.parseUnits(tokenAAmount, tokens[tokenA].decimals);
      const tokenBAmountWei = ethers.utils.parseUnits(tokenBAmount, tokens[tokenB].decimals);
      
      // Approve tokens if needed with high gas limit
      if (tokenAAllowance.lt(tokenAAmountWei)) {
        showLoading(`Approving ${tokens[tokenA].symbol}...`);
        
        const gasPrice = await provider.getGasPrice();
        
        const approveTxA = await tokenAContract.approve(
          routerContract.address,
          ethers.constants.MaxUint256,
          {
            gasLimit: 300000, // Manual high gas limit
            gasPrice 
          }
        );
        
        await approveTxA.wait();
      }
      
      if (tokenBAllowance.lt(tokenBAmountWei)) {
        showLoading(`Approving ${tokens[tokenB].symbol}...`);
        
        const gasPrice = await provider.getGasPrice();
        
        const approveTxB = await tokenBContract.approve(
          routerContract.address,
          ethers.constants.MaxUint256,
          {
            gasLimit: 300000, // Manual high gas limit
            gasPrice
          }
        );
        
        await approveTxB.wait();
      }
      
      // Small delay after approvals
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showLoading(lt('addingLiquidity'));
      
      // Calculate minimum amounts based on slippage
      const slippageFactor = 1 - (slippage / 100);
      // Initial min amounts (will be overridden by safety settings)
      let amountAMin = tokenAAmountWei.mul(Math.floor(slippageFactor * 1000)).div(1000);
      let amountBMin = tokenBAmountWei.mul(Math.floor(slippageFactor * 1000)).div(1000);
      
      // Get deadline
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60; // 20 minutes
      
      // Get gas price once for the transaction
      const gasPrice = await provider.getGasPrice();
      
      // Add additional pre-transaction checks to avoid failures
      // 1. Verify token balances are sufficient
      const tokenABalance = await tokenAContract.balanceOf(address);
      const tokenBBalance = await tokenBContract.balanceOf(address);
      
      console.log("Token balances before transaction:", {
        tokenA: ethers.utils.formatUnits(tokenABalance, tokens[tokenA].decimals),
        tokenB: ethers.utils.formatUnits(tokenBBalance, tokens[tokenB].decimals),
        requiredA: tokenAAmount,
        requiredB: tokenBAmount
      });
      
      if (tokenABalance.lt(tokenAAmountWei)) {
        throw new Error(`Insufficient ${tokens[tokenA].symbol} balance. You have ${ethers.utils.formatUnits(tokenABalance, tokens[tokenA].decimals)} but need ${tokenAAmount}.`);
      }
      
      if (tokenBBalance.lt(tokenBAmountWei)) {
        throw new Error(`Insufficient ${tokens[tokenB].symbol} balance. You have ${ethers.utils.formatUnits(tokenBBalance, tokens[tokenB].decimals)} but need ${tokenBAmount}.`);
      }
      
      // 2. Check if pair already exists - SKIP THIS SINCE FACTORY ISN'T AVAILABLE
      let pairExists = false;
      try {
        console.log("Skipping pair check since factory() is not available on router");
        
        // Instead of checking for pair existence, we'll directly create
        // the pair using a separate function
        try {
          // Try to create the pair anyway - this will fail silently if pair exists
          await createTokenPair(
            tokens[tokenA].address,
            tokens[tokenB].address
          );
          console.log("Attempted to create pair directly");
        } catch (createError) {
          console.log("Pair creation attempt result:", createError);
          // It's fine if this fails - the pair might already exist
        }
      } catch (pairError) {
        console.error("Error with pair creation:", pairError);
        // Continue anyway, the router should handle this
      }
      
      // 3. Set high slippage to help the transaction succeed
      // Always use higher slippage for safety
      const safetySlippage = 5; // 5% slippage
      const safetyFactor = 1 - (safetySlippage / 100);
      // Override min amounts with safer values
      amountAMin = tokenAAmountWei.mul(Math.floor(safetyFactor * 1000)).div(1000);
      amountBMin = tokenBAmountWei.mul(Math.floor(safetyFactor * 1000)).div(1000);
      
      console.log("Using safe slippage settings", {
        slippage: `${safetySlippage}%`,
        minA: ethers.utils.formatUnits(amountAMin, tokens[tokenA].decimals),
        minB: ethers.utils.formatUnits(amountBMin, tokens[tokenB].decimals)
      });
      
      console.log("Add liquidity parameters:", {
        tokenA: tokens[tokenA].address,
        tokenB: tokens[tokenB].address,
        amountA: tokenAAmountWei.toString(),
        amountB: tokenBAmountWei.toString(),
        amountAMin: amountAMin.toString(),
        amountBMin: amountBMin.toString(),
        to: address,
        deadline: deadline,
        gasLimit: 600000,
        gasPrice: gasPrice.toString()
      });
      
      // Try different ways to call addLiquidity based on contract interface
      let addLiquidityTx;
      
      try {
        // Based on debugging results, we'll use the correct parameter count
        // If it needs 7 parameters
        addLiquidityTx = await routerContract.addLiquidity(
          tokens[tokenA].address,
          tokens[tokenB].address,
          tokenAAmountWei,
          tokenBAmountWei,
          amountAMin,
          amountBMin,
          address, // to address
          // Transaction overrides
          {
            gasLimit: 600000,
            gasPrice
          }
        );
      } catch (err) {
        console.log("First attempt failed, trying alternative approaches:", err);
        
        // Let's try a different method that might be available
        try {
          // Try calling router's addLiquidityETH if one token is ETH
          if (tokens[tokenA].address === TOKENS.ETH) {
            addLiquidityTx = await routerContract.addLiquidityETH(
              tokens[tokenB].address, // token address
              tokenBAmountWei,        // token amount
              amountBMin,             // token amount min
              amountAMin,             // ETH amount min
              address,                // to address
              deadline,               // deadline
              {
                value: tokenAAmountWei, // ETH value
                gasLimit: 600000,
                gasPrice
              }
            );
          } else if (tokens[tokenB].address === TOKENS.ETH) {
            addLiquidityTx = await routerContract.addLiquidityETH(
              tokens[tokenA].address, // token address
              tokenAAmountWei,        // token amount
              amountAMin,             // token amount min
              amountBMin,             // ETH amount min
              address,                // to address
              deadline,               // deadline
              {
                value: tokenBAmountWei, // ETH value
                gasLimit: 600000,
                gasPrice
              }
            );
          } else {
            // Try with all parameters including deadline
            addLiquidityTx = await routerContract.addLiquidity(
              tokens[tokenA].address,
              tokens[tokenB].address,
              tokenAAmountWei,
              tokenBAmountWei,
              amountAMin,
              amountBMin,
              address, // to address
              deadline,
              {
                gasLimit: 600000,
                gasPrice
              }
            );
          }
        } catch (secondError: any) {
          console.error("All standard attempts failed:", secondError);
          
          // Last resort: Try using the addLiquidity function from utils/contracts directly
          // This is our fallback method that uses a different interface
          try {
            showLoading("Trying fallback liquidity method...");
            addLiquidityTx = await addLiquidity(
              tokens[tokenA].address,
              tokens[tokenB].address,
              tokenAAmount,  // Use string amounts since the underlying function handles conversion
              tokenBAmount,
              safetySlippage
            );
            
            console.log("Fallback method transaction:", addLiquidityTx);
          } catch (fallbackError: any) {
            console.error("Fallback method also failed:", fallbackError);
            throw new Error(`All liquidity addition methods failed. Last error: ${fallbackError.message || "Unknown error"}`);
          }
        }
      }
      
      showLoading(`Transaction submitted: ${addLiquidityTx.hash}`);
      
      // Wait for confirmation
      const receipt = await addLiquidityTx.wait();
      
      // Add this code after receipt is confirmed
      console.log("Transaction receipt:", receipt);
      
      // Get pair address to find LP token
      const pairAddress = await getRouterContract().getPairAddress(
        tokens[tokenA].address,
        tokens[tokenB].address
      );
      
      if (pairAddress && pairAddress !== ethers.constants.AddressZero) {
        // Store LP info for staking redirection
        setStakingInfo({
          lpToken: pairAddress,
          tokenA: tokens[tokenA].address,
          tokenB: tokens[tokenB].address,
          amount: lpAmount
        });
        
        setShowStakingOption(true);
      }
      
      hideLoading();
      showSuccess(lt('liquidityAdded'));
      
      // Reset form
      setTokenAAmount('');
      setTokenBAmount('');
      setShowLpInfo(false);
      
      // Immediately refresh positions
      await refreshPositions();
      
      // Get LP token mint verification
      try {
        const verificationResult = await verifyLPTokenMint(
          tokens[tokenA].address,
          tokens[tokenB].address,
          address,
          addLiquidityTx.hash
        );
        
        if (verificationResult.success) {
          console.log(`LP tokens minted successfully! Amount: ${verificationResult.amount}`);
          showSuccess(`LP tokens received: ${verificationResult.amount}`);
          
          // Automatically add LP token to wallet
          try {
            await addLPTokenToWallet(tokens[tokenA].address, tokens[tokenB].address);
          } catch (walletAddError) {
            console.error("Could not add LP token to wallet:", walletAddError);
          }
        } else {
          console.warn("LP token minting verification failed. Check your wallet for LP tokens.");
        }
      } catch (verificationError) {
        console.error("Error verifying LP token mint:", verificationError);
      }
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
        } else if (error.message.includes('ReentrancyGuard') || error.message.includes('reentrant call')) {
          errorMessage = 'Contract is already processing a transaction. Please try again after 2-3 minutes or restart your wallet.';
        } else if (error.message.includes('requires a signer')) {
          errorMessage = 'Wallet connection issue. Please try resetting your wallet connection using the Force Reset button.';
        } else if (error.message.includes('transaction failed')) {
          // Extract transaction hash if available
          const txHashMatch = error.message.match(/transactionHash="([^"]+)"/);
          const txHash = txHashMatch ? txHashMatch[1] : 'unknown';
          
          errorMessage = `Transaction reverted on blockchain. This could be due to slippage, insufficient funds, or contract state. Try increasing slippage or using Force Reset. TX: ${txHash.substring(0, 10)}...`;
        } else if (error.message.includes('Insufficient')) {
          // This is our custom balance error from above
          errorMessage = error.message;
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
      // Add a longer delay before allowing new transactions
      setTimeout(() => {
        setIsProcessingTransaction(false);
      }, 10000);
    }
  };
  
  // Add a dedicated function to refresh positions
  const refreshPositions = async (): Promise<void> => {
    console.log("Starting position refresh...");
    
    if (!address) {
      console.error("No wallet address available, cannot refresh positions");
      return;
    }
    
    try {
      // 首先确保钱包连接
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (!accounts || accounts.length === 0) {
            console.log("No active account, trying to reconnect...");
            await window.ethereum.request({ method: 'eth_requestAccounts' });
          }
        } catch (error) {
          console.error("Error checking/reconnecting wallet:", error);
        }
      }
      
      console.log("Rebuilding token pairs for checking liquidity positions...");
      
      // 创建所有可能的代币对
      const possiblePairs: [string, string][] = [];
      const tokenEntries = Object.entries(tokens);
      
      // 首先添加特别关注的两个代币对
      if (TOKENS.TD && TOKENS.FHBI) {
        possiblePairs.push([TOKENS.TD, TOKENS.FHBI]); // TD-FHBI
        console.log("Added special pair: TD-FHBI");
      }
      
      if (TOKENS.FHBI2 && TOKENS.FHBI3) {
        possiblePairs.push([TOKENS.FHBI2, TOKENS.FHBI3]); // FHBI2-FHBI3
        console.log("Added special pair: FHBI2-FHBI3");
      }
      
      // 记录创建的所有其他对
      for (let i = 0; i < tokenEntries.length; i++) {
        for (let j = i + 1; j < tokenEntries.length; j++) {
          // 获取代币地址
          const tokenA = tokenEntries[i][1].address;
          const tokenB = tokenEntries[j][1].address;
          
          // 检查地址有效性
          if (tokenA && tokenB && tokenA !== ethers.constants.AddressZero && tokenB !== ethers.constants.AddressZero) {
            // 检查这个对是否已经在列表中
            const alreadyExists = possiblePairs.some(
              existingPair => 
                (existingPair[0] === tokenA && existingPair[1] === tokenB) || 
                (existingPair[0] === tokenB && existingPair[1] === tokenA)
            );
            
            if (!alreadyExists) {
              possiblePairs.push([tokenA, tokenB]);
              console.log(`Created pair: ${tokenEntries[i][0]}-${tokenEntries[j][0]}`);
            }
          }
        }
      }
      
      console.log(`Checking ${possiblePairs.length} possible pairs for user ${address}`);
      
      // 获取用户流动性位置
      const userPositions = await getUserLiquidityPositions(address, possiblePairs);
      console.log("Fetched positions:", userPositions);
      
      if (userPositions.length > 0) {
        console.log(`Found ${userPositions.length} positions, updating state...`);
        // 重要：使用新的数组引用确保React检测到变化
        setPositions([...userPositions]);
      } else {
        console.log("No positions found");
        setPositions([]);
      }
      
      return;
    } catch (error) {
      console.error("Error refreshing positions:", error);
      // 错误情况下，尝试保持现有状态
    }
  };
  
  // Handle remove liquidity for a position
  const handleRemoveLiquidity = async (position: LiquidityPosition): Promise<void> => {
    if (!address) {
      showError(lt('pleaseConnectWallet'));
      return;
    }
    
    // Prevent multiple simultaneous transactions
    if (isProcessingTransaction) {
      showError('Transaction in progress. Please wait...');
      return;
    }
    
    try {
      setIsProcessingTransaction(true);
      setIsRemovingLiquidity(true);
      showLoading(`${lt('removingLiquidity')} ${position.tokenASymbol}-${position.tokenBSymbol}...`);
      
      console.log(`${lt('removingLiquidity')}: ${position.tokenASymbol}-${position.tokenBSymbol}`);
      console.log(`${lt('liquidityAmount')}: ${position.lpBalance}`);
      
      try {
        // Get provider directly
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        const signer = provider.getSigner();
        
        // Validate address
        const signerAddress = await signer.getAddress();
        if (signerAddress !== address) {
          throw new Error("Signer address mismatch");
        }
        
        // Get router contract and explicitly connect it to signer
        const routerContract = getRouterContract(signer);
        
        // IMPORTANT: Get the correct LP token address from the router
        // We need to get the LP token address associated with the pair, not use the pair address itself
        const pairAddress = await routerContract.getPairAddress(position.tokenA, position.tokenB);
        const lpTokenAddress = await routerContract.getLPToken(pairAddress);
        
        console.log(`Pair address: ${pairAddress}`);
        console.log(`LP token address: ${lpTokenAddress}`);
        
        if (!lpTokenAddress || lpTokenAddress === ethers.constants.AddressZero) {
          throw new Error("Could not find LP token address for this pair");
        }
        
        const lpTokenContract = getTokenContract(lpTokenAddress).connect(signer);
        const lpAmount = ethers.utils.parseUnits(position.lpBalance);
        
        // First approve LP token with timeout
        showLoading(`Approving LP token for removal...`);
        
        const gasPrice = await provider.getGasPrice();
        
        const approvalTx = await lpTokenContract.approve(
          routerContract.address, // IMPORTANT: Approve the router contract, not the LP token
          lpAmount,
          {
            gasLimit: 300000,
            gasPrice
          }
        );
        
        // Wait for approval confirmation with timeout
        await Promise.race([
          approvalTx.wait(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Approval confirmation timeout')), 60000)
          )
        ]);
        
        console.log("LP token approved for removal");
        
        // Small delay between approval and removal to avoid transaction collisions
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Calculate minimum amounts based on slippage
        const slippageFactor = 1 - (slippage / 100);
        const amountAMin = ethers.utils.parseUnits(position.tokenAAmount).mul(Math.floor(slippageFactor * 1000)).div(1000);
        const amountBMin = ethers.utils.parseUnits(position.tokenBAmount).mul(Math.floor(slippageFactor * 1000)).div(1000);
        
        showLoading(`Removing liquidity...`);
        
        // Remove deadline parameter which was incorrectly included
        const removeTx = await routerContract.removeLiquidity(
          position.tokenA,
          position.tokenB,
          lpAmount,
          amountAMin,
          amountBMin,
          address,
          {
            gasLimit: 600000,
            gasPrice
          }
        );
        
        console.log(`${lt('transactionSubmitted')}: ${removeTx.hash}`);
        
        // Wait for transaction confirmation with timeout
        const receipt = await Promise.race([
          removeTx.wait(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
          )
        ]);
        
        console.log(`${lt('transactionConfirmed')}, ${lt('blockHeight')}: ${receipt.blockNumber}`);
        
        hideLoading();
        showSuccess(`${lt('liquidityRemoved')} ${lt('checkWalletBalance')}`);
        
        // Refresh positions 
        await refreshPositions();
      } catch (error: any) {
        console.error(`${lt('removeLiquidityError')}:`, error);
        hideLoading();
        
        let errorMessage = error.message || lt('unknownError');
        if (error.message.includes('ReentrancyGuard') || error.message.includes('reentrant call')) {
          errorMessage = 'Contract is already processing a transaction. Please wait a few minutes and try again.';
        } else if (error.message.includes('requires a signer')) {
          errorMessage = 'Wallet connection issue. Please try resetting your wallet connection using the Force Reset button.';
        } else if (error.message.includes('to non-contract address')) {
          errorMessage = 'The operation is trying to interact with a non-contract address. Please reset your connection and try again.';
        }
        
        showError(`${lt('removeLiquidityError')}: ${errorMessage}`);
      }
    } finally {
      setIsRemovingLiquidity(false);
      // Add a delay before allowing new transactions
      setTimeout(() => {
        setIsProcessingTransaction(false);
      }, 5000);
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
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      
      const codeA = await provider.getCode(position.tokenA);
      const codeB = await provider.getCode(position.tokenB);
      
      let message = `Position verification for ${position.tokenASymbol}-${position.tokenBSymbol}:\n`;
      message += `Token A (${position.tokenASymbol}) address: ${position.tokenA}\n`;
      message += `Token B (${position.tokenBSymbol}) address: ${position.tokenB}\n`;
      message += `Token A contract code length: ${codeA.length}\n`;
      message += `Token B contract code length: ${codeB.length}\n`;
      
      // Get pair address from token addresses directly
      try {
        const factory = getRouterContract().connect(signer).factory();
        const pairAddress = await factory.getPair(position.tokenA, position.tokenB);
        message += `Pair address from factory: ${pairAddress}\n`;
      } catch (error) {
        message += `Error getting pair address from factory: ${error instanceof Error ? error.message : String(error)}\n`;
      }
      
      message += `Position pair address: ${position.pairAddress}\n`;
      
      // Check if pair address is a valid contract
      try {
        const pairCode = await provider.getCode(position.pairAddress);
        message += `Pair contract code length: ${pairCode.length}\n`;
        
        if (pairCode.length <= 2) {
          message += `ERROR: Pair address is not a valid contract!\n`;
        } else {
          // Try to get LP token info
          try {
            const lpContract = getTokenContract(position.pairAddress).connect(signer);
            const name = await lpContract.name();
            const symbol = await lpContract.symbol();
            const decimals = await lpContract.decimals();
            message += `LP Token name: ${name}\n`;
            message += `LP Token symbol: ${symbol}\n`;
            message += `LP Token decimals: ${decimals}\n`;
          } catch (e) {
            message += `ERROR: Failed to get LP token info: ${e instanceof Error ? e.message : String(e)}\n`;
          }
          
          // Try to get LP balance directly
          try {
            const lpContract = getTokenContract(position.pairAddress).connect(signer);
            const balance = await lpContract.balanceOf(address);
            message += `LP Balance direct check: ${ethers.utils.formatUnits(balance)}\n`;
            message += `LP Balance from position: ${position.lpBalance}\n`;
          } catch (e) {
            message += `ERROR: Failed to get LP balance: ${e instanceof Error ? e.message : String(e)}\n`;
          }
        }
      } catch (e) {
        message += `ERROR: Failed to check pair contract: ${e instanceof Error ? e.message : String(e)}\n`;
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

  // Show loading notification
  const showLoading = (message: string) => {
    // Check if message contains a transaction hash and truncate it
    if (message.includes('Transaction submitted:')) {
      const parts = message.split('Transaction submitted:');
      const prefix = parts[0] + 'Transaction submitted: ';
      const hash = parts[1].trim();
      // Truncate the hash if it's longer than 14 characters
      const truncatedHash = hash.length > 14 ? `${hash.substring(0, 10)}...` : hash;
      message = prefix + truncatedHash;
    }
    
    showNotificationMessage('loading', message, 0); // 持续时间为0表示不自动关闭
  };

  const hideLoading = () => {
    setLoading(false);
    setShowNotification(false);
  };

  // Add monitoring for positions state changes
  useEffect(() => {
    console.log("Positions state changed:", positions.length > 0 ? "Has positions" : "No positions");
  }, [positions]);

  // Add debug button in header area
  const debugWalletAndData = async () => {
    try {
      console.log("Debug: Checking wallet status");
      if (!isConnected || !address) {
        console.error("Wallet not connected or no address available");
        return;
      }

      console.log("Connected wallet address:", address);
      console.log("Window ethereum status:", {
        isMetaMask: window.ethereum?.isMetaMask,
        selectedAddress: window.ethereum?.selectedAddress,
        isConnected: window.ethereum?.isConnected?.()
      });

      // Check token balances directly
      for (const [key, token] of Object.entries(tokens)) {
        try {
          const balance = await getTokenBalance(token.address, address);
          console.log(`Token ${token.symbol} balance:`, balance);
        } catch (error) {
          console.error(`Error getting ${token.symbol} balance:`, error);
        }
      }

      // Try direct fetch of positions
      try {
        await refreshPositions();
        console.log("Positions after refresh:", positions);
      } catch (error) {
        console.error("Error refreshing positions:", error);
      }
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  // Add reconnect and force refresh function
  const reconnectAndRefresh = async () => {
    try {
      console.log("Attempting to reconnect wallet and force refresh data");
      
      // 强制重连钱包
      if (window.ethereum) {
        try {
          // 请求账户连接
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log("Accounts after reconnect:", accounts);
          
          // 获取网络ID
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          console.log("Current chain ID:", chainId);
          
          // 短暂延迟后刷新页面数据
          setTimeout(async () => {
            try {
              // 强制刷新代币余额
              const updatedTokens = { ...tokens };
              
              for (const [key, token] of Object.entries(tokens)) {
                try {
                  if (accounts[0]) {
                    const balance = await getTokenBalance(token.address, accounts[0]);
                    updatedTokens[key] = { ...token, balance };
                    console.log(`Updated ${token.symbol} balance: ${balance}`);
                  }
                } catch (error) {
                  console.error(`Error updating ${token.symbol} balance:`, error);
                }
              }
              
              setTokens(updatedTokens);
              
              // 刷新流动性位置
              await refreshPositions();
            } catch (error) {
              console.error("Error in delayed refresh:", error);
            }
          }, 1000);
        } catch (error) {
          console.error("Error reconnecting wallet:", error);
        }
      } else {
        console.error("No ethereum provider found");
      }
    } catch (error) {
      console.error("Error in reconnect function:", error);
    }
  };

  // Add handleAddLPTokenToWallet function
  const handleAddLPTokenToWallet = async (position: LiquidityPosition): Promise<void> => {
    if (!address) {
      showError(lt('pleaseConnectWallet'));
      return;
    }
    
    try {
      showLoading('Adding LP token to wallet...');
      
      // Get the LP token address and verify it's a contract
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      // Check if position has a valid LP token address
      let lpTokenAddressToUse = position.lpTokenAddress;
      
      if (!lpTokenAddressToUse || lpTokenAddressToUse === ethers.constants.AddressZero) {
        console.log("Position doesn't have valid LP token address, getting it from router");
        const router = getRouterContract();
        const pairAddress = await router.getPairAddress(position.tokenA, position.tokenB);
        
        if (pairAddress === ethers.constants.AddressZero) {
          throw new Error("Pair doesn't exist");
        }
        
        // Get the LP token address
        const lpTokenAddress = await router.getLPToken(pairAddress);
        if (lpTokenAddress === ethers.constants.AddressZero) {
          throw new Error("LP token address not found");
        }
        
        // Use this address instead
        lpTokenAddressToUse = lpTokenAddress;
        console.log(`Using LP token address from router: ${lpTokenAddressToUse}`);
      }
      
      // Verify it's a contract
      const code = await provider.getCode(lpTokenAddressToUse);
      if (code === '0x' || code === '') {
        console.error("LP token address is not a contract:", lpTokenAddressToUse);
        throw new Error("LP token address is not a contract");
      }
      
      // Check balance
      const lpTokenContract = new ethers.Contract(
        lpTokenAddressToUse,
        ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
        provider
      );
      
      const balance = await lpTokenContract.balanceOf(address);
      const decimals = await lpTokenContract.decimals().catch(() => 18); // Default to 18 if fails
      console.log(`LP token balance: ${ethers.utils.formatUnits(balance, decimals)}`);
      
      // Add the token to wallet
      const success = await addLPTokenToWallet(position.tokenA, position.tokenB);
      
      if (success) {
        hideLoading();
        showSuccess(`${lt('lpTokenBalance')}: ${ethers.utils.formatUnits(balance, decimals)}`);
      } else {
        throw new Error("Failed to add LP token to wallet");
      }
    } catch (error: any) {
      hideLoading();
      console.error("Error adding LP token to wallet:", error);
      showError(`Error: ${error.message || "Unknown error"}`);
    }
  };

  // Add force reset function
  const forceResetWalletAndContract = async (): Promise<void> => {
    try {
      showLoading("Force resetting wallet connection and contracts...");
      
      // First try to disconnect wallet (if possible)
      if (window.ethereum) {
        try {
          // Clear any cached data
          localStorage.removeItem('walletconnect');
          localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
          
          // Try to request fresh permissions
          try {
            // This is a trick to force MetaMask to refresh its state
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }],
            });
          } catch (permissionError) {
            console.log("Permission request failed, trying alternative method", permissionError);
            
            // Alternative: Just request accounts again
            await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
          }
        } catch (walletError) {
          console.error("Error resetting wallet:", walletError);
        }
      }
      
      // Try to reset network state
      try {
        // Get provider directly
        const provider = new ethers.providers.Web3Provider(window.ethereum as any);
        
        // Get network information
        const network = await provider.getNetwork();
        console.log("Current network:", network.name, "chainId:", network.chainId);
        
        // Get latest block - this can help refresh state
        const latestBlock = await provider.getBlockNumber();
        console.log("Latest block:", latestBlock);
        
        // Check account
        const accounts = await provider.listAccounts();
        console.log("Connected accounts:", accounts);
        
        if (accounts.length === 0) {
          throw new Error("No accounts connected");
        }
      } catch (networkError) {
        console.error("Error checking network:", networkError);
      }
      
      // Clear any pending transactions in our own state
      setIsProcessingTransaction(false);
      setIsAddingLiquidity(false);
      setIsApprovingA(false);
      setIsApprovingB(false);
      setIsRemovingLiquidity(false);
      
      // Reset form
      setTokenAAmount('');
      setTokenBAmount('');
      setShowLpInfo(false);
      
      try {
        // Force refresh the page data
        await refreshPositions();
        
        // Force refresh token balances
        const updatedTokens = { ...tokens };
        
        for (const [key, token] of Object.entries(tokens)) {
          try {
            if (!token.address || token.address === ethers.constants.AddressZero) {
              continue;
            }
            
            // Check if token address is a valid contract
            if (token.address && token.address !== ethers.constants.AddressZero) {
              const balance = await getTokenBalance(token.address, address);
              updatedTokens[key] = { ...token, balance };
              console.log(`Updated ${token.symbol} balance: ${balance}`);
            }
          } catch (error) {
            console.error(`Error updating ${token.symbol} balance:`, error);
          }
        }
        
        setTokens(updatedTokens);
      } catch (dataError) {
        console.error("Error refreshing data:", dataError);
      }
      
      hideLoading();
      showSuccess("Wallet and network state reset successfully. Try your transaction again.");
    } catch (error) {
      console.error("Error in force reset:", error);
      hideLoading();
      showError(`Reset failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 添加一个格式化函数来限制代币数量的小数位数
  const formatTokenAmount = (amount: string): string => {
    // 尝试将字符串转换为数字
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;

    // 精确到小数点后四位
    return num.toFixed(4);
  };

  // Add new state variables
  const [showStakingOption, setShowStakingOption] = useState<boolean>(false);
  const [stakingInfo, setStakingInfo] = useState<{
    lpToken: string;
    tokenA: string;
    tokenB: string;
    amount: string;
  } | null>(null);
  const router = useRouter();
  
  // Return section updated to use CSS modules
  return (
    <div className={styles.container}>
      {/* 全局通知组件 */}
      {showNotification && (
        <div className={styles.notificationContainer}>
          <div className={`${styles.notification} ${
            notificationType === 'success' ? styles.success : 
            notificationType === 'error' ? styles.error : 
            styles.loading
          }`}>
            <div className={styles.notificationContent}>
              <div className={styles.notificationIcon}>
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
                  <svg className={`h-6 w-6 text-blue-400 ${styles.spinner}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
              
              <div className={styles.notificationBody}>
                <p className={`${
                  notificationType === 'success' ? styles.successType : 
                  notificationType === 'error' ? styles.errorType : 
                  styles.loadingType
                }`}>
                  {notificationType === 'success' ? lt('success') : 
                   notificationType === 'error' ? lt('error') : 
                   lt('processing')}
                </p>
                <p className={`${
                  notificationType === 'success' ? styles.successMessage : 
                  notificationType === 'error' ? styles.errorMessage : 
                  styles.loadingMessage
                }`}>
                  {notificationMessage}
                </p>
              </div>
              
              <button
                onClick={closeNotification}
                className={styles.closeNotificationBtn}
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        {/* Add Liquidity Card */}
        <div className={styles.liquidityCard}>
          <div className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>{lt('addLiquidity')}</h1>
            {/* Settings button - Hidden as requested */}
            {/* <div className={styles.settingsButton}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div> */}
          </div>
          
          {/* Token A input */}
          <div className={styles.inputContainer}>
            <div className={styles.inputHeader}>
              <span className={styles.inputLabel}>{lt('tokenA')}</span>
              <span className={styles.balanceText}>
                {!mounted ? lt('connectWallet') : (
                  isConnected 
                    ? `${lt('balance')}: ${formatTokenAmount(tokens[tokenA].balance)} ${tokens[tokenA].symbol}`
                    : lt('connectWallet')
                )}
              </span>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                placeholder="0.0"
                className={styles.tokenInput}
                value={tokenAAmount}
                onChange={(e) => setTokenAAmount(e.target.value)}
              />
              <div 
                className={styles.tokenSelector}
                onClick={() => {
                  setCurrentSelector('tokenA');
                  setShowTokenModal(true);
                }}
              >
                <span className={styles.tokenSymbol}>{tokens[tokenA].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Plus sign */}
          <div className={styles.plusSign}>
            <div className={styles.plusButton}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          
          {/* Token B input */}
          <div className={styles.inputContainer}>
            <div className={styles.inputHeader}>
              <span className={styles.inputLabel}>{lt('tokenB')}</span>
              <span className={styles.balanceText}>
                {!mounted ? lt('connectWallet') : (
                  isConnected 
                    ? `${lt('balance')}: ${formatTokenAmount(tokens[tokenB].balance)} ${tokens[tokenB].symbol}`
                    : lt('connectWallet')
                )}
              </span>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="number"
                placeholder="0.0"
                className={styles.tokenInput}
                value={tokenBAmount}
                onChange={(e) => setTokenBAmount(e.target.value)}
              />
              <div 
                className={styles.tokenSelector}
                onClick={() => {
                  setCurrentSelector('tokenB');
                  setShowTokenModal(true);
                }}
              >
                <span className={styles.tokenSymbol}>{tokens[tokenB].symbol}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* LP Token Info */}
          {showLpInfo && (
            <div className={styles.infoBox}>
              <h3 className={styles.infoTitle}>{lt('lpTokensReceive')}</h3>
              <div className={styles.lpTokenInfo}>
                <div className={styles.pairName}>
                  <span>{tokens[tokenA].symbol}-{tokens[tokenB].symbol}</span>
                </div>
                <span className={styles.lpAmount}>{formatTokenAmount(lpAmount)} LP</span>
              </div>
              <div className={styles.poolShareInfo}>
                <span>{lt('shareOfPool')}</span>
                <span>{poolShare}</span>
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
            <div className={styles.buttonGroup}>
              <div className={styles.approveBtnRow}>
                <button 
                  className={styles.approveBtn}
                  onClick={handleApproveTokenA}
                  disabled={isApprovingA || transactionPending || !tokenAAmount}
                >
                  {isApprovingA ? 'Approving...' : `Approve ${tokens[tokenA].symbol}`}
                </button>
                
                <button 
                  className={styles.approveBtn}
                  onClick={handleApproveTokenB}
                  disabled={isApprovingB || transactionPending || !tokenBAmount}
                >
                  {isApprovingB ? 'Approving...' : `Approve ${tokens[tokenB].symbol}`}
                </button>
              </div>
              
              <button 
                className={styles.actionBtn}
                onClick={handleAddLiquidity}
                disabled={!tokenAAmount || !tokenBAmount || isAddingLiquidity || transactionPending}
              >
                {isAddingLiquidity ? 'Adding Liquidity...' : lt('addButton')}
              </button>
            </div>
          )}
        </div>
        
        {/* My Liquidity Positions */}
        <div className={styles.positionsCard}>
          <div className={styles.positionsHeader}>
            <h2 className={styles.cardTitle}>{lt('myLiquidityPositions')}</h2>
            <button 
              className={styles.refreshButton}
              onClick={async () => {
                try {
                  await refreshPositions();
                } catch (err: any) {
                  console.error("Error refreshing positions:", err);
                }
              }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </div>
            </button>
          </div>
          <div className={styles.utilityBtnGroup}>
            <button 
              className={styles.reconnectBtn}
              onClick={reconnectAndRefresh}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Reconnect Wallet
            </button>
            <button 
              className={styles.resetBtn}
              onClick={forceResetWalletAndContract}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Force Reset
            </button>
          </div>
          
          {positions.length === 0 ? (
            <div className={styles.emptyPositions}>
              <p>{lt('noPositions')}</p>
            </div>
          ) : (
            <div>
              {positions.map((position, index) => {
                // Get token objects from addresses
                const tokenAObj = findTokenByAddress(position.tokenA);
                const tokenBObj = findTokenByAddress(position.tokenB);
                
                return (
                  <div key={index} className={styles.positionItem}>
                    <div className={styles.positionHeader}>
                      <div className={styles.positionPair}>
                        <span>{position.tokenASymbol}-{position.tokenBSymbol}</span>
                      </div>
                      <div className={styles.positionBtnGroup}>
                        <button 
                          className={styles.addBtn}
                          onClick={() => handleAddToPosition(position)}
                        >
                          {lt('add')}
                        </button>
                        <button 
                          className={styles.removeBtn}
                          onClick={() => handleRemoveLiquidity(position)}
                        >
                          {lt('remove')}
                        </button>
                      </div>
                    </div>
                    <div className={styles.positionGrid}>
                      <div className={styles.positionData}>
                        <div className={styles.dataLabel}>{lt('pooled')} {position.tokenASymbol}</div>
                        <div className={styles.dataValue}>{formatTokenAmount(position.tokenAAmount)} {position.tokenASymbol}</div>
                      </div>
                      <div className={styles.positionData}>
                        <div className={styles.dataLabel}>{lt('pooled')} {position.tokenBSymbol}</div>
                        <div className={styles.dataValue}>{formatTokenAmount(position.tokenBAmount)} {position.tokenBSymbol}</div>
                      </div>
                      <div className={styles.positionData}>
                        <div className={styles.dataLabel}>{lt('yourShare')}</div>
                        <div className={styles.dataValue}>{(position.poolShare).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className={styles.positionFooter}>
                      <div className={styles.pairInfo}>
                        <div className={styles.pairLabel}>{lt('pairAddress')}:</div>
                        <button 
                          className={styles.copyBtn}
                          onClick={() => {
                            navigator.clipboard.writeText(position.pairAddress)
                              .then(() => console.log("Address copied"))
                              .catch(err => console.error("Copy failed:", err));
                          }}
                        >
                          {lt('copy')}
                        </button>
                      </div>
                      <div className={styles.pairAddress}>{position.pairAddress}</div>
                      <div className={styles.lpInfo}>
                        <span className={styles.lpLabel}>{lt('lpTokenBalance')}:</span>
                        <div className={styles.lpBalanceGroup}>
                          <span className={styles.lpBalance}>{formatTokenAmount(position.lpBalance)}</span>
                          <button 
                            className={styles.addToWalletBtn}
                            onClick={() => handleAddLPTokenToWallet(position)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {lt('addToWallet')}
                          </button>
                        </div>
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
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{lt('selectToken')}</h3>
              <button 
                className={styles.closeButton}
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
              className={styles.searchInput}
            />
            <div className={styles.tokenList}>
              {Object.keys(tokens).map((tokenId) => (
                <div 
                  key={tokenId}
                  className={styles.tokenItem}
                  onClick={() => handleTokenSelect(tokenId)}
                >
                  <div className={styles.tokenInfo}>
                    <div className={styles.tokenName}>{tokens[tokenId].symbol}</div>
                    <div className={styles.tokenFullName}>{tokens[tokenId].name}</div>
                  </div>
                  <div className={styles.tokenBalance}>{tokens[tokenId].balance}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verification Result Modal */}
      {showVerificationModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.verificationModal}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Position Verification Results</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowVerificationModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={styles.verificationContent}>
              <pre className={styles.verificationResult}>{verificationResult}</pre>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.copyResultBtn}
                onClick={() => {
                  navigator.clipboard.writeText(verificationResult)
                    .then(() => showSuccess("Results copied to clipboard!"))
                    .catch(err => showError("Failed to copy: " + err.message));
                }}
              >
                Copy to Clipboard
              </button>
              <button
                className={styles.closeModalBtn}
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