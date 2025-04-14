#!/bin/bash

# AIHarvest 2.0 Development Environment Setup Script

echo "Setting up AIHarvest 2.0 development environment..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ before continuing."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18+ is required. Current version: $NODE_VERSION"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm before continuing."
    exit 1
fi

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update the .env file with your configuration values."
fi

# Install dependencies
echo "Installing project dependencies..."
npm install

# Setup Hardhat local network
echo "Setting up Hardhat development blockchain..."
npx hardhat node &
HARDHAT_PID=$!
sleep 5

# Compile contracts
echo "Compiling smart contracts..."
npm run compile

# Kill Hardhat after compilation
kill $HARDHAT_PID

echo "Development environment setup complete!"
echo "To start development servers:"
echo "  - Frontend: npm run dev:frontend"
echo "  - Backend:  npm run dev:backend"
echo "  - Hardhat:  npx hardhat node" 