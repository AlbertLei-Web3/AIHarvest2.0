import React, { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface Pool {
  id: string;
  token0: Token;
  token1: Token;
  reserve0: string;
  reserve1: string;
  userLpBalance: string;
  totalLpSupply: string;
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

// Mock pools for demonstration
const MOCK_POOLS: Pool[] = [
  {
    id: '0x1',
    token0: MOCK_TOKENS[0],
    token1: MOCK_TOKENS[1],
    reserve0: '10',
    reserve1: '10000',
    userLpBalance: '0.5',
    totalLpSupply: '100'
  },
  {
    id: '0x2',
    token0: MOCK_TOKENS[1],
    token1: MOCK_TOKENS[2],
    reserve0: '1000',
    reserve1: '100',
    userLpBalance: '0',
    totalLpSupply: '50'
  }
];

export const LiquidityInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pools' | 'add' | 'remove'>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [token0Amount, setToken0Amount] = useState<string>('');
  const [token1Amount, setToken1Amount] = useState<string>('');
  const [isSelectingToken, setIsSelectingToken] = useState<'token0' | 'token1' | null>(null);

  const { address } = useAccount();

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    if (isSelectingToken === 'token0') {
      if (token1 && token.address === token1.address) {
        // If selected token is the same as token1, swap them
        setToken0(token1);
        setToken1(token);
      } else {
        setToken0(token);
      }
    } else if (isSelectingToken === 'token1') {
      if (token0 && token.address === token0.address) {
        // If selected token is the same as token0, swap them
        setToken1(token0);
        setToken0(token);
      } else {
        setToken1(token);
      }
    }
    setIsSelectingToken(null);
  };

  // Calculate the estimated token1 amount (mock implementation)
  const calculateToken1Amount = (token0Amount: string) => {
    if (!token0 || !token1 || !token0Amount || parseFloat(token0Amount) === 0) return '';
    
    // Mock price ratio (in a real app, this would come from the smart contract)
    const mockRatio = token0.symbol === 'ETH' && token1.symbol === 'AIH' ? 1000 :
                      token0.symbol === 'AIH' && token1.symbol === 'ETH' ? 0.001 :
                      token0.symbol === 'USDC' && token1.symbol === 'AIH' ? 10 :
                      token0.symbol === 'AIH' && token1.symbol === 'USDC' ? 0.1 : 1;
    
    return (parseFloat(token0Amount) * mockRatio).toString();
  };

  // Handle token0 amount change
  const handleToken0AmountChange = (value: string) => {
    setToken0Amount(value);
    setToken1Amount(calculateToken1Amount(value));
  };

  // Determine if add liquidity button should be enabled
  const isAddLiquidityDisabled = (): boolean => {
    return (
      !token0 || 
      !token1 || 
      !token0Amount || 
      parseFloat(token0Amount) === 0 || 
      !token1Amount || 
      parseFloat(token1Amount) === 0 ||
      !address
    );
  };

  // Render pools list
  const renderPoolsList = () => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Liquidity Positions</h2>
        {MOCK_POOLS.filter(pool => parseFloat(pool.userLpBalance) > 0).length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="mb-4 text-gray-600">You don't have any liquidity positions yet.</p>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              onClick={() => setActiveTab('add')}
            >
              Add Liquidity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {MOCK_POOLS.filter(pool => parseFloat(pool.userLpBalance) > 0).map(pool => (
              <div key={pool.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center mb-3">
                  <div className="flex -space-x-2 mr-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center z-10">
                      {pool.token0.logoURI ? (
                        <img src={pool.token0.logoURI} alt={pool.token0.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-sm font-bold">{pool.token0.symbol.charAt(0)}</span>
                      )}
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {pool.token1.logoURI ? (
                        <img src={pool.token1.logoURI} alt={pool.token1.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-sm font-bold">{pool.token1.symbol.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{pool.token0.symbol} / {pool.token1.symbol}</h3>
                    <p className="text-sm text-gray-500">Your share: {((parseFloat(pool.userLpBalance) / parseFloat(pool.totalLpSupply)) * 100).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Pooled {pool.token0.symbol}:</p>
                    <p>{(parseFloat(pool.reserve0) * parseFloat(pool.userLpBalance) / parseFloat(pool.totalLpSupply)).toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pooled {pool.token1.symbol}:</p>
                    <p>{(parseFloat(pool.reserve1) * parseFloat(pool.userLpBalance) / parseFloat(pool.totalLpSupply)).toFixed(6)}</p>
                  </div>
                </div>
                <button 
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg"
                  onClick={() => {
                    setSelectedPool(pool);
                    setActiveTab('remove');
                  }}
                >
                  Manage
                </button>
              </div>
            ))}
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mt-4"
              onClick={() => setActiveTab('add')}
            >
              Add More Liquidity
            </button>
          </div>
        )}

        <h2 className="text-xl font-semibold mt-8 mb-4">All Liquidity Pools</h2>
        <div className="space-y-4">
          {MOCK_POOLS.map(pool => (
            <div key={pool.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center mb-3">
                <div className="flex -space-x-2 mr-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center z-10">
                    {pool.token0.logoURI ? (
                      <img src={pool.token0.logoURI} alt={pool.token0.symbol} className="w-6 h-6 rounded-full" />
                    ) : (
                      <span className="text-sm font-bold">{pool.token0.symbol.charAt(0)}</span>
                    )}
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {pool.token1.logoURI ? (
                      <img src={pool.token1.logoURI} alt={pool.token1.symbol} className="w-6 h-6 rounded-full" />
                    ) : (
                      <span className="text-sm font-bold">{pool.token1.symbol.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">{pool.token0.symbol} / {pool.token1.symbol}</h3>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <div>
                  <p className="text-gray-500">Total {pool.token0.symbol}:</p>
                  <p>{pool.reserve0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total {pool.token1.symbol}:</p>
                  <p>{pool.reserve1}</p>
                </div>
              </div>
              <button 
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg"
                onClick={() => {
                  setToken0(pool.token0);
                  setToken1(pool.token1);
                  setActiveTab('add');
                }}
              >
                Add Liquidity
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render add liquidity form
  const renderAddLiquidityForm = () => {
    return (
      <div>
        <div className="flex items-center mb-6">
          <button
            className="mr-2 text-blue-600"
            onClick={() => setActiveTab('pools')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">Add Liquidity</h2>
        </div>

        {/* Token0 Input */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">First Token</span>
          </div>
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <input
              type="number"
              className="w-full bg-transparent focus:outline-none text-lg"
              placeholder="0.0"
              value={token0Amount}
              onChange={(e) => handleToken0AmountChange(e.target.value)}
            />
            <button
              className="ml-2 flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg"
              onClick={() => setIsSelectingToken('token0')}
            >
              {token0 ? (
                <span className="mr-1">{token0.symbol}</span>
              ) : (
                <span className="mr-1">Select</span>
              )}
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

        {/* Plus Sign */}
        <div className="flex justify-center my-4">
          <div className="bg-gray-100 rounded-full p-2">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
        </div>

        {/* Token1 Input */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Second Token</span>
          </div>
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <input
              type="number"
              className="w-full bg-transparent focus:outline-none text-lg"
              placeholder="0.0"
              value={token1Amount}
              readOnly
            />
            <button
              className="ml-2 flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg"
              onClick={() => setIsSelectingToken('token1')}
            >
              {token1 ? (
                <span className="mr-1">{token1.symbol}</span>
              ) : (
                <span className="mr-1">Select</span>
              )}
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

        {/* Pool Information (only if both tokens are selected) */}
        {token0 && token1 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-2">Pool Information</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Pool Rate:</span>
              <span>1 {token0.symbol} = {calculateToken1Amount('1')} {token1.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Share of Pool:</span>
              <span>0%</span>
            </div>
          </div>
        )}

        {/* Add Liquidity Button */}
        <button
          className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
            isAddLiquidityDisabled()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={isAddLiquidityDisabled()}
        >
          {!address 
            ? 'Connect Wallet' 
            : !token0 || !token1 
              ? 'Select Tokens' 
              : isAddLiquidityDisabled() 
                ? 'Enter an amount' 
                : 'Add Liquidity'}
        </button>
      </div>
    );
  };

  // Render remove liquidity form
  const renderRemoveLiquidityForm = () => {
    if (!selectedPool) return null;

    return (
      <div>
        <div className="flex items-center mb-6">
          <button
            className="mr-2 text-blue-600"
            onClick={() => setActiveTab('pools')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">Remove Liquidity</h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <div className="flex -space-x-2 mr-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center z-10">
                {selectedPool.token0.logoURI ? (
                  <img src={selectedPool.token0.logoURI} alt={selectedPool.token0.symbol} className="w-6 h-6 rounded-full" />
                ) : (
                  <span className="text-sm font-bold">{selectedPool.token0.symbol.charAt(0)}</span>
                )}
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                {selectedPool.token1.logoURI ? (
                  <img src={selectedPool.token1.logoURI} alt={selectedPool.token1.symbol} className="w-6 h-6 rounded-full" />
                ) : (
                  <span className="text-sm font-bold">{selectedPool.token1.symbol.charAt(0)}</span>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium">{selectedPool.token0.symbol} / {selectedPool.token1.symbol}</h3>
              <p className="text-sm text-gray-500">Your LP Tokens: {selectedPool.userLpBalance}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-medium mb-2">Amount to Remove</h3>
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              defaultValue="50"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-2">You Will Receive</h3>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                {selectedPool.token0.logoURI ? (
                  <img src={selectedPool.token0.logoURI} alt={selectedPool.token0.symbol} className="w-4 h-4 rounded-full" />
                ) : (
                  <span className="text-xs font-bold">{selectedPool.token0.symbol.charAt(0)}</span>
                )}
              </div>
              <span>{selectedPool.token0.symbol}</span>
            </div>
            <span>
              {(parseFloat(selectedPool.reserve0) * parseFloat(selectedPool.userLpBalance) / parseFloat(selectedPool.totalLpSupply) * 0.5).toFixed(6)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                {selectedPool.token1.logoURI ? (
                  <img src={selectedPool.token1.logoURI} alt={selectedPool.token1.symbol} className="w-4 h-4 rounded-full" />
                ) : (
                  <span className="text-xs font-bold">{selectedPool.token1.symbol.charAt(0)}</span>
                )}
              </div>
              <span>{selectedPool.token1.symbol}</span>
            </div>
            <span>
              {(parseFloat(selectedPool.reserve1) * parseFloat(selectedPool.userLpBalance) / parseFloat(selectedPool.totalLpSupply) * 0.5).toFixed(6)}
            </span>
          </div>
        </div>

        <button
          className="w-full py-3 px-4 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700"
        >
          Remove Liquidity
        </button>
      </div>
    );
  };

  // Render token selection modal
  const renderTokenSelectionModal = () => {
    if (!isSelectingToken) return null;

    return (
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
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Navigation Tabs */}
      {activeTab === 'pools' && (
        <div className="mb-6">
          <div className="flex space-x-4 border-b">
            <button
              className={`pb-2 px-1 ${
                activeTab === 'pools'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('pools')}
            >
              Liquidity Pools
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'pools' && renderPoolsList()}
      {activeTab === 'add' && renderAddLiquidityForm()}
      {activeTab === 'remove' && renderRemoveLiquidityForm()}

      {/* Token Selection Modal */}
      {renderTokenSelectionModal()}
    </div>
  );
}; 