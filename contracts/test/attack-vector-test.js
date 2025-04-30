// attack-vector-test.js - 针对性重入攻击测试
const hre = require("hardhat");
const { expect } = require("chai");

// 创建一个简单的重入攻击者合约
async function deployAttacker(routerAddress, targetFunction) {
  const AttackerFactory = await hre.ethers.getContractFactory("SimpleAttacker");
  const attacker = await AttackerFactory.deploy(routerAddress, targetFunction);
  await attacker.waitForDeployment();
  return attacker;
}

async function main() {
  console.log("开始进行针对性重入攻击测试...");
  console.log("Starting targeted reentrancy attack test...\n");
  
  // 获取测试账户
  const [deployer, user1] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("测试用户1:", user1.address);
  
  // 部署核心合约
  console.log("\n部署测试合约...");
  
  // 部署AIHToken
  const AIHToken = await hre.ethers.getContractFactory("AIHToken");
  const aihToken = await AIHToken.deploy(deployer.address, deployer.address);
  await aihToken.waitForDeployment();
  const aihTokenAddress = await aihToken.getAddress();
  console.log("AIHToken部署地址:", aihTokenAddress);
  
  // 部署Router
  const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
  const router = await SimpleSwapRouter.deploy(aihTokenAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("SimpleSwapRouter部署地址:", routerAddress);
  
  // 部署测试代币B (正常代币)
  const tokenB = await AIHToken.deploy(deployer.address, deployer.address);
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("测试代币B地址:", tokenBAddress);

  // 给用户一些代币
  const amount = hre.ethers.parseEther("1000");
  await tokenB.transfer(user1.address, amount);
  console.log("向用户1发送 1000 个代币B");
  
  // 部署SimpleAttacker合约 (包含恶意代币)
  console.log("\n部署攻击者合约...");
  const attacker = await deployAttacker(routerAddress, "addLiquidity");
  const attackerAddress = await attacker.getAddress();
  console.log("攻击者合约地址:", attackerAddress);
  
  // 获取恶意代币地址
  const maliciousTokenAddress = await attacker.maliciousToken();
  console.log("恶意代币地址:", maliciousTokenAddress);
  
  // 向攻击者发送代币B
  await tokenB.transfer(attackerAddress, amount);
  console.log("向攻击者发送 1000 个代币B");
  
  // 设置攻击配置
  await attacker.setAttackConfig(tokenBAddress, amount, amount);
  console.log("攻击配置已设置");
  
  // 执行攻击测试1: 添加流动性
  console.log("\n测试1: 添加流动性重入攻击...");
  try {
    const tx = await attacker.executeAddLiquidityAttack();
    await tx.wait();
    const attackStatus = await attacker.getAttackStatus();
    
    if (attackStatus) {
      console.log("❌ 漏洞存在: 恶意代币能够在添加流动性期间进行重入攻击");
    } else {
      console.log("✅ 重入保护成功: Router在添加流动性时正确阻止了重入攻击");
    }
  } catch (error) {
    console.log("❌ 测试失败，错误:", error.message);
  }
  
  // 执行攻击测试2: 移除流动性
  console.log("\n测试2: 移除流动性重入攻击...");
  
  // 获取恶意代币实例以便后续操作
  const MaliciousERC20 = await hre.ethers.getContractFactory("MaliciousERC20");
  const maliciousToken = MaliciousERC20.attach(maliciousTokenAddress);
  
  // 首先需要正常添加一些流动性以便后续测试
  console.log("首先添加正常流动性...");
  await tokenB.approve(routerAddress, amount);
  
  try {
    // 使用恶意代币作为一方添加流动性
    
    // 1. 首先让攻击者合约将一些恶意代币转给部署者
    console.log("向部署者转移一些恶意代币...");
    await attacker.transferMaliciousTokens(deployer.address, amount);
    
    // 2. 部署者授权Router使用恶意代币
    console.log("授权Router使用恶意代币...");
    await maliciousToken.approve(routerAddress, amount);
    
    // 3. 添加流动性
    console.log("添加流动性...");
    await router.addLiquidity(
      maliciousTokenAddress,
      tokenBAddress,
      amount,
      amount,
      0,
      0,
      deployer.address
    );
    
    console.log("成功添加流动性");
    
    // 获取LP代币
    const pairAddress = await router.getPairAddress(maliciousTokenAddress, tokenBAddress);
    const lpTokenAddress = await router.getLPToken(pairAddress);
    console.log("LP代币地址:", lpTokenAddress);
    
    // 获取LP代币实例
    const PairERC20 = await hre.ethers.getContractFactory("PairERC20");
    const lpToken = PairERC20.attach(lpTokenAddress);
    
    // 检查LP代币余额
    const lpBalance = await lpToken.balanceOf(deployer.address);
    console.log("部署者LP代币余额:", hre.ethers.formatEther(lpBalance));
    
    // 转移一些LP代币给攻击者
    const transferAmount = lpBalance / 2n;
    await lpToken.transfer(attackerAddress, transferAmount);
    console.log("向攻击者转移LP代币:", hre.ethers.formatEther(transferAmount));
    
    // 设置攻击者的移除流动性配置
    await attacker.setRemoveLiquidityConfig(
      tokenBAddress, 
      transferAmount.toString()
    );
    
    // 执行攻击
    await attacker.executeRemoveLiquidityAttack();
    
    // 检查攻击结果
    const attackStatus = await attacker.getAttackStatus();
    if (attackStatus) {
      console.log("❌ 漏洞存在: 恶意代币能够在移除流动性期间进行重入攻击");
    } else {
      console.log("✅ 重入保护成功: Router在移除流动性时正确阻止了重入攻击");
    }
  } catch (error) {
    console.log("❌ 测试失败，错误:", error.message);
  }
  
  // 执行攻击测试3: 代币交换
  console.log("\n测试3: 代币交换重入攻击...");
  try {
    await attacker.setSwapConfig(tokenBAddress, hre.ethers.parseEther("10").toString());
    await attacker.executeSwapAttack();
    
    // 检查攻击结果
    const attackStatus = await attacker.getAttackStatus();
    if (attackStatus) {
      console.log("❌ 漏洞存在: 恶意代币能够在代币交换期间进行重入攻击");
    } else {
      console.log("✅ 重入保护成功: Router在代币交换时正确阻止了重入攻击");
    }
  } catch (error) {
    console.log("❌ 测试失败，错误:", error.message);
  }
  
  console.log("\n所有测试完成\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 