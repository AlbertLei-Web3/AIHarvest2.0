# AIHarvest Frontend Architecture

## Overview

The AIHarvest frontend is built as a modern, responsive web application using Next.js and React. It follows the design specifications outlined in the top-level design document to provide a seamless user experience for DeFi operations including token swapping, liquidity provision, and yield farming.

## Technology Stack

- **Framework**: Next.js 13+ with React
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Web3 Integration**: wagmi + ethers.js
- **State Management**: React Context API + Hooks
- **Data Fetching**: React Query

## Directory Structure

```
frontend/
├── components/         # Reusable UI components
│   ├── dashboard/      # Dashboard and statistics components
│   ├── farm/           # Farm and staking components
│   ├── layout/         # Layout components (Header, Footer)
│   ├── liquidity/      # Liquidity pool components
│   ├── swap/           # Token swap components
│   ├── ui/             # Core UI components (Banner, Cards)
│   └── wallet/         # Wallet connection components
├── hooks/              # Custom React hooks
│   ├── useTokenBalance.ts     # Hook for fetching token balances
│   ├── useContractCall.ts     # Hook for reading from contracts
│   └── useContractTransaction.ts  # Hook for writing to contracts
├── pages/              # Application pages
│   ├── _app.tsx        # Main application wrapper
│   ├── index.tsx       # Home page
│   ├── swap.tsx        # Token swap page
│   ├── liquidity.tsx   # Liquidity provision page
│   └── farm.tsx        # Yield farming page
├── public/             # Static assets
├── styles/             # Global styles
└── utils/              # Utility functions
```

## Key Components

### Layout Components

- **Layout**: Wraps all pages with Header and Footer
- **Header**: Navigation bar with links and wallet connection
- **Footer**: Links to resources, products, and community

### Feature Components

- **SwapInterface**: Interface for selecting tokens and executing swaps
- **LiquidityInterface**: Interface for managing liquidity positions
- **FarmInterface**: Interface for staking LP tokens and harvesting rewards
- **WalletConnect**: Component for connecting and managing wallet state
- **DashboardStats**: Statistics display for the platform overview

### Page Structure

The application follows a standard layout with consistent Header and Footer components across all pages. The main content area changes based on the current route.

### User Authentication

Wallet connection is handled through the `WalletConnect` component, which supports multiple wallet providers (MetaMask, WalletConnect, Coinbase Wallet).

### Core Application Flow

Following the user paths defined in the top-level design document:

1. **Connect Wallet**
   - Users connect their Web3 wallet through the `WalletConnect` component
   - Account information and balances are displayed upon successful connection

2. **Token Swapping**
   - The Swap page provides an interface for exchanging tokens
   - Users can select token pairs, enter amounts, and execute swaps
   - Price impact and slippage settings can be adjusted

3. **Liquidity Provision**
   - The Liquidity page allows users to add liquidity to token pairs
   - Users receive LP tokens representing their share of the pool
   - LP token balances and pool information is displayed

4. **Yield Farming**
   - The Farm page allows users to stake LP tokens in farm pools
   - Users can view pending rewards and harvest them
   - APR information is displayed for each pool

## Data Flow

The frontend interacts with blockchain and backend services through:

1. **Direct Contract Calls**
   - Read operations use the `useContractCall` hook
   - Write operations use the `useContractTransaction` hook

2. **Indexed Data via GraphQL**
   - Pool statistics, pricing data, and historical information are retrieved from The Graph
   - React Query is used for caching and optimistic updates

3. **Backend API Integration**
   - User preferences and non-blockchain data are stored in the backend
   - Authentication for extended features is handled through the backend

## Responsive Design

The UI is fully responsive, adapting to various screen sizes:
- Mobile-first approach with appropriate breakpoints
- Simplified interface on smaller screens
- Full-featured dashboard on larger screens

## Performance Optimizations

- Static generation for non-dynamic pages
- Component lazy loading for optimal chunk splitting
- Memoization of expensive calculations
- Optimistic UI updates for better perceived performance

## Security Considerations

- No private keys or sensitive information stored in frontend code
- Proper validation of all user inputs
- Security warnings for high-risk operations
- Transaction confirmation modals with detailed information

---

## Development Guidelines

### Adding New Components

When adding new components:
1. Follow the existing directory structure
2. Use TypeScript interfaces for prop typing
3. Break complex components into smaller, reusable parts
4. Include appropriate test files

### State Management

- Use React Context for global state when necessary
- Prefer local component state for UI-specific states
- Use custom hooks to encapsulate complex logic

### Working with Contracts

- All contract ABIs should be stored in a central location
- Use typed hooks for contract interactions
- Include proper error handling for failed transactions
- Display loading states during pending transactions 