#!/usr/bin/env node

/**
 * Script to update contract addresses in the frontend
 * 
 * Usage: node update-addresses.js <path-to-deployment-json>
 * Example: node update-addresses.js ../contracts/deployments/sepolia_addresses_2025-04-25T03-49-25.534Z.json
 */

const fs = require('fs');
const path = require('path');

// Get deployment file path from arguments
const deploymentPath = process.argv[2];

if (!deploymentPath) {
  console.error('Please provide a path to the deployment JSON file');
  console.error('Usage: node update-addresses.js <path-to-deployment-json>');
  process.exit(1);
}

try {
  // Read deployment file
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  // Paths to update
  const addressesPath = path.resolve(__dirname, '../utils/contracts/addresses.ts');
  const networkPath = path.resolve(__dirname, '../utils/contracts/network.ts');
  
  // Read current files
  const addressesContent = fs.readFileSync(addressesPath, 'utf8');
  let networkContent = '';
  
  try {
    networkContent = fs.readFileSync(networkPath, 'utf8');
  } catch (error) {
    // Network file might not exist yet
    networkContent = `/**
 * Network configuration for the DApp
 */

// Network information from the latest deployment
export const NETWORK = {
  NAME: "",
  CHAIN_ID: 0,
  DEPLOYMENT_TIME: "",
  DEPLOYER: ""
};

// Chain IDs for reference
export const CHAIN_IDS = {
  MAINNET: 1,
  GOERLI: 5,
  SEPOLIA: 11155111,
  LOCALHOST: 31337
};

// RPC URLs - using public endpoints, consider using a service like Infura or Alchemy for production
export const RPC_URLS = {
  [CHAIN_IDS.SEPOLIA]: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  [CHAIN_IDS.GOERLI]: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  [CHAIN_IDS.MAINNET]: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
  [CHAIN_IDS.LOCALHOST]: "http://localhost:8545"
};

// Block explorers
export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.SEPOLIA]: "https://sepolia.etherscan.io",
  [CHAIN_IDS.GOERLI]: "https://goerli.etherscan.io",
  [CHAIN_IDS.MAINNET]: "https://etherscan.io",
  [CHAIN_IDS.LOCALHOST]: ""
};

/**
 * Check if the connected chain ID is supported
 */
export const isSupportedChain = (chainId: number): boolean => {
  return chainId === CHAIN_IDS.SEPOLIA;
};

/**
 * Get chain name based on ID
 */
export const getChainName = (chainId: number): string => {
  switch (chainId) {
    case CHAIN_IDS.MAINNET:
      return "Ethereum Mainnet";
    case CHAIN_IDS.GOERLI:
      return "Goerli Testnet";
    case CHAIN_IDS.SEPOLIA:
      return "Sepolia Testnet";
    case CHAIN_IDS.LOCALHOST:
      return "Localhost";
    default:
      return "Unknown Network";
  }
};`;
  }
  
  // Update addresses
  const updatedAddressesContent = addressesContent
    .replace(
      /ROUTER_ADDRESS: "[^"]+"/,
      `ROUTER_ADDRESS: "${deploymentData.SimpleSwapRouter}"`
    )
    .replace(
      /FARM_ADDRESS: "[^"]+"/,
      `FARM_ADDRESS: "${deploymentData.SimpleFarm}"`
    )
    .replace(
      /AIH_TOKEN: "[^"]+"/,
      `AIH_TOKEN: "${deploymentData.AIHToken}"`
    );
  
  // Update network info
  const updatedNetworkContent = networkContent
    .replace(
      /NAME: "[^"]*"/,
      `NAME: "${deploymentData.network}"`
    )
    .replace(
      /CHAIN_ID: [0-9]+/,
      `CHAIN_ID: ${deploymentData.chainId}`
    )
    .replace(
      /DEPLOYMENT_TIME: "[^"]*"/,
      `DEPLOYMENT_TIME: "${deploymentData.deploymentTime}"`
    )
    .replace(
      /DEPLOYER: "[^"]*"/,
      `DEPLOYER: "${deploymentData.deployer}"`
    );
  
  // Write updated files
  fs.writeFileSync(addressesPath, updatedAddressesContent);
  fs.writeFileSync(networkPath, updatedNetworkContent);
  
  console.log(`✅ Updated contract addresses in: ${addressesPath}`);
  console.log(`✅ Updated network information in: ${networkPath}`);
  console.log('\nNew contract addresses:');
  console.log(`- AIH Token: ${deploymentData.AIHToken}`);
  console.log(`- Router: ${deploymentData.SimpleSwapRouter}`);
  console.log(`- Farm: ${deploymentData.SimpleFarm}`);
  console.log(`- Network: ${deploymentData.network}`);
  console.log(`- Chain ID: ${deploymentData.chainId}`);
  
} catch (error) {
  console.error('Error updating addresses:', error);
  process.exit(1);
} 