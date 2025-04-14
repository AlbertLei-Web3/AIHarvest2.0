import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits } from 'ethers/lib/utils';
import { BigNumber, ethers } from 'ethers';
import { useAIHToken, useSimpleSwap } from '../../hooks';
import { UI_CONSTANTS, DEFAULT_TOKEN_LIST } from '../../utils/constants';
import { formatFromWei, calculatePriceImpact } from '../../utils/helpers';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
}

export const SwapInterface: React.FC = () => {
  // Use our hooks
  const { address } = useAccount();
  const { tokenAddress: aihTokenAddress } = useAIHToken();
  const { 
    swap, 
    isSwapping, 
    swapError,
    getAmountOut,
    getReserves,
    getPair
  } = useSimpleSwap();

  // Local state
  const [tokenFrom, setTokenFrom] = useState<Token>(DEFAULT_TOKEN_LIST[0]); // ETH
  const [tokenTo, setTokenTo] = useState<Token | null>(null);
  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(UI_CONSTANTS.SLIPPAGE_TOLERANCE_DEFAULT);
  const [isSelectingToken, setIsSelectingToken] = useState<'from' | 'to' | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [priceImpact, setPriceImpact] = useState<number>(0);

  // Get token balances
  const { data: nativeBalance } = useBalance({
    address,
    enabled: !!address && tokenFrom?.isNative,
  });

  const { data: tokenFromBalance } = useBalance({
    address,
    token: !tokenFrom?.isNative ? tokenFrom?.address as `0x${string}` : undefined,
    enabled: !!address && !tokenFrom?.isNative,
  });

  // Set AIH token when available
  useEffect(() => {
    if (aihTokenAddress && !tokenTo) {
      const aihToken = DEFAULT_TOKEN_LIST.find(t => t.symbol === 'AIH');
      if (aihToken) {
        const updatedToken = {...aihToken, address: aihTokenAddress};
        setTokenTo(updatedToken);
      }
    }
  }, [aihTokenAddress, tokenTo]);

  // Get pair and reserves when tokens change
  useEffect(() => {
    const fetchPairData = async () => {
      if (tokenFrom && tokenTo && tokenFrom.address !== tokenTo.address) {
        try {
          const pair = await getPair(tokenFrom.address, tokenTo.address);
          setPairAddress(pair);
        } catch (error) {
          console.error('Error fetching pair:', error);
          setPairAddress(null);
        }
      }
    };

    fetchPairData();
  }, [tokenFrom, tokenTo, getPair]);

  // Calculate output amount when input changes
  useEffect(() => {
    const calculateOutput = async () => {
      if (!amountFrom || !tokenFrom || !tokenTo || !pairAddress) {
        setAmountTo('');
        setPriceImpact(0);
        return;
      }

      setIsCalculating(true);

      try {
        // Parse input amount
        const parsedAmount = parseUnits(amountFrom, tokenFrom.decimals);
        
        // Get reserves
        const { reserveA, reserveB } = await getReserves(
          pairAddress,
          tokenFrom.address,
          tokenTo.address
        );
        
        // Calculate output
        const amountOut = await getAmountOut(parsedAmount, reserveA, reserveB);
        setAmountTo(formatUnits(amountOut, tokenTo.decimals));
        
        // Calculate price impact
        const impact = calculatePriceImpact(
          parseFloat(amountFrom),
          parseFloat(formatUnits(amountOut, tokenTo.decimals)),
          1, // Mock price for now
          1  // Mock price for now
        );
        setPriceImpact(impact);
      } catch (error) {
        console.error('Error calculating output:', error);
        setAmountTo('');
        setPriceImpact(0);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateOutput();
  }, [amountFrom, tokenFrom, tokenTo, pairAddress, getReserves, getAmountOut]);

  // Swap the tokens
  const handleSwapTokens = () => {
    const tempToken = tokenFrom;
    setTokenFrom(tokenTo as Token);
    setTokenTo(tempToken);
    setAmountFrom(amountTo);
    setAmountTo(amountFrom);
  };

  // Handle input change
  const handleFromAmountChange = (value: string) => {
    setAmountFrom(value);
  };

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    if (isSelectingToken === 'from') {
      if (tokenTo && token.address === tokenTo.address) {
        // If selected token is the same as destination, swap them
        setTokenFrom(tokenTo);
        setTokenTo(token);
      } else {
        setTokenFrom(token);
      }
    } else if (isSelectingToken === 'to') {
      if (token.address === tokenFrom.address) {
        // If selected token is the same as source, swap them
        setTokenTo(tokenFrom);
        setTokenFrom(token);
      } else {
        setTokenTo(token);
      }
    }
    setIsSelectingToken(null);
  };

  // Execute swap
  const handleSwap = async () => {
    if (!tokenFrom || !tokenTo || !amountFrom || !address) return;

    try {
      // Create the token path
      const path = [tokenFrom.address, tokenTo.address];
      
      // Calculate minimum output amount with slippage
      const amountOutMin = BigNumber.from(
        parseUnits(amountTo, tokenTo.decimals)
      )
        .mul(Math.floor((100 - slippage) * 100))
        .div(10000);
      
      // Execute swap
      await swap(
        parseUnits(amountFrom, tokenFrom.decimals),
        amountOutMin,
        path
      );
      
      // Reset form
      setAmountFrom('');
      setAmountTo('');
    } catch (error) {
      console.error('Swap error:', error);
    }
  };

  // Handle approval for ERC20 tokens before swapping
  const handleApproveAndSwap = async () => {
    if (!tokenFrom || !tokenTo || !amountFrom || !address) return;
    
    try {
      // Only need approval for non-native tokens
      if (!tokenFrom.isNative) {
        // For AIH token, we can use our existing hook
        if (tokenFrom.symbol === 'AIH') {
          const aihToken = useAIHToken();
          const { routerAddress } = useSimpleSwap();
          
          if (routerAddress) {
            await aihToken.approve(
              routerAddress,
              parseUnits(amountFrom, tokenFrom.decimals)
            );
          }
        } else {
          // For other tokens, we'll need to implement a more generic approach
          // For now, just log a message (this would be expanded in production)
          console.log(`Approval for ${tokenFrom.symbol} would happen here`);
          
          // In a real implementation, we would:
          // 1. Create a contract instance for the token
          // 2. Check current allowance
          // 3. Approve if necessary
        }
      }
      
      // Execute swap
      await handleSwap();
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  // Determine if swap button should be enabled
  const isSwapDisabled = (): boolean => {
    return (
      !amountFrom || 
      parseFloat(amountFrom) === 0 || 
      !amountTo || 
      parseFloat(amountTo) === 0 ||
      !address ||
      isSwapping ||
      isCalculating
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* From Token */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">From</span>
          <span className="text-sm text-gray-600">
            Balance: {
              tokenFrom?.isNative 
                ? nativeBalance ? parseFloat(nativeBalance.formatted).toFixed(4) : '0' 
                : tokenFromBalance ? parseFloat(tokenFromBalance.formatted).toFixed(4) : '0'
            } {tokenFrom?.symbol}
          </span>
        </div>
        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <input
            type="number"
            className="w-full bg-transparent focus:outline-none text-lg"
            placeholder="0.0"
            value={amountFrom}
            onChange={(e) => handleFromAmountChange(e.target.value)}
          />
          <button
            className="ml-2 flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg"
            onClick={() => setIsSelectingToken('from')}
          >
            <span className="mr-1">{tokenFrom?.symbol}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center my-4">
        <button
          className="bg-gray-100 hover:bg-gray-200 rounded-full p-2"
          onClick={handleSwapTokens}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">To (estimated)</span>
          <span className="text-sm text-gray-600"></span>
        </div>
        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <input
            type="number"
            className="w-full bg-transparent focus:outline-none text-lg"
            placeholder="0.0"
            value={amountTo}
            readOnly
          />
          <button
            className="ml-2 flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg"
            onClick={() => setIsSelectingToken('to')}
          >
            <span className="mr-1">{tokenTo?.symbol || 'Select'}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Price Impact and Slippage Settings */}
      <div className="mb-6">
        {priceImpact > 0 && (
          <div className={`p-2 rounded mb-2 text-sm ${
            priceImpact < 1 ? 'bg-green-50 text-green-700' :
            priceImpact < 3 ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            Price Impact: {priceImpact.toFixed(2)}%
          </div>
        )}
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Slippage Tolerance</span>
          <span className="text-sm text-blue-600">{slippage}%</span>
        </div>
        <div className="flex space-x-2">
          {UI_CONSTANTS.SLIPPAGE_TOLERANCE_OPTIONS.map((value) => (
            <button
              key={value}
              className={`px-3 py-1 rounded-md text-sm ${
                slippage === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              onClick={() => setSlippage(value)}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      {/* Error display */}
      {swapError && (
        <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">
          {swapError.message}
        </div>
      )}

      {/* Swap Button */}
      <button
        className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
          isSwapDisabled()
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        disabled={isSwapDisabled()}
        onClick={handleApproveAndSwap}
      >
        {isSwapping ? 'Swapping...' : !address ? 'Connect Wallet' : !tokenTo ? 'Select Tokens' : isSwapDisabled() ? 'Enter an amount' : 'Swap'}
      </button>

      {/* Token Selection Modal */}
      {isSelectingToken && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-96 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">Select a token</h3>
              <button onClick={() => setIsSelectingToken(null)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-500 hover:text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {DEFAULT_TOKEN_LIST.map((token) => {
                // Update AIH token address dynamically
                const tokenToDisplay = token.symbol === 'AIH' && aihTokenAddress 
                  ? {...token, address: aihTokenAddress} 
                  : token;
                
                return (
                  <button
                    key={tokenToDisplay.address}
                    className="flex items-center w-full p-3 hover:bg-gray-50 rounded-lg mb-2"
                    onClick={() => handleTokenSelect(tokenToDisplay)}
                  >
                    <div className="w-8 h-8 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                      {tokenToDisplay.logo ? (
                        <img src={tokenToDisplay.logo} alt={tokenToDisplay.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-sm font-bold">{tokenToDisplay.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{tokenToDisplay.symbol}</div>
                      <div className="text-sm text-gray-500">{tokenToDisplay.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 