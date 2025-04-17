import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import WalletConnect from '../wallet/WalletConnect';
import { useAccount } from 'wagmi';

// Create language context
interface LanguageContextType {
  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;
  t: (key: string) => string;
}

const defaultContext: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
};

export const LanguageContext = createContext<LanguageContextType>(defaultContext);

export const useLanguage = () => useContext(LanguageContext);

// Translations
const translations = {
  en: {
    home: 'Home',
    swap: 'Swap',
    liquidity: 'Liquidity',
    farm: 'Farm',
    staking: 'Staking',
    dashboard: 'Dashboard',
  },
  zh: {
    home: '首页',
    swap: '交换',
    liquidity: '流动性',
    farm: '农场',
    staking: '质押',
    dashboard: '仪表盘',
  }
};

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  
  const t = (key: string): string => {
    const currentTranslations = translations[language];
    return currentTranslations[key as keyof typeof currentTranslations] || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const Header: React.FC = () => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Handle client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    return router.pathname === path;
  };

  // Define navigation links that will be shown conditionally after mounting
  const navigationLinks = [
    { href: '/swap', label: 'swap' },
    { href: '/liquidity', label: 'liquidity' },
    { href: '/farm', label: 'farm' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-dark-light shadow-lg backdrop-blur-sm border-b border-primary/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-2xl font-bold text-white mr-8"
            >
              <span className="bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">AIHarvest</span>
            </Link>

            {/* Navigation always rendered for server, but hidden with CSS until mounted */}
            <div className={`hidden md:block ${!mounted ? 'invisible' : 'visible'}`}>
              <nav className="flex space-x-8">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors relative ${
                      isActive(link.href)
                        ? 'text-secondary opacity-100'
                        : 'text-white hover:text-primary opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="relative py-2 block">
                      {t(link.label)}
                      {isActive(link.href) && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-secondary"></span>
                      )}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language toggle */}
            <div className="flex space-x-2 bg-dark-default rounded-lg p-1">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs rounded-md transition ${
                  language === 'en' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('zh')}
                className={`px-2 py-1 text-xs rounded-md transition ${
                  language === 'zh' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                中文
              </button>
            </div>
            
            <WalletConnect />
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu - rendered always but hidden with CSS until needed */}
        <div className={`md:hidden mt-4 pt-4 border-t border-white/10 ${(!mounted || !isMobileMenuOpen) ? 'hidden' : 'block'}`}>
          <nav className="flex flex-col space-y-3">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium py-2 px-4 rounded-lg ${
                  isActive(link.href)
                    ? 'bg-dark-default text-secondary'
                    : 'text-white hover:bg-dark-default'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}; 