#!/bin/bash

# AIHarvest 2.0 Production Deployment Script

# Exit on any error
set -e

echo "Starting AIHarvest 2.0 production deployment..."

# Ensure Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker before continuing."
    exit 1
fi

# Ensure Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose before continuing."
    exit 1
fi

# Check for required environment variables
if [ -z "$INFURA_API_KEY" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "Missing required environment variables. Please set INFURA_API_KEY and PRIVATE_KEY."
    exit 1
fi

# Build and deploy backend
echo "Building and deploying backend..."
cd backend
docker build -t aiharvest/backend:latest .
docker push aiharvest/backend:latest
cd ..

# Build and deploy frontend
echo "Building and deploying frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy contracts if DEPLOY_CONTRACTS is set
if [ "$DEPLOY_CONTRACTS" = "true" ]; then
    echo "Deploying smart contracts..."
    cd contracts
    npm install
    npm run deploy
    cd ..
fi

# Deploy subgraph if DEPLOY_SUBGRAPH is set
if [ "$DEPLOY_SUBGRAPH" = "true" ]; then
    echo "Deploying subgraph..."
    cd subgraph
    npm install
    npm run deploy
    cd ..
fi

echo "Deployment complete!" 