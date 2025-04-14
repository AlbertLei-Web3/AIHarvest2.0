# AIHarvest 2.0

AIHarvest is a DeFi platform that enables token swapping, liquidity provision, and yield farming.

## Core Smart Contracts

We have implemented the three core smart contracts as specified in the project foundation document:

1. **AIHToken**: ERC20 token with minting, burning, and vesting capabilities
   - Community allocation for token distribution
   - Team tokens with vesting
   - Ecosystem fund with vesting
   - Farm allocation for rewards

2. **SimpleSwapRouter**: DEX router for token swapping and liquidity provision
   - Create token pairs
   - Add and remove liquidity
   - Swap tokens with fee mechanism
   - AMM based on constant product formula (x*y=k)

3. **SimpleFarm**: LP token staking with AIH token rewards
   - Multiple pools for different LP tokens
   - Flexible reward allocation
   - Time-based reward distribution
   - Emergency withdrawal option

## Architecture

The architecture consists of four main layers:

1. **Smart Contract Layer**: Contains AIH Token, SimpleSwapRouter, and SimpleFarm contracts
2. **Indexing Layer**: Uses The Graph for event indexing and GraphQL API for data queries
3. **Backend Layer**: Express API with Redis cache and MongoDB for user data
4. **Frontend Layer**: Next.js application with React components and Ethers.js for blockchain interaction

## Project Structure

```
aiharvest/
├── contracts/               # Smart contract code
│   ├── AIHToken.sol         # Token contract
│   ├── SimpleFarm.sol       # Staking/farming contract
│   ├── SimpleSwapRouter.sol # Swap router contract
│   └── interfaces/          # Interface definitions
│
├── frontend/                # Frontend application
│   ├── components/          # Reusable components
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Page components
│   ├── public/              # Static assets
│   ├── styles/              # Style files
│   └── utils/               # Utility functions
│
├── backend/                 # Backend service
│   ├── api/                 # API routes
│   ├── config/              # Configuration files
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
│
├── subgraph/                # The Graph indexing
│   ├── schema.graphql       # GraphQL schema
│   ├── subgraph.yaml        # Subgraph configuration
│   └── mappings/            # Event mappings
│
├── scripts/                 # Deployment & management scripts
├── deployments/             # Deployment artifacts
├── nginx/                   # Nginx configuration
└── test/                    # Test code
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB
- Redis
- Hardhat
- Docker & Docker Compose (for local development with containers)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/aiharvest.git
   cd aiharvest
   ```

2. Set up the development environment
   ```
   # On Linux/Mac
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   
   # On Windows
   scripts\setup-dev.bat
   ```

3. Start development servers
   ```
   # Start backend services with Docker Compose
   docker-compose up -d
   
   # Start frontend development server
   npm run dev:frontend
   
   # Start backend development server
   npm run dev:backend
   
   # Start Hardhat local node
   npx hardhat node
   ```

## Development Workflow

1. **Smart Contracts**: Edit Solidity files in the `contracts/` directory and run tests with `npm test`
2. **Frontend**: Modify React components and pages in the `frontend/` directory
3. **Backend**: Update API endpoints and services in the `backend/` directory
4. **Subgraph**: Update GraphQL schema and mappings in the `subgraph/` directory

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

1. **CI**: On push or PR to main/develop branches:
   - Contract linting and testing
   - Frontend build and lint
   - Backend testing

2. **CD**: On push to main branch:
   - Frontend deployment to Vercel
   - Backend container build and deployment
   - Contract deployment to testnet (if enabled)

### Manual Deployment

To deploy the application manually to production:

```
# Set required environment variables
export INFURA_API_KEY=your_infura_key
export PRIVATE_KEY=your_private_key
export DEPLOY_CONTRACTS=true  # Optional
export DEPLOY_SUBGRAPH=true   # Optional

# Run the deployment script
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh
```

## Features

1. **Connect Wallet**: Connect your Ethereum wallet to the platform
2. **Swap Tokens**: Exchange tokens with minimal slippage
3. **Add Liquidity**: Provide liquidity to earn trading fees
4. **Stake LP Tokens**: Stake your LP tokens to earn AIH rewards
5. **Harvest Rewards**: Claim your earned AIH tokens
6. **Withdraw Stake**: Unstake your LP tokens

## License

MIT 