import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { WalletConnect } from '../wallet/WalletConnect';
import { useAccount } from 'wagmi';

export const Header: React.FC = () => {
  const router = useRouter();
  const { isConnected } = useAccount();

  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    return router.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              AIHarvest
            </Link>

            {isConnected && (
              <nav className="hidden md:flex space-x-8 ml-12">
                <Link
                  href="/swap"
                  className={`text-sm font-medium ${
                    isActive('/swap')
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Swap
                </Link>
                <Link
                  href="/liquidity"
                  className={`text-sm font-medium ${
                    isActive('/liquidity')
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Liquidity
                </Link>
                <Link
                  href="/farm"
                  className={`text-sm font-medium ${
                    isActive('/farm')
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Farm
                </Link>
              </nav>
            )}
          </div>

          <div>
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}; 