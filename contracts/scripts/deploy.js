const hre = require("hardhat");

async function main() {
  console.log("Deploying AIHarvest contracts...");

  try {
    // Get the contract factories
    const AIHToken = await hre.ethers.getContractFactory("AIHToken");
    const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
    const SimpleFarm = await hre.ethers.getContractFactory("SimpleFarm");
    
    // Get signers
    const signers = await hre.ethers.getSigners();
    console.log("Deploying with account:", signers[0].address);
    
    // Get gas price for optimized deployment
    const gasPrice = await hre.ethers.provider.getGasPrice();
    // Use slightly higher gas price to ensure faster confirmation
    const optimizedGasPrice = gasPrice.mul(110).div(100); // 10% higher than current
    console.log("Current gas price:", hre.ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Using gas price:", hre.ethers.utils.formatUnits(optimizedGasPrice, "gwei"), "gwei");
    
    // Prepare wallet addresses with validation
    const teamWallet = getValidAddress(process.env.TEAM_WALLET, signers.length > 1 ? signers[1].address : signers[0].address);
    const ecosystemWallet = getValidAddress(process.env.ECOSYSTEM_WALLET, signers.length > 2 ? signers[2].address : signers[0].address);
    
    console.log("Team wallet:", teamWallet);
    console.log("Ecosystem wallet:", ecosystemWallet);
    
    // Deploy token with team and ecosystem wallets
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
    console.log("Deploying SimpleFarm...");
    const simpleFarm = await SimpleFarm.deploy(
      tokenAddress,
      { gasPrice: optimizedGasPrice }
    );
    console.log("SimpleFarm deployment transaction hash:", simpleFarm.deployTransaction.hash);
    await simpleFarm.deployed();
    
    const farmAddress = simpleFarm.address;
    console.log("SimpleFarm deployed to:", farmAddress);
    
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
    
    console.log("Deployment complete!");
    
    // Save deployment addresses
    const fs = require("fs");
    const addresses = {
      AIHToken: tokenAddress,
      SimpleSwapRouter: routerAddress,
      SimpleFarm: farmAddress,
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
    
    // Verify contracts if on a supported network (optional, enable as needed)
    if (process.env.VERIFY_CONTRACTS === "true" && 
        (hre.network.name !== "hardhat" && hre.network.name !== "localhost")) {
      console.log("Waiting for block confirmations before verification...");
      // Wait for 5 block confirmations to ensure contracts are properly deployed
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 sec delay
      
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