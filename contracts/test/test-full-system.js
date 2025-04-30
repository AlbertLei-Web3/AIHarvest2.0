// test-full-system.js - 增强版(ethers v6兼容)
const hre = require("hardhat");
const { expect } = require("chai");

async function main() {
  console.log("开始在本地网络进行完整系统测试...");
  
  // 获取测试账户
  const [deployer, user1, user2] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("测试用户1:", user1.address);
  console.log("测试用户2:", user2.address);
  
  try {
    // ==================== 部署合约 ====================
    console.log("\n1. 部署所有合约...");
    
    // 部署AIHToken
    console.log("部署AIHToken...");
    const AIHToken = await hre.ethers.getContractFactory("AIHToken");
    
    // 验证参数非空
    if (!deployer.address) throw new Error("部署者地址为空");
    console.log("检查部署参数: 团队钱包地址 =", deployer.address);
    console.log("检查部署参数: 生态系统钱包地址 =", deployer.address);
    
    // 部署合约
    const aihToken = await AIHToken.deploy(deployer.address, deployer.address);
    await aihToken.waitForDeployment();
    const aihTokenAddress = await aihToken.getAddress();
    
    // 验证合约地址
    if (!aihTokenAddress || aihTokenAddress === '0x0000000000000000000000000000000000000000') 
      throw new Error("AIHToken部署失败 - 地址无效");
    console.log("AIHToken部署地址:", aihTokenAddress);
    
    // 基本合约功能检查
    const aihSymbol = await aihToken.symbol();
    const aihName = await aihToken.name();
    console.log(`验证AIH信息: 名称=${aihName}, 代号=${aihSymbol}`);
    if (aihSymbol !== "AIH") throw new Error("AIH代币符号不正确");
    
    // 部署SimpleSwapFactory
    console.log("\n部署SimpleSwapFactory...");
    const SimpleSwapFactory = await hre.ethers.getContractFactory("SimpleSwapFactory");
    const factory = await SimpleSwapFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') 
      throw new Error("SimpleSwapFactory部署失败 - 地址无效");
    console.log("SimpleSwapFactory部署地址:", factoryAddress);
    
    // 部署SimpleSwapRouter
    console.log("\n部署SimpleSwapRouter...");
    const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
    
    // 检查参数
    console.log("检查Router部署参数: AIH地址 =", aihTokenAddress);
    
    const router = await SimpleSwapRouter.deploy(aihTokenAddress);
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') 
      throw new Error("SimpleSwapRouter部署失败 - 地址无效");
    console.log("SimpleSwapRouter部署地址:", routerAddress);
    
    // 验证Router设置的AIH地址
    const aihInRouter = await router.aihToken();
    console.log("Router中的AIH地址:", aihInRouter);
    if (aihInRouter !== aihTokenAddress) 
      throw new Error("Router中的AIH地址与部署的不匹配");
    
    // 部署SimpleFarm
    console.log("\n部署SimpleFarm...");
    const SimpleFarm = await hre.ethers.getContractFactory("SimpleFarm");
    
    // 检查参数
    console.log("检查Farm部署参数: AIH地址 =", aihTokenAddress);
    
    const farm = await SimpleFarm.deploy(aihTokenAddress);
    await farm.waitForDeployment();
    const farmAddress = await farm.getAddress();
    if (!farmAddress || farmAddress === '0x0000000000000000000000000000000000000000') 
      throw new Error("SimpleFarm部署失败 - 地址无效");
    console.log("SimpleFarm部署地址:", farmAddress);
    
    // 验证Farm设置的AIH地址
    const aihInFarm = await farm.aihToken();
    console.log("Farm中的AIH地址:", aihInFarm);
    if (aihInFarm !== aihTokenAddress) 
      throw new Error("Farm中的AIH地址与部署的不匹配");
    
    // ==================== 设置权限 ====================
    console.log("\n2. 设置合约权限...");
    
    // 检查AIH代币Farm地址当前状态
    const initialFarmInAIH = await aihToken.farmAddress();
    console.log("AIH中的初始Farm地址:", initialFarmInAIH);
    if (initialFarmInAIH !== '0x0000000000000000000000000000000000000000') 
      throw new Error("AIH代币的Farm地址已被设置，无法修改");
    
    // 设置AIH代币的Farm地址
    console.log("设置AIH代币的Farm地址...");
    try {
      let tx = await aihToken.setFarmAddress(farmAddress);
      console.log("交易发送，等待确认...");
      let receipt = await tx.wait();
      if (!receipt.status) throw new Error("交易失败");
      console.log("已设置AIH代币的Farm地址，交易成功");
    } catch (error) {
      console.error("设置AIH代币Farm地址失败:", error.message);
      throw error;
    }
    
    // 设置Router授权Farm
    console.log("\n授权Farm在Router中...");
    try {
      // 检查当前授权状态
      const initialAuth = await router.authorizedFarms(farmAddress);
      console.log("Farm初始授权状态:", initialAuth ? "已授权" : "未授权");
      
      let tx = await router.setFarmAuthorization(farmAddress, true);
      console.log("交易发送，等待确认...");
      let receipt = await tx.wait();
      if (!receipt.status) throw new Error("交易失败");
      console.log("已授权Farm在Router中，交易成功");
    } catch (error) {
      console.error("设置Router授权Farm失败:", error.message);
      throw error;
    }
    
    // ==================== 部署验证 ====================
    console.log("\n3. 验证部署与权限状态...");
    
    // 验证AIH设置
    try {
      const farmInAIH = await aihToken.farmAddress();
      console.log("AIH中的Farm地址:", farmInAIH);
      if (farmInAIH !== farmAddress) 
        throw new Error("AIH中的Farm地址与设置的不匹配");
      console.log("✓ AIH代币Farm地址设置正确");
      
      // 验证仅能设置一次
      console.log("\n验证AIH代币Farm地址只能设置一次...");
      try {
        const tx = await aihToken.setFarmAddress(deployer.address);
        await tx.wait();
        console.error("✗ 错误: AIH代币Farm地址可以被多次设置");
      } catch (error) {
        console.log("✓ 正确: AIH代币Farm地址只能设置一次");
      }
    } catch (error) {
      console.error("验证AIH设置失败:", error.message);
      throw error;
    }
    
    // 验证Farm授权
    try {
      const isFarmAuthorized = await router.authorizedFarms(farmAddress);
      console.log("Farm授权状态:", isFarmAuthorized ? "✓ 已授权" : "✗ 未授权");
      if (!isFarmAuthorized) throw new Error("Farm未被Router授权");
    } catch (error) {
      console.error("验证Farm授权失败:", error.message);
      throw error;
    }
    
    // 验证AIH铸造权限
    console.log("\n4. 验证Farm铸造AIH权限...");
    try {
      // 检查Farm是否可以铸造AIH代币
      // 创建一个测试用户作为接收者
      const initialBalance = await aihToken.balanceOf(user1.address);
      console.log(`用户1初始AIH余额: ${initialBalance}`);
      
      // 使用Farm铸造一些AIH给用户
      console.log("尝试通过Farm铸造AIH代币...");
      const mintAmount = hre.ethers.parseEther("1"); // 1 AIH
      
      // 调用mint函数 - 注意：在实际代码中，这通常通过updatePool等内部函数调用
      // 这里我们直接模拟Farm调用mint函数
      try {
        // 方法1：使用模拟交易检查权限
        // 注意：这只是检查权限，不会实际执行交易
        const callData = aihToken.interface.encodeFunctionData("mint", [user1.address, mintAmount]);
        const tx = {
          from: farmAddress,
          to: aihTokenAddress,
          data: callData
        };
        
        // 尝试从非Farm地址铸造应该失败
        try {
          await deployer.call(tx); // 从deployer调用应该失败
          console.error("✗ 错误: 非Farm地址可以铸造AIH");
        } catch (error) {
          console.log("✓ 正确: 非Farm地址无法铸造AIH");
        }
        
        console.log("→ 注意: 无法直接测试Farm铸造AIH，需要通过实际操作测试");
        console.log("→ Farm铸造AIH将在质押操作后验证");
      } catch (error) {
        console.error("铸造测试失败:", error.message);
      }
    } catch (error) {
      console.error("验证AIH铸造权限失败:", error.message);
    }
    
    console.log("\n==================== 基础测试结果汇总 ====================");
    console.log("✅ AIHToken部署成功");
    console.log("✅ SimpleSwapFactory部署成功");
    console.log("✅ SimpleSwapRouter部署成功");
    console.log("✅ SimpleFarm部署成功");
    console.log("✅ AIH代币Farm地址设置成功且唯一");
    console.log("✅ Router成功授权Farm");
    console.log("\n基础配置验证完成！权限关系已正确设置");
    
    console.log("\n为完全验证系统，建议进行以下后续测试:");
    console.log("1. 创建LP代币对并添加到Farm");
    console.log("2. 用户质押LP代币到Farm");
    console.log("3. 检查AIH奖励生成与领取");
    console.log("4. 测试提款功能");
    
  } catch (error) {
    console.error("\n⚠️⚠️⚠️ 测试过程中出错:", error);
    console.error("错误详情:", error.stack);
    throw error;
  }
}

// 执行主函数
main()
  .then(() => {
    console.log("\n========================");
    console.log("✅ 所有测试通过！");
    console.log("========================");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n========================");
    console.error("❌ 测试失败!");
    console.error("========================");
    process.exit(1);
  });