# AIHarvest Frontend Architecture
# AIHarvest 前端架构

## Overview
## 概述

The AIHarvest frontend is built as a modern, responsive web application using Next.js and React. It follows the design specifications outlined in the top-level design document to provide a seamless user experience for DeFi operations including token swapping, liquidity provision, and yield farming.

AIHarvest前端是使用Next.js和React构建的现代响应式Web应用程序。它遵循顶层设计文档中概述的设计规范，为包括代币交换、流动性提供和收益耕作在内的DeFi操作提供无缝的用户体验。

## Technology Stack
## 技术栈

- **Framework**: Next.js 13+ with React
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Web3 Integration**: wagmi + ethers.js
- **State Management**: React Context API + Hooks
- **Data Fetching**: React Query

- **框架**: Next.js 13+ 与 React
- **语言**: TypeScript
- **样式**: TailwindCSS
- **Web3集成**: wagmi + ethers.js
- **状态管理**: React Context API + Hooks
- **数据获取**: React Query

## Directory Structure
## 目录结构

```
frontend/
├── components/         # Reusable UI components | 可复用UI组件
│   ├── dashboard/      # Dashboard and statistics components | 仪表板和统计组件
│   ├── farm/           # Farm and staking components | 农场和质押组件
│   ├── layout/         # Layout components (Header, Footer) | 布局组件（页眉、页脚）
│   ├── liquidity/      # Liquidity pool components | 流动性池组件
│   ├── swap/           # Token swap components | 代币交换组件
│   ├── ui/             # Core UI components (Banner, Cards) | 核心UI组件（横幅、卡片）
│   └── wallet/         # Wallet connection components | 钱包连接组件
├── hooks/              # Custom React hooks | 自定义React钩子
│   ├── useTokenBalance.ts     # Hook for fetching token balances | 获取代币余额的钩子
│   ├── useContractCall.ts     # Hook for reading from contracts | 从合约读取数据的钩子
│   └── useContractTransaction.ts  # Hook for writing to contracts | 向合约写入数据的钩子
├── pages/              # Application pages | 应用页面
│   ├── _app.tsx        # Main application wrapper | 主应用包装器
│   ├── index.tsx       # Home page | 首页
│   ├── swap.tsx        # Token swap page | 代币交换页面
│   ├── liquidity.tsx   # Liquidity provision page | 流动性提供页面
│   └── farm.tsx        # Yield farming page | 收益耕作页面
├── public/             # Static assets | 静态资源
├── styles/             # Global styles | 全局样式
└── utils/              # Utility functions | 工具函数
```

## Key Components
## 关键组件

### Layout Components
### 布局组件

- **Layout**: Wraps all pages with Header and Footer
- **Header**: Navigation bar with links and wallet connection
- **Footer**: Links to resources, products, and community

- **Layout**: 用页眉和页脚包装所有页面
- **Header**: 带有链接和钱包连接的导航栏
- **Footer**: 资源、产品和社区链接

### Feature Components
### 功能组件

- **SwapInterface**: Interface for selecting tokens and executing swaps
- **LiquidityInterface**: Interface for managing liquidity positions
- **FarmInterface**: Interface for staking LP tokens and harvesting rewards
- **WalletConnect**: Component for connecting and managing wallet state
- **DashboardStats**: Statistics display for the platform overview

- **SwapInterface**: 用于选择代币和执行交换的界面
- **LiquidityInterface**: 用于管理流动性头寸的界面
- **FarmInterface**: 用于质押LP代币和收获奖励的界面
- **WalletConnect**: 用于连接和管理钱包状态的组件
- **DashboardStats**: 平台概览的统计数据显示

### Page Structure
### 页面结构

The application follows a standard layout with consistent Header and Footer components across all pages. The main content area changes based on the current route.

应用程序遵循标准布局，在所有页面上使用一致的Header和Footer组件。主要内容区域根据当前路由进行变化。

### User Authentication
### 用户认证

Wallet connection is handled through the `WalletConnect` component, which supports multiple wallet providers (MetaMask, WalletConnect, Coinbase Wallet).

钱包连接通过`WalletConnect`组件处理，该组件支持多种钱包提供商（MetaMask、WalletConnect、Coinbase Wallet）。

### Core Application Flow
### 核心应用流程

Following the user paths defined in the top-level design document:

遵循顶层设计文档中定义的用户路径：

1. **Connect Wallet**
   - Users connect their Web3 wallet through the `WalletConnect` component
   - Account information and balances are displayed upon successful connection

1. **连接钱包**
   - 用户通过`WalletConnect`组件连接他们的Web3钱包
   - 成功连接后显示账户信息和余额

2. **Token Swapping**
   - The Swap page provides an interface for exchanging tokens
   - Users can select token pairs, enter amounts, and execute swaps
   - Price impact and slippage settings can be adjusted

2. **代币交换**
   - Swap页面提供了交换代币的界面
   - 用户可以选择代币对，输入金额，并执行交换
   - 可以调整价格影响和滑点设置

3. **Liquidity Provision**
   - The Liquidity page allows users to add liquidity to token pairs
   - Users receive LP tokens representing their share of the pool
   - LP token balances and pool information is displayed

3. **流动性提供**
   - Liquidity页面允许用户向代币对添加流动性
   - 用户接收代表其池份额的LP代币
   - 显示LP代币余额和池信息

4. **Yield Farming**
   - The Farm page allows users to stake LP tokens in farm pools
   - Users can view pending rewards and harvest them
   - APR information is displayed for each pool

4. **收益耕作**
   - Farm页面允许用户在农场池中质押LP代币
   - 用户可以查看待领取的奖励并收获它们
   - 为每个池显示APR信息

## Data Flow
## 数据流

The frontend interacts with blockchain and backend services through:

前端通过以下方式与区块链和后端服务交互：

1. **Direct Contract Calls**
   - Read operations use the `useContractCall` hook
   - Write operations use the `useContractTransaction` hook

1. **直接合约调用**
   - 读取操作使用`useContractCall`钩子
   - 写入操作使用`useContractTransaction`钩子

2. **Indexed Data via GraphQL**
   - Pool statistics, pricing data, and historical information are retrieved from The Graph
   - React Query is used for caching and optimistic updates

2. **通过GraphQL索引数据**
   - 从The Graph检索池统计信息、定价数据和历史信息
   - 使用React Query进行缓存和乐观更新

3. **Backend API Integration**
   - User preferences and non-blockchain data are stored in the backend
   - Authentication for extended features is handled through the backend

3. **后端API集成**
   - 用户偏好和非区块链数据存储在后端
   - 扩展功能的认证通过后端处理

## Responsive Design
## 响应式设计

The UI is fully responsive, adapting to various screen sizes:
- Mobile-first approach with appropriate breakpoints
- Simplified interface on smaller screens
- Full-featured dashboard on larger screens

UI完全响应式，适应各种屏幕尺寸：
- 移动优先方法，具有适当的断点
- 在较小屏幕上简化界面
- 在较大屏幕上提供全功能仪表板

## Performance Optimizations
## 性能优化

- Static generation for non-dynamic pages
- Component lazy loading for optimal chunk splitting
- Memoization of expensive calculations
- Optimistic UI updates for better perceived performance

- 为非动态页面生成静态页面
- 组件懒加载以实现最佳代码分块
- 昂贵计算的记忆化
- 乐观的UI更新以提高感知性能

## Security Considerations
## 安全考虑

- No private keys or sensitive information stored in frontend code
- Proper validation of all user inputs
- Security warnings for high-risk operations
- Transaction confirmation modals with detailed information

- 前端代码中不存储私钥或敏感信息
- 对所有用户输入进行适当验证
- 对高风险操作提供安全警告
- 具有详细信息的交易确认模态框

---

## Development Guidelines
## 开发指南

### Adding New Components
### 添加新组件

When adding new components:
1. Follow the existing directory structure
2. Use TypeScript interfaces for prop typing
3. Break complex components into smaller, reusable parts
4. Include appropriate test files

添加新组件时：
1. 遵循现有的目录结构
2. 使用TypeScript接口进行prop类型定义
3. 将复杂组件分解为更小的、可重用的部分
4. 包含适当的测试文件

### State Management
### 状态管理

- Use React Context for global state when necessary
- Prefer local component state for UI-specific states
- Use custom hooks to encapsulate complex logic

- 在必要时使用React Context进行全局状态管理
- 对UI特定状态优先使用本地组件状态
- 使用自定义钩子封装复杂逻辑

### Working with Contracts
### 与合约交互

- All contract ABIs should be stored in a central location
- Use typed hooks for contract interactions
- Include proper error handling for failed transactions
- Display loading states during pending transactions

- 所有合约ABI应存储在一个中央位置
- 使用类型化钩子进行合约交互
- 对失败的交易包含适当的错误处理
- 在待处理交易期间显示加载状态 