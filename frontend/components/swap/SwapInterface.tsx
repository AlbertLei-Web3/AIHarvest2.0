import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'ethers/lib/utils';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Mock tokens for demonstration
const MOCK_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/images/tokens/eth.png'
  },
  {
    address: '0x1111111111111111111111111111111111111111',
    symbol: 'AIH',
    name: 'AIHarvest Token',
    decimals: 18,
    logoURI: '/images/tokens/aih.png'
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/images/tokens/usdc.png'
  }
];

export const SwapInterface: React.FC = () => {
  const [tokenFrom, setTokenFrom] = useState<Token>(MOCK_TOKENS[0]);
  const [tokenTo, setTokenTo] = useState<Token>(MOCK_TOKENS[1]);
  const [amountFrom, setAmountFrom] = useState<string>('');
  const [amountTo, setAmountTo] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5); // Default slippage tolerance
  const [isSelectingToken, setIsSelectingToken] = useState<'from' | 'to' | null>(null);

  const { address } = useAccount();
  const { data: balanceData } = useBalance({
    address,
    token: tokenFrom.address === '0x0000000000000000000000000000000000000000' ? undefined : tokenFrom.address as `0x${string}`,
  });

  // Swap the tokens
  const handleSwapTokens = () => {
    const tempToken = tokenFrom;
    setTokenFrom(tokenTo);
    setTokenTo(tempToken);
    setAmountFrom(amountTo);
    setAmountTo(amountFrom);
  };

  // Calculate the estimated output amount (mock implementation)
  const calculateOutputAmount = (inputAmount: string, tokenFromDecimals: number, tokenToDecimals: number) => {
    if (!inputAmount || parseFloat(inputAmount) === 0) return '0';
    
    // Mock price ratio (in a real app, this would come from the smart contract)
    const mockRatio = tokenFrom.symbol === 'ETH' && tokenTo.symbol === 'AIH' ? 1000 :
                      tokenFrom.symbol === 'AIH' && tokenTo.symbol === 'ETH' ? 0.001 :
                      tokenFrom.symbol === 'USDC' && tokenTo.symbol === 'AIH' ? 10 :
                      tokenFrom.symbol === 'AIH' && tokenTo.symbol === 'USDC' ? 0.1 : 1;
    
    return (parseFloat(inputAmount) * mockRatio).toString();
  };

  // Handle input change
  const handleFromAmountChange = (value: string) => {
    setAmountFrom(value);
    setAmountTo(calculateOutputAmount(value, tokenFrom.decimals, tokenTo.decimals));
  };

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    if (isSelectingToken === 'from') {
      if (token.address === tokenTo.address) {
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
    handleFromAmountChange(amountFrom);
  };

  // Determine if swap button should be enabled
  const isSwapDisabled = (): boolean => {
    return (
      !amountFrom || 
      parseFloat(amountFrom) === 0 || 
      !amountTo || 
      parseFloat(amountTo) === 0 ||
      !address
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* From Token */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">From</span>
          <span className="text-sm text-gray-600">
            Balance: {balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0'} {tokenFrom.symbol}
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
            <span className="mr-1">{tokenFrom.symbol}</span>
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
            <span className="mr-1">{tokenTo.symbol}</span>
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

      {/* Slippage Settings */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Slippage Tolerance</span>
          <span className="text-sm text-blue-600">{slippage}%</span>
        </div>
        <div className="flex space-x-2">
          {[0.1, 0.5, 1.0, 5.0].map((value) => (
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

      {/* Swap Button */}
      <button
        className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
          isSwapDisabled()
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        disabled={isSwapDisabled()}
      >
        {!address ? 'Connect Wallet' : isSwapDisabled() ? 'Enter an amount' : 'Swap'}
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
              {MOCK_TOKENS.map((token) => (
                <button
                  key={token.address}
                  className="flex items-center w-full p-3 hover:bg-gray-50 rounded-lg mb-2"
                  onClick={() => handleTokenSelect(token)}
                >
                  <div className="w-8 h-8 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
                    ) : (
                      <span className="text-sm font-bold">{token.symbol.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-sm text-gray-500">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 