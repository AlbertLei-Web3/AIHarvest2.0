// scripts/deploy-sepolia.js
// Sepolia部署脚本 - 针对Sepolia测试网优化
const hardhat = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("开始在Sepolia测试网部署AIHarvest DeFi系统...");
  console.log(`当前网络: ${hardhat.network.name}, ChainID: ${(await ethers.provider.getNetwork()).chainId}`);
  
  // 确保我们在正确的网络
  if (hardhat.network.name !== 'sepolia') {
    console.error("错误: 请使用 --network sepolia 参数运行此脚本");
    process.exit(1);
  }

  try {
    // 获取签名者
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("账户余额:", ethers.formatEther(balance), "ETH");
    
    // 检查余额是否足够
    if (balance < ethers.parseEther("0.1")) {
      console.warn("警告: 账户余额低于0.1 ETH，可能不足以完成部署");
      console.warn("请确保有足够的Sepolia ETH用于部署和合约交互");
      
      // 提示如何获取Sepolia测试币
      console.log("\n获取Sepolia ETH的方法:");
      console.log("1. 访问 https://sepoliafaucet.com/");
      console.log("2. 或 https://sepolia-faucet.pk910.de/");
      console.log("3. 通过Alchemy或Infura的水龙头");
      
      // 询问是否继续
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const confirmation = await new Promise(resolve => {
        readline.question("是否继续部署? (y/n): ", answer => {
          readline.close();
          resolve(answer.toLowerCase());
        });
      });
      
      if (confirmation !== 'y') {
        console.log("部署已取消");
        process.exit(0);
      }
    }
    
    // ========== 1. 部署AIHToken ==========
    console.log("\n1. 开始部署AIH代币...");
    const teamWallet = "0x0f583daF67db8B3287094F1871AD736A91B4A98a";  // 团队钱包地址
    const ecosystemWallet = "0xaeD5E239ACBBE496aAD809941C29444214Eb3e57";  // 生态系统钱包地址
    console.log("团队钱包地址:", teamWallet);
    console.log("生态系统钱包地址:", ecosystemWallet);
    
    const AIHToken = await ethers.getContractFactory("AIHToken");
    console.log("部署AIH代币...");
    const aihToken = await AIHToken.deploy(teamWallet, ecosystemWallet);
    console.log("等待交易确认...");
    await aihToken.waitForDeployment();
    console.log("AIH代币已部署，地址:", await aihToken.getAddress());
    
    // 等待区块确认，以便Etherscan可以验证
    console.log("等待几个区块确认...");
    await sleep(15000); // 15秒，通常Sepolia出块时间约为15秒
    
    // ========== 2. 部署SimpleSwapFactory ==========
    console.log("\n2. 开始部署SimpleSwapFactory...");
    const SimpleSwapFactory = await ethers.getContractFactory("SimpleSwapFactory");
    const factory = await SimpleSwapFactory.deploy();
    await factory.waitForDeployment();
    console.log("SimpleSwapFactory已部署，地址:", await factory.getAddress());
    await sleep(10000);
    
    // ========== 3. 部署SimpleSwapRouter ==========
    console.log("\n3. 开始部署SimpleSwapRouter...");
    const SimpleSwapRouter = await ethers.getContractFactory("SimpleSwapRouter");
    const router = await SimpleSwapRouter.deploy(await aihToken.getAddress());
    await router.waitForDeployment();
    console.log("SimpleSwapRouter已部署，地址:", await router.getAddress());
    await sleep(10000);
    
    // ========== 4. 部署SimpleFarm ==========
    console.log("\n4. 开始部署SimpleFarm...");
    const SimpleFarm = await ethers.getContractFactory("SimpleFarm");
    const farm = await SimpleFarm.deploy(await aihToken.getAddress());
    await farm.waitForDeployment();
    console.log("SimpleFarm已部署，地址:", await farm.getAddress());
    await sleep(10000);
    
    // ========== 5. 设置权限和配置 ==========
    console.log("\n5. 设置合约权限...");
    
    // 5.1 设置AIH代币的Farm地址
    console.log("设置AIH代币的Farm地址...");
    const setFarmTx = await aihToken.setFarmAddress(await farm.getAddress());
    console.log("等待交易确认...");
    await setFarmTx.wait();
    console.log("AIH代币的Farm地址已设置");
    
    // 5.2 设置Router授权Farm
    console.log("授权Farm在Router中...");
    const authorizeFarmTx = await router.setFarmAuthorization(await farm.getAddress(), true);
    console.log("等待交易确认...");
    await authorizeFarmTx.wait();
    console.log("Farm已在Router中授权");
    
    // 5.3 设置Router为AIH代币的router地址（如果需要）
    if (typeof aihToken.setRouterAddress === 'function') {
      console.log("设置AIH代币的Router地址...");
      try {
        const setRouterTx = await aihToken.setRouterAddress(await router.getAddress());
        await setRouterTx.wait();
        console.log("AIH代币的Router地址已设置");
      } catch (error) {
        console.log("设置Router地址失败或不需要，跳过...");
      }
    }
    
    // 获取合约地址，用于保存和验证
    const aihTokenAddress = await aihToken.getAddress();
    const factoryAddress = await factory.getAddress();
    const routerAddress = await router.getAddress();
    const farmAddress = await farm.getAddress();
    
    // ========== 6. 验证合约 (如果Etherscan API密钥可用) ==========
    console.log("\n6. 准备验证合约...");
    if (process.env.ETHERSCAN_API_KEY) {
      await verifyContract("AIHToken", aihTokenAddress, [teamWallet, ecosystemWallet]);
      await verifyContract("SimpleSwapFactory", factoryAddress, []);
      await verifyContract("SimpleSwapRouter", routerAddress, [aihTokenAddress]);
      await verifyContract("SimpleFarm", farmAddress, [aihTokenAddress]);
    } else {
      console.log("未找到ETHERSCAN_API_KEY环境变量，跳过合约验证");
      console.log("部署后手动验证命令:");
      console.log(`npx hardhat verify --network sepolia ${aihTokenAddress} "${teamWallet}" "${ecosystemWallet}"`);
      console.log(`npx hardhat verify --network sepolia ${factoryAddress}`);
      console.log(`npx hardhat verify --network sepolia ${routerAddress} "${aihTokenAddress}"`);
      console.log(`npx hardhat verify --network sepolia ${farmAddress} "${aihTokenAddress}"`);
    }
    
    // ========== 7. 保存部署信息 ==========
    console.log("\n7. 保存部署信息...");
    const chainId = (await ethers.provider.getNetwork()).chainId;
    
    const deploymentInfo = {
      network: hardhat.network.name,
      chainId: chainId.toString(), // 将BigInt转换为字符串
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      contracts: {
        AIHToken: aihTokenAddress,
        SimpleSwapFactory: factoryAddress,
        SimpleSwapRouter: routerAddress,
        SimpleFarm: farmAddress
      },
      constructorArgs: {
        AIHToken: [teamWallet, ecosystemWallet],
        SimpleSwapFactory: [],
        SimpleSwapRouter: [aihTokenAddress],
        SimpleFarm: [aihTokenAddress]
      }
    };
    
    // 创建deployments目录（如果不存在）
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    // 保存部署信息
    const fileName = `${hardhat.network.name}_full_deployment_${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')}.json`;
    fs.writeFileSync(
      path.join(deploymentDir, fileName),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`部署信息已保存到: ${path.join(deploymentDir, fileName)}`);
    
    // 更新最新部署信息
    fs.writeFileSync(
      path.join(deploymentDir, `${hardhat.network.name}_latest.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`最新部署信息已保存到: ${path.join(deploymentDir, `${hardhat.network.name}_latest.json`)}`);
    
    // 创建前端配置
    const frontendDir = path.join(__dirname, "../../frontend/src/constants");
    if (fs.existsSync(frontendDir)) {
      try {
        const frontendConfig = `// 自动生成的合约地址配置 - ${new Date().toISOString()}
export const CONTRACT_ADDRESSES = {
  AIHToken: "${aihTokenAddress}",
  SimpleSwapFactory: "${factoryAddress}",
  SimpleSwapRouter: "${routerAddress}",
  SimpleFarm: "${farmAddress}",
};

export const NETWORK_CONFIG = {
  chainId: ${chainId.toString()}, // 将BigInt转换为字符串
  network: "${hardhat.network.name}"
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
    
    // ========== 8. 显示部署后的步骤 ==========
    console.log("\n\n========== 部署完成! ==========");
    console.log("AIH代币地址:", aihTokenAddress);
    console.log("SimpleSwapFactory地址:", factoryAddress);
    console.log("SimpleSwapRouter地址:", routerAddress);
    console.log("SimpleFarm地址:", farmAddress);
    
    console.log("\n后续步骤:");
    console.log("1. 使用部署的合约地址更新前端配置 (已自动更新，如有需要请手动确认)");
    console.log("2. 在Sepolia上准备测试用的代币(ETH、WETH等)");
    console.log("3. 添加初始流动性创建交易对");
    console.log("4. 添加LP代币到Farm");
    console.log("5. 通过测试网前端验证所有功能");
    console.log("6. 通知测试团队可以开始测试合约");
    
    const etherscanBaseUrl = "https://sepolia.etherscan.io/address/";
    console.log("\n在Etherscan上查看合约:");
    console.log(`AIHToken: ${etherscanBaseUrl}${aihTokenAddress}`);
    console.log(`SimpleSwapFactory: ${etherscanBaseUrl}${factoryAddress}`);
    console.log(`SimpleSwapRouter: ${etherscanBaseUrl}${routerAddress}`);
    console.log(`SimpleFarm: ${etherscanBaseUrl}${farmAddress}`);
    
  } catch (error) {
    console.error("部署过程中出错:", error);
    if (error.message.includes("insufficient funds")) {
      console.error("账户余额不足。请确保有足够的Sepolia ETH支付部署和交易费用。");
    }
    process.exit(1);
  }
}

// 合约验证辅助函数
async function verifyContract(contractName, address, constructorArguments) {
  try {
    console.log(`正在验证 ${contractName}...`);
    await hardhat.run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments
    });
    console.log(`${contractName} 验证成功`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`${contractName} 已经验证过了`);
    } else {
      console.error(`验证 ${contractName} 失败:`, error.message);
      console.log(`手动验证命令: npx hardhat verify --network sepolia ${address} ${constructorArguments.map(arg => `"${arg}"`).join(' ')}`);
    }
  }
}

// 辅助函数 - 延迟执行
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("未处理的错误:", error);
    process.exit(1);
  }); 