/**
 * Deployment script for AIHarvest contracts
 * AIHarvest合约部署脚本
 * 
 * This script deploys the core contracts (AIHToken, SimpleSwapRouter, SimpleFarm)
 * and sets up the initial configuration between them.
 * 该脚本部署核心合约（AIHToken、SimpleSwapRouter、SimpleFarm）
 * 并设置它们之间的初始配置。
 */

const hre = require("hardhat");

/**
 * Main deployment function
 * 主要部署函数
 */
async function main() {
  console.log("Deploying AIHarvest contracts to", hre.network.name, "network...");

  try {
    // Get the contract factories
    // 获取合约工厂
    const AIHToken = await hre.ethers.getContractFactory("AIHToken");
    const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
    const SimpleFarm = await hre.ethers.getContractFactory("SimpleFarm");
    // Add any new contract factories here
    // 在此处添加任何新的合约工厂
    // const NewContract = await hre.ethers.getContractFactory("NewContract");
    
    // Get signers
    // 获取签名者
    const signers = await hre.ethers.getSigners();
    console.log("Deploying with account:", signers[0].address);
    
    // Get gas price for optimized deployment - Sepolia may need higher values
    // 获取优化部署的gas价格 - Sepolia可能需要更高的值
    const gasPrice = await hre.ethers.provider.getGasPrice();
    // Use slightly higher gas price for Sepolia to ensure faster confirmation
    // 为Sepolia使用稍高的gas价格以确保更快的确认
    const optimizedGasPrice = hre.network.name === "sepolia" 
      ? gasPrice.mul(120).div(100)  // 20% higher for Sepolia
      : gasPrice.mul(110).div(100); // 10% higher for other networks
    
    console.log("Current gas price:", hre.ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Using gas price:", hre.ethers.utils.formatUnits(optimizedGasPrice, "gwei"), "gwei");
    
    // Prepare wallet addresses with validation
    // 使用验证准备钱包地址
    const teamWallet = getValidAddress(process.env.TEAM_WALLET, signers.length > 1 ? signers[1].address : signers[0].address);
    const ecosystemWallet = getValidAddress(process.env.ECOSYSTEM_WALLET, signers.length > 2 ? signers[2].address : signers[0].address);
    
    console.log("Team wallet:", teamWallet);
    console.log("Ecosystem wallet:", ecosystemWallet);
    
    // Deploy token with team and ecosystem wallets
    // 使用团队和生态系统钱包部署代币
    console.log("Deploying AIHToken...");
    const aihToken = await AIHToken.deploy(
      teamWallet, 
      ecosystemWallet,
      { gasPrice: optimizedGasPrice }
    );
    console.log("AIHToken deployment transaction hash:", aihToken.deployTransaction.hash);
    await aihToken.deployed();
    
    const tokenAddress = aihToken.address;
    console.log("AIHToken deployed to:", tokenAddress);
    
    // Deploy SimpleSwapRouter with AIHToken address
    // 使用AIHToken地址部署SimpleSwapRouter
    console.log("Deploying SimpleSwapRouter...");
    const simpleSwapRouter = await SimpleSwapRouter.deploy(
      tokenAddress,
      { gasPrice: optimizedGasPrice }
    );
    console.log("SimpleSwapRouter deployment transaction hash:", simpleSwapRouter.deployTransaction.hash);
    await simpleSwapRouter.deployed();
    
    const routerAddress = simpleSwapRouter.address;
    console.log("SimpleSwapRouter deployed to:", routerAddress);
    
    // Deploy SimpleFarm with AIHToken address
    // 使用AIHToken地址部署SimpleFarm
    console.log("Deploying SimpleFarm...");
    const simpleFarm = await SimpleFarm.deploy(
      tokenAddress,
      { gasPrice: optimizedGasPrice }
    );
    console.log("SimpleFarm deployment transaction hash:", simpleFarm.deployTransaction.hash);
    await simpleFarm.deployed();
    
    const farmAddress = simpleFarm.address;
    console.log("SimpleFarm deployed to:", farmAddress);
    
    // Deploy any new contracts here
    // console.log("Deploying NewContract...");
    // const newContract = await NewContract.deploy(
    //   // Constructor parameters
    //   { gasPrice: optimizedGasPrice }
    // );
    // await newContract.deployed();
    // const newContractAddress = newContract.address;
    // console.log("NewContract deployed to:", newContractAddress);
    
    // Set farm address in token contract
    console.log("Setting farm address in token contract...");
    const setFarmTx = await aihToken.setFarmAddress(
      farmAddress,
      { gasPrice: optimizedGasPrice }
    );
    console.log("Transaction hash:", setFarmTx.hash);
    const setFarmReceipt = await setFarmTx.wait();
    console.log("Farm address set in token contract. Gas used:", setFarmReceipt.gasUsed.toString());
    
    // Set fee collector in router contract
    console.log("Setting fee collector in router contract...");
    const setFeeCollectorTx = await simpleSwapRouter.setFeeCollector(
      process.env.FEE_COLLECTOR || signers[0].address,
      { gasPrice: optimizedGasPrice }
    );
    console.log("Transaction hash:", setFeeCollectorTx.hash);
    const setFeeCollectorReceipt = await setFeeCollectorTx.wait();
    console.log("Fee collector set in router contract. Gas used:", setFeeCollectorReceipt.gasUsed.toString());
    
    // Authorize farm in router for LP token operations
    console.log("Authorizing farm in router contract...");
    const authorizeFarmTx = await simpleSwapRouter.setFarmAuthorization(
      farmAddress, 
      true,
      { gasPrice: optimizedGasPrice }
    );
    console.log("Transaction hash:", authorizeFarmTx.hash);
    const authorizeFarmReceipt = await authorizeFarmTx.wait();
    console.log("Farm authorized in router contract. Gas used:", authorizeFarmReceipt.gasUsed.toString());
    
    // Configure initial farm reward rate if needed
    const initialRewardRate = process.env.INITIAL_REWARD_RATE || "100000000000000000"; // 0.1 AIH per second
    if (process.env.CONFIGURE_FARM_REWARDS === "true") {
      console.log("Setting initial farm reward rate...");
      const setRewardRateTx = await simpleFarm.setAIHPerSecond(
        initialRewardRate,
        { gasPrice: optimizedGasPrice }
      );
      console.log("Transaction hash:", setRewardRateTx.hash);
      const setRewardRateReceipt = await setRewardRateTx.wait();
      console.log("Farm reward rate set. Gas used:", setRewardRateReceipt.gasUsed.toString());
    }
    
    // Add any custom initialization for new contracts here
    
    console.log("Deployment complete!");
    
    // Save deployment addresses
    const fs = require("fs");
    const addresses = {
      AIHToken: tokenAddress,
      SimpleSwapRouter: routerAddress,
      SimpleFarm: farmAddress,
      // Add new contract addresses here
      // NewContract: newContractAddress,
      network: hre.network.name,
      chainId: (await hre.ethers.provider.getNetwork()).chainId,
      deploymentTime: new Date().toISOString(),
      deployer: signers[0].address
    };
    
    // Update the path to save in the deployments directory
    const deploymentDir = "./deployments";
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    const fileName = `${hre.network.name}_addresses_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(
      `${deploymentDir}/${fileName}`,
      JSON.stringify(addresses, null, 2)
    );
    console.log(`Deployment addresses saved to: deployments/${fileName}`);
    
    // Create a latest.json file with the most recent deployment info
    fs.writeFileSync(
      `${deploymentDir}/${hre.network.name}_latest.json`,
      JSON.stringify(addresses, null, 2)
    );
    console.log(`Latest deployment info saved to: deployments/${hre.network.name}_latest.json`);
    
    // Verify contracts if on a supported network (Sepolia is supported)
    if (process.env.VERIFY_CONTRACTS === "true" && 
        (hre.network.name !== "hardhat" && hre.network.name !== "localhost")) {
      console.log("Waiting for block confirmations before verification...");
      // For Sepolia, wait longer for confirmations as it might be slower
      const waitTime = hre.network.name === "sepolia" ? 60000 : 30000; // 60 sec for Sepolia, 30 sec for others
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      try {
        console.log("Verifying AIHToken...");
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [teamWallet, ecosystemWallet],
        });
        console.log("AIHToken verified!");
        
        console.log("Verifying SimpleSwapRouter...");
        await hre.run("verify:verify", {
          address: routerAddress,
          constructorArguments: [tokenAddress],
        });
        console.log("SimpleSwapRouter verified!");
        
        console.log("Verifying SimpleFarm...");
        await hre.run("verify:verify", {
          address: farmAddress,
          constructorArguments: [tokenAddress],
        });
        console.log("SimpleFarm verified!");
        
        // Add verification for new contracts here
        // console.log("Verifying NewContract...");
        // await hre.run("verify:verify", {
        //   address: newContractAddress,
        //   constructorArguments: [/* constructor args */],
        // });
        // console.log("NewContract verified!");
        
      } catch (error) {
        console.error("Error during contract verification:", error);
      }
    }
    
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

// Helper function to validate addresses
function getValidAddress(address, fallback) {
  if (!address) return fallback;
  
  try {
    // Check if it's a valid Ethereum address
    const isValid = hre.ethers.utils.isAddress(address);
    if (!isValid) {
      console.warn(`Invalid address provided: ${address}, using fallback: ${fallback}`);
      return fallback;
    }
    return address;
  } catch (error) {
    console.warn(`Error validating address: ${error.message}, using fallback: ${fallback}`);
    return fallback;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 