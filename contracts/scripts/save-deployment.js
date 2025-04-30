// scripts/save-deployment.js
// 保存部署信息的脚本 - 可以在部署后手动运行
const fs = require('fs');
const path = require('path');

// 要保存的合约地址
const contractAddresses = {
  AIHToken: "0x106AF5A1e76Bb24bD3460cf4d80e13A76bb5c49a",
  SimpleSwapFactory: "0xA8220845FaD2421cDC57025e2Fbf0bd93d59c223",
  SimpleSwapRouter: "0x721808747139902f46213e37A0B9DE936Bb1F3b0",
  SimpleFarm: "0xe880e79f1C437285Ed2A2D907e14d0fF0468d702"
};

// 构造函数参数
const constructorArgs = {
  AIHToken: ["0x0f583daF67db8B3287094F1871AD736A91B4A98a", "0xaeD5E239ACBBE496aAD809941C29444214Eb3e57"],
  SimpleSwapFactory: [],
  SimpleSwapRouter: ["0x106AF5A1e76Bb24bD3460cf4d80e13A76bb5c49a"],
  SimpleFarm: ["0x106AF5A1e76Bb24bD3460cf4d80e13A76bb5c49a"]
};

// 部署信息
const deploymentInfo = {
  network: "sepolia",
  chainId: "11155111", // Sepolia链ID
  deployer: "0x0d87d8E1def9cA4A5f1BE181dc37c9ed9622c8d5",
  deploymentTime: new Date().toISOString(),
  contracts: contractAddresses,
  constructorArgs: constructorArgs
};

// 创建部署信息目录
async function main() {
  console.log("保存部署信息...");
  
  // 创建deployments目录（如果不存在）
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // 保存部署信息
  const fileName = `sepolia_full_deployment_${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')}.json`;
  fs.writeFileSync(
    path.join(deploymentDir, fileName),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`部署信息已保存到: ${path.join(deploymentDir, fileName)}`);
  
  // 更新最新部署信息
  fs.writeFileSync(
    path.join(deploymentDir, `sepolia_latest.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`最新部署信息已保存到: ${path.join(deploymentDir, `sepolia_latest.json`)}`);
  
  // 创建前端配置
  const frontendDir = path.join(__dirname, "../../frontend/src/constants");
  if (fs.existsSync(frontendDir)) {
    try {
      const frontendConfig = `// 自动生成的合约地址配置 - ${new Date().toISOString()}
export const CONTRACT_ADDRESSES = {
  AIHToken: "${contractAddresses.AIHToken}",
  SimpleSwapFactory: "${contractAddresses.SimpleSwapFactory}",
  SimpleSwapRouter: "${contractAddresses.SimpleSwapRouter}",
  SimpleFarm: "${contractAddresses.SimpleFarm}",
};

export const NETWORK_CONFIG = {
  chainId: 11155111,
  network: "sepolia"
};
`;
      fs.writeFileSync(
        path.join(frontendDir, "addresses.ts"),
        frontendConfig
      );
      console.log(`前端配置已更新: ${path.join(frontendDir, "addresses.ts")}`);
    } catch (error) {
      console.log("无法更新前端配置:", error.message);
    }
  }
  
  console.log("\n手动验证合约命令:");
  console.log(`npx hardhat verify --network sepolia ${contractAddresses.AIHToken} "${constructorArgs.AIHToken[0]}" "${constructorArgs.AIHToken[1]}"`);
  console.log(`npx hardhat verify --network sepolia ${contractAddresses.SimpleSwapFactory}`);
  console.log(`npx hardhat verify --network sepolia ${contractAddresses.SimpleSwapRouter} "${constructorArgs.SimpleSwapRouter[0]}"`);
  console.log(`npx hardhat verify --network sepolia ${contractAddresses.SimpleFarm} "${constructorArgs.SimpleFarm[0]}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 