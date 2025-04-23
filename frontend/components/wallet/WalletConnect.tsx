import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useDisconnect, useConnect } from 'wagmi';
import { useLanguage } from '../layout/Header';
import dynamic from 'next/dynamic';

interface WalletConnectProps {
  variant?: 'button' | 'full';
}

// Etherscan link component that will be dynamically imported with no SSR
const EtherscanLink = ({ address, children }: { address: string, children: React.ReactNode }) => (
  <a 
    href={`https://sepolia.etherscan.io/address/${address}`} 
    target="_blank" 
    rel="noopener noreferrer"
    className="block w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-dark-default text-gray-300 hover:text-white transition"
  >
    {children}
  </a>
);

// Dynamically import the component with SSR disabled
const DynamicEtherscanLink = dynamic(
  () => Promise.resolve(EtherscanLink),
  { ssr: false }
);

const WalletConnect: React.FC<WalletConnectProps> = ({ variant = 'button' }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });
  const { language, t } = useLanguage();

  // Wallet-specific translations
  const walletTranslations = {
    en: {
      connect: 'Connect Wallet',
      connecting: 'Connecting...',
      disconnect: 'Disconnect',
      balance: 'Balance',
      connected: 'Connected Wallet',
      copy: 'Copy Address',
      view: 'View on Explorer'
    },
    zh: {
      connect: '连接钱包',
      connecting: '连接中...',
      disconnect: '断开连接',
      balance: '余额',
      connected: '已连接钱包',
      copy: '复制地址',
      view: '在浏览器中查看'
    }
  };

  // Text function for wallet-specific translations
  const wt = (key: keyof typeof walletTranslations.en) => {
    return walletTranslations[language][key];
  };

  // Fix hydration mismatch by only rendering after client-side mount
  useEffect(() => {
    setMounted(true);
    
    // Check for wallet after mounting
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        console.log('🌐 Check wallet provider:', {
          hasEthereum: !!window.ethereum,
          hasMetaMask: !!window.ethereum?.isMetaMask,
          version: window.ethereum?.version || 'unknown'
        });
      }, 1000); // Slight delay to ensure extension has time to inject
    }
  }, []);

  const handleConnect = async () => {
    console.log('Connect button clicked');
    setIsConnecting(true);
    try {
      console.log('Available connectors:', connectors);
      
      // 检查MetaMask状态
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('MetaMask status:', {
          isMetaMask: window.ethereum.isMetaMask,
          isConnected: window.ethereum.isConnected?.() || false,
          selectedAddress: window.ethereum.selectedAddress
        });
      }
      
      // 尝试使用connector连接
      const connector = connectors.find(c => c.ready);
      if (connector) {
        console.log('Using connector:', connector.name);
        await connect({ connector });
      } 
      // 如果没有ready的connector但检测到MetaMask，尝试手动请求账户
      else if (typeof window !== 'undefined' && window.ethereum) {
        console.log('No ready connectors, but MetaMask detected. Trying direct connection...');
        try {
          // 尝试直接请求MetaMask连接
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            console.log('Successfully connected with address:', accounts[0]);
            // 成功后刷新页面应用连接状态
            window.location.reload();
            return;
          }
        } catch (metaMaskError) {
          console.error('Direct MetaMask connection failed:', metaMaskError);
          throw metaMaskError;
        }
      } 
      else {
        console.error('No ready connectors found and no MetaMask detected');
        alert('没有可用的钱包连接器。请确保安装并解锁MetaMask。');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('连接钱包失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show a success message in a real app
    });
  };

  // Show fallback UI until client-side renders complete
  if (!mounted) {
    if (variant === 'button') {
      return <button className="gradient-button min-h-[44px] min-w-[140px]">Loading...</button>;
    }
    return <div className="rounded-lg bg-gradient-to-br from-dark-default to-dark-lighter p-5 text-white shadow-lg border border-opacity-20 border-primary">Loading...</div>;
  }

  if (variant === 'button') {
    if (isConnected) {
      return (
        <div className="relative">
          <button
            className="bg-dark-default hover:bg-dark-light text-white px-4 py-2 rounded-lg flex items-center border border-primary/20 transition-all duration-300"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span>{formatAddress(address!)}</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-dark-light rounded-lg shadow-xl z-10 border border-primary/20 py-2">
              <div className="px-4 py-2 border-b border-primary/10">
                <p className="text-sm text-gray-400">{wt('connected')}</p>
                <p className="font-medium">{formatAddress(address!)}</p>
              </div>
              
              <div className="px-4 py-2 border-b border-primary/10">
                <p className="text-sm text-gray-400">{wt('balance')}</p>
                <p className="font-medium">{balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '...'}</p>
              </div>
              
              <div className="p-2">
                <button 
                  className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-dark-default text-gray-300 hover:text-white transition"
                  onClick={() => copyToClipboard(address!)}
                >
                  {wt('copy')}
                </button>
                
                <DynamicEtherscanLink address={address!}>
                  {wt('view')}
                </DynamicEtherscanLink>
                
                <button 
                  className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-dark-default text-red-400 hover:text-red-300 transition"
                  onClick={handleDisconnect}
                >
                  {wt('disconnect')}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        className="gradient-button min-h-[44px] min-w-[140px]"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {wt('connecting')}
          </div>
        ) : wt('connect')}
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-dark-light p-5 text-white shadow-lg border border-opacity-20 border-primary">
      {isConnected ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-medium text-lg gradient-text">{wt('connected')}</div>
            <button
              onClick={handleDisconnect}
              className="text-sm text-red-400 hover:text-red-300 transition-colors hover:bg-dark-default/50 px-3 py-1.5 rounded-md"
            >
              {wt('disconnect')}
            </button>
          </div>
          <div className="bg-dark-default rounded-md px-4 py-3 text-white border border-opacity-10 border-white">
            {formatAddress(address!)}
          </div>
          <div className="text-sm text-gray-300">
            {wt('balance')}: {balance ? (
              <span className="font-medium text-secondary">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </span>
            ) : '...'}
          </div>
        </div>
      ) : (
        <button
          className="w-full px-5 py-4 gradient-button min-h-[52px]"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {wt('connecting')}
            </div>
          ) : wt('connect')}
        </button>
      )}
    </div>
  );
};

export default WalletConnect; 