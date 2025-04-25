/**
 * ERC20 token related functions
 */
import { ethers } from 'ethers';
import { IERC20ABI } from './abis';
import { TokenInfo } from './types';
import { logger, getSigner, getProvider, ensureWalletConnection } from './helpers';
import { CONTRACTS } from './addresses';

// Caching system for token details to reduce RPC calls
const tokenCache: Record<string, TokenInfo> = {};

/**
 * Get token contract instance
 */
export const getTokenContract = (tokenAddress: string, signerOrProvider?: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  if (!ethers.utils.isAddress(tokenAddress)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }
  
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(tokenAddress, IERC20ABI, provider);
};

/**
 * Get token info with caching
 */
export const getTokenInfo = async (tokenAddress: string): Promise<TokenInfo> => {
  // Return from cache if available
  if (tokenCache[tokenAddress]) {
    return tokenCache[tokenAddress];
  }
  
  try {
    const tokenContract = getTokenContract(tokenAddress);
    
    // Use Promise.all to parallel fetch token data
    const [symbol, decimals, name] = await Promise.all([
      tokenContract.symbol().catch(() => "UNKNOWN"),
      tokenContract.decimals().catch(() => 18),
      tokenContract.name().catch(() => "Unknown Token")
    ]);
    
    const tokenInfo: TokenInfo = {
      address: tokenAddress,
      symbol,
      decimals,
      name
    };
    
    // Cache the result
    tokenCache[tokenAddress] = tokenInfo;
    return tokenInfo;
  } catch (error) {
    logger.error(`Failed to get token info for ${tokenAddress}:`, error);
    
    // Return fallback data
    return {
      address: tokenAddress,
      symbol: "UNKNOWN",
      decimals: 18,
      name: "Unknown Token"
    };
  }
};

/**
 * Get token balance with error handling and formatting
 */
export const getTokenBalance = async (tokenAddress: string, accountAddress: string): Promise<string> => {
  if (!tokenAddress || !accountAddress || !ethers.utils.isAddress(tokenAddress) || !ethers.utils.isAddress(accountAddress)) {
    logger.error('Invalid parameters for getTokenBalance:', { tokenAddress, accountAddress });
    return "0";
  }
  
  try {
    // Ensure wallet is connected
    await ensureWalletConnection();
    
    // Get token contract and info
    const provider = getProvider();
    const tokenInfo = await getTokenInfo(tokenAddress);
    const tokenContract = getTokenContract(tokenAddress, provider);
    
    const balance = await tokenContract.balanceOf(accountAddress);
    const formattedBalance = ethers.utils.formatUnits(balance, tokenInfo.decimals);
    
    logger.debug(`Retrieved balance for token ${tokenAddress} (${tokenInfo.symbol}): ${formattedBalance}`);
    return formattedBalance;
  } catch (error) {
    logger.error(`Error getting token balance for ${tokenAddress}:`, error);
    return "0";
  }
};

/**
 * Get token allowance with error handling
 */
export const getTokenAllowance = async (
  tokenAddress: string, 
  ownerAddress: string, 
  spenderAddress: string
): Promise<string> => {
  if (!ethers.utils.isAddress(tokenAddress) || !ethers.utils.isAddress(ownerAddress) || !ethers.utils.isAddress(spenderAddress)) {
    logger.error('Invalid addresses for getTokenAllowance', null);
    return "0";
  }
  
  try {
    const tokenInfo = await getTokenInfo(tokenAddress);
    const tokenContract = getTokenContract(tokenAddress);
      
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    return ethers.utils.formatUnits(allowance, tokenInfo.decimals);
  } catch (error) {
    logger.error(`Error getting allowance for token ${tokenAddress}:`, error);
    return "0";
  }
};

/**
 * Approve token spending with better error handling and gas optimization
 */
export const approveToken = async (
  tokenAddress: string, 
  amount: string, 
  spenderAddress: string = CONTRACTS.ROUTER_ADDRESS
): Promise<ethers.providers.TransactionResponse> => {
  logger.log(`Approving ${amount} of token ${tokenAddress} for spender ${spenderAddress}`);
  
  if (!ethers.utils.isAddress(tokenAddress) || !ethers.utils.isAddress(spenderAddress)) {
    throw new Error("Invalid token or spender address");
  }
  
  try {
    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    const tokenInfo = await getTokenInfo(tokenAddress);
    const tokenContract = getTokenContract(tokenAddress, signer);
    
    // Get current allowance to determine if we need to reset it
    const currentAllowance = await tokenContract.allowance(signerAddress, spenderAddress);
    logger.debug(`Current allowance: ${ethers.utils.formatUnits(currentAllowance, tokenInfo.decimals)}`);
    
    // Parse the amount to approve
    const amountToApprove = ethers.utils.parseUnits(amount, tokenInfo.decimals);
    
    // Some tokens require setting allowance to 0 first before changing it (to prevent potential exploits)
    if (currentAllowance.gt(0) && currentAllowance.lt(amountToApprove)) {
      logger.log("Resetting allowance to 0 first");
      const resetTx = await tokenContract.approve(spenderAddress, 0);
      await resetTx.wait(1); // Wait for 1 confirmation
    }
    
    // Submit the approval transaction
    return tokenContract.approve(spenderAddress, amountToApprove);
  } catch (error) {
    logger.error("Error in approveToken:", error);
    throw new Error(`Failed to approve token: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 