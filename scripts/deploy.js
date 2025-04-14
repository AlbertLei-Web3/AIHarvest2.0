const hre = require("hardhat");

async function main() {
  console.log("Deploying AIHarvest contracts...");

  // Get the contract factories
  const AIHToken = await hre.ethers.getContractFactory("AIHToken");
  
  // Deploy token with team and ecosystem wallets
  console.log("Deploying AIHToken...");
  const teamWallet = process.env.TEAM_WALLET || (await hre.ethers.getSigners())[1].address;
  const ecosystemWallet = process.env.ECOSYSTEM_WALLET || (await hre.ethers.getSigners())[2].address;
  
  const aihToken = await AIHToken.deploy(teamWallet, ecosystemWallet);
  await aihToken.waitForDeployment();
  
  const tokenAddress = await aihToken.getAddress();
  console.log("AIHToken deployed to:", tokenAddress);
  
  // Deploy SimpleSwapRouter
  console.log("Deploying SimpleSwapRouter...");
  const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
  const simpleSwapRouter = await SimpleSwapRouter.deploy(tokenAddress);
  await simpleSwapRouter.waitForDeployment();
  
  const routerAddress = await simpleSwapRouter.getAddress();
  console.log("SimpleSwapRouter deployed to:", routerAddress);
  
  // Deploy SimpleFarm
  console.log("Deploying SimpleFarm...");
  const SimpleFarm = await hre.ethers.getContractFactory("SimpleFarm");
  const simpleFarm = await SimpleFarm.deploy(tokenAddress);
  await simpleFarm.waitForDeployment();
  
  const farmAddress = await simpleFarm.getAddress();
  console.log("SimpleFarm deployed to:", farmAddress);
  
  // Set farm address in token contract
  console.log("Setting farm address in token contract...");
  await aihToken.setFarmAddress(farmAddress);
  console.log("Farm address set in token contract.");
  
  console.log("Deployment complete!");
  
  // Save deployment addresses
  const fs = require("fs");
  const addresses = {
    AIHToken: tokenAddress,
    SimpleSwapRouter: routerAddress,
    SimpleFarm: farmAddress,
    network: hre.network.name,
    deploymentTime: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "deployments/" + hre.network.name + "_addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Deployment addresses saved to: deployments/" + hre.network.name + "_addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 