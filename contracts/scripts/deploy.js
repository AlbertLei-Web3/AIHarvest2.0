const hre = require("hardhat");

async function main() {
  console.log("Deploying AIHarvest contracts...");

  // Get the contract factories 获取合约工厂
  const AIHToken = await hre.ethers.getContractFactory("AIHToken");
  const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
  const SimpleFarm = await hre.ethers.getContractFactory("SimpleFarm");
  
  // Get signers
  const signers = await hre.ethers.getSigners();
  console.log("Deploying with account:", signers[0].address);
  
  // Deploy token with team and ecosystem wallets 使用团队和生态系统钱包部署代币
  console.log("Deploying AIHToken...");
  // Use the first signer as fallback if there aren't enough signers
  const teamWallet = process.env.TEAM_WALLET || (signers.length > 1 ? signers[1].address : signers[0].address);
  const ecosystemWallet = process.env.ECOSYSTEM_WALLET || (signers.length > 2 ? signers[2].address : signers[0].address);
  
  console.log("Team wallet:", teamWallet);
  console.log("Ecosystem wallet:", ecosystemWallet);
  
  const aihToken = await AIHToken.deploy(teamWallet, ecosystemWallet);
  await aihToken.deployed();
  
  const tokenAddress = aihToken.address;
  console.log("AIHToken deployed to:", tokenAddress);
  
  // Deploy SimpleSwapRouter with AIHToken address 部署SimpleSwapRouter，使用AIHToken地址
  console.log("Deploying SimpleSwapRouter...");
  const simpleSwapRouter = await SimpleSwapRouter.deploy(tokenAddress);
  await simpleSwapRouter.deployed();
  
  const routerAddress = simpleSwapRouter.address;
  console.log("SimpleSwapRouter deployed to:", routerAddress);
  
  // Deploy SimpleFarm with AIHToken address 部署SimpleFarm，使用AIHToken地址
  console.log("Deploying SimpleFarm...");
  const simpleFarm = await SimpleFarm.deploy(tokenAddress);
  await simpleFarm.deployed();
  
  const farmAddress = simpleFarm.address;
  console.log("SimpleFarm deployed to:", farmAddress);
  
  // Set farm address in token contract 在代币合约中设置农场地址
  console.log("Setting farm address in token contract...");
  const setFarmTx = await aihToken.setFarmAddress(farmAddress);
  await setFarmTx.wait();
  console.log("Farm address set in token contract.");
  
  // Set fee collector in router contract 在路由器合约中设置费用收集器
  console.log("Setting fee collector in router contract...");
  const setFeeCollectorTx = await simpleSwapRouter.setFeeCollector(tokenAddress);
  await setFeeCollectorTx.wait();
  console.log("Fee collector set in router contract.");
  
  console.log("Deployment complete!");
  
  // Save deployment addresses 保存部署地址
  const fs = require("fs");
  const addresses = {
    AIHToken: tokenAddress,
    SimpleSwapRouter: routerAddress,
    SimpleFarm: farmAddress,
    network: hre.network.name,
    deploymentTime: new Date().toISOString()
  };
  
  // Update the path to save in the deployments directory 更新保存路径到部署目录
  const deploymentDir = "./deployments";
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  fs.writeFileSync(
    deploymentDir + "/" + hre.network.name + "_addresses.json",
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