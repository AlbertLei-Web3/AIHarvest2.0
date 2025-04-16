import React, { ReactNode } from 'react';
import { Header, LanguageProvider } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-dark-default via-dark-light to-dark-lighter text-white">
        <Header />
        <div className="flex-grow">{children}</div>
        <Footer />
      </div>
    </LanguageProvider>
  );
}; 