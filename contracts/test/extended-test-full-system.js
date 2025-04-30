// extended-test-full-system.js - 高级功能测试(ethers v6兼容)
const hre = require("hardhat");
const { expect } = require("chai");

async function main() {
  console.log("开始进行全系统高级功能测试...");
  
  // 获取测试账户
  const [deployer, user1, user2] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("测试用户1:", user1.address);
  console.log("测试用户2:", user2.address);
  
  // 存储所有合约和地址
  const contracts = {};
  
  try {
    // ======== 第1部分: 基础合约部署 ========
    console.log("\n==================== 第1部分: 基础合约部署 ====================");
    
    // 部署AIHToken
    console.log("\n部署AIHToken...");
    const AIHToken = await hre.ethers.getContractFactory("AIHToken");
    contracts.aihToken = await AIHToken.deploy(deployer.address, deployer.address);
    await contracts.aihToken.waitForDeployment();
    contracts.aihTokenAddress = await contracts.aihToken.getAddress();
    console.log("AIHToken部署地址:", contracts.aihTokenAddress);
    
    // 部署SimpleSwapFactory
    console.log("\n部署SimpleSwapFactory...");
    const SimpleSwapFactory = await hre.ethers.getContractFactory("SimpleSwapFactory");
    contracts.factory = await SimpleSwapFactory.deploy();
    await contracts.factory.waitForDeployment();
    contracts.factoryAddress = await contracts.factory.getAddress();
    console.log("SimpleSwapFactory部署地址:", contracts.factoryAddress);
    
    // 部署SimpleSwapRouter
    console.log("\n部署SimpleSwapRouter...");
    const SimpleSwapRouter = await hre.ethers.getContractFactory("SimpleSwapRouter");
    contracts.router = await SimpleSwapRouter.deploy(contracts.aihTokenAddress);
    await contracts.router.waitForDeployment();
    contracts.routerAddress = await contracts.router.getAddress();
    console.log("SimpleSwapRouter部署地址:", contracts.routerAddress);
    
    // 部署SimpleFarm
    console.log("\n部署SimpleFarm...");
    const SimpleFarm = await hre.ethers.getContractFactory("SimpleFarm");
    contracts.farm = await SimpleFarm.deploy(contracts.aihTokenAddress);
    await contracts.farm.waitForDeployment();
    contracts.farmAddress = await contracts.farm.getAddress();
    console.log("SimpleFarm部署地址:", contracts.farmAddress);
    
    // 设置基础权限
    console.log("\n设置基础权限...");
    await (await contracts.aihToken.setFarmAddress(contracts.farmAddress)).wait();
    await (await contracts.router.setFarmAuthorization(contracts.farmAddress, true)).wait();
    console.log("基础权限设置完成");
    
    // ======== 第2部分: 创建测试代币 ========
    console.log("\n==================== 第2部分: 创建测试代币 ====================");
    
    // 部署两个测试代币 - 我们使用简单ERC20代币
    console.log("\n创建测试代币...");
    const TestToken = await hre.ethers.getContractFactory("AIHToken"); // 复用AIHToken作为测试代币
    
    // 测试代币A
    contracts.tokenA = await TestToken.deploy(deployer.address, deployer.address);
    await contracts.tokenA.waitForDeployment();
    contracts.tokenAAddress = await contracts.tokenA.getAddress();
    console.log("测试代币A(TD)地址:", contracts.tokenAAddress);
    
    // 测试代币B
    contracts.tokenB = await TestToken.deploy(deployer.address, deployer.address);
    await contracts.tokenB.waitForDeployment();
    contracts.tokenBAddress = await contracts.tokenB.getAddress();
    console.log("测试代币B(FHBI)地址:", contracts.tokenBAddress);
    
    // 给测试用户发送代币
    console.log("\n分发测试代币...");
    const mintAmount = hre.ethers.parseEther("10000"); // 1万个代币
    
    // 给用户1发送代币
    await (await contracts.tokenA.transfer(user1.address, mintAmount)).wait();
    await (await contracts.tokenB.transfer(user1.address, mintAmount)).wait();
    console.log(`向用户1发送 ${hre.ethers.formatEther(mintAmount)} 个代币A和代币B`);
    
    // 给用户2发送代币
    await (await contracts.tokenA.transfer(user2.address, mintAmount)).wait();
    await (await contracts.tokenB.transfer(user2.address, mintAmount)).wait();
    console.log(`向用户2发送 ${hre.ethers.formatEther(mintAmount)} 个代币A和代币B`);
    
    // 验证代币余额
    const user1BalanceA = await contracts.tokenA.balanceOf(user1.address);
    const user1BalanceB = await contracts.tokenB.balanceOf(user1.address);
    console.log(`用户1 代币A余额: ${hre.ethers.formatEther(user1BalanceA)}`);
    console.log(`用户1 代币B余额: ${hre.ethers.formatEther(user1BalanceB)}`);
    
    // ======== 第3部分: 创建流动性池 ========
    console.log("\n==================== 第3部分: 创建流动性池 ====================");
    
    // 用户授权Router使用代币
    console.log("\n用户1授权Router使用代币...");
    await (await contracts.tokenA.connect(user1).approve(contracts.routerAddress, hre.ethers.MaxUint256)).wait();
    await (await contracts.tokenB.connect(user1).approve(contracts.routerAddress, hre.ethers.MaxUint256)).wait();
    console.log("授权完成");
    
    // 添加流动性
    console.log("\n添加流动性...");
    const liquidityAmount = hre.ethers.parseEther("1000"); // 添加1000个代币
    console.log(`添加 ${hre.ethers.formatEther(liquidityAmount)} 代币A 和 ${hre.ethers.formatEther(liquidityAmount)} 代币B`);
    
    // 声明变量在外部作用域
    let pairAddress;
    let lpTokenAddress;
    let lpBalance;
    
    try {
      const addLiquidityTx = await contracts.router.connect(user1).addLiquidity(
        contracts.tokenAAddress,
        contracts.tokenBAddress,
        liquidityAmount,
        liquidityAmount,
        0, // 最小A数量
        0, // 最小B数量
        user1.address
      );
      const addLiquidityReceipt = await addLiquidityTx.wait();
      console.log("流动性添加成功，交易哈希:", addLiquidityReceipt.hash);
      
      // 获取代币对和LP代币地址
      pairAddress = await contracts.router.getPairAddress(contracts.tokenAAddress, contracts.tokenBAddress);
      lpTokenAddress = await contracts.router.getLPToken(pairAddress);
      console.log("代币对地址:", pairAddress);
      console.log("LP代币地址:", lpTokenAddress);
      
      // 检查LP代币余额
      const PairERC20 = await hre.ethers.getContractFactory("PairERC20");
      const lpToken = await PairERC20.attach(lpTokenAddress);
      contracts.lpToken = lpToken;
      
      lpBalance = await lpToken.balanceOf(user1.address);
      console.log(`用户1 LP代币余额: ${hre.ethers.formatEther(lpBalance)}`);
      if (lpBalance == 0) throw new Error("未收到LP代币");
      
    } catch (error) {
      console.error("添加流动性失败:", error.message);
      
      // 查看当前代币余额
      const user1BalanceA = await contracts.tokenA.balanceOf(user1.address);
      const user1BalanceB = await contracts.tokenB.balanceOf(user1.address);
      console.log(`当前用户1 代币A余额: ${hre.ethers.formatEther(user1BalanceA)}`);
      console.log(`当前用户1 代币B余额: ${hre.ethers.formatEther(user1BalanceB)}`);
      
      throw error; // 重新抛出错误以停止测试
    }
    
    // ======== 第4部分: 添加LP代币到Farm ========
    console.log("\n==================== 第4部分: 添加LP代币到Farm ====================");
    
    // 添加LP代币到Farm
    console.log("\n添加LP代币到Farm...");
    const addLpToFarmTx = await contracts.farm.add(100, lpTokenAddress); // 100是分配点数
    await addLpToFarmTx.wait();
    console.log("LP代币添加到Farm成功");
    
    // 验证LP代币在Farm中
    const poolCount = await contracts.farm.poolLength();
    console.log("Farm中的池数量:", poolCount.toString());
    
    const poolInfo = await contracts.farm.getPoolInfo(0);
    console.log("池0信息:");
    console.log("- LP代币:", poolInfo[0]);
    console.log("- 分配点数:", poolInfo[1].toString());
    console.log("- 上次奖励时间:", poolInfo[2].toString());
    console.log("- 累计AIH每份额:", poolInfo[3].toString());
    console.log("- 总质押量:", poolInfo[4].toString());
    
    const isCorrectLpToken = poolInfo[0].toLowerCase() === lpTokenAddress.toLowerCase();
    console.log("LP代币地址验证:", isCorrectLpToken ? "✓ 正确" : "✗ 错误");
    if (!isCorrectLpToken) throw new Error("Farm中的LP代币地址不匹配");
    
    // ======== 第5部分: 质押LP代币 ========
    console.log("\n==================== 第5部分: 质押LP代币 ====================");
    
    // 用户授权Farm使用LP代币
    console.log("\n用户1授权Farm使用LP代币...");
    await (await contracts.lpToken.connect(user1).approve(contracts.farmAddress, hre.ethers.MaxUint256)).wait();
    console.log("授权完成");
    
    // 质押LP代币
    console.log("\n质押LP代币...");
    const stakeAmount = lpBalance / 2n; // 质押一半的LP代币
    console.log(`质押数量: ${hre.ethers.formatEther(stakeAmount)} LP代币`);
    
    const stakeTx = await contracts.farm.connect(user1).deposit(0, stakeAmount);
    await stakeTx.wait();
    console.log("质押成功");
    
    // 验证质押信息
    const userInfo = await contracts.farm.getUserInfo(0, user1.address);
    console.log("用户质押信息:");
    console.log("- 质押数量:", hre.ethers.formatEther(userInfo[0]));
    console.log("- 奖励债务:", userInfo[1].toString());
    console.log("- 待领取奖励:", userInfo[2].toString());
    
    const correctStakeAmount = userInfo[0] == stakeAmount;
    console.log("质押数量验证:", correctStakeAmount ? "✓ 正确" : "✗ 错误");
    if (!correctStakeAmount) throw new Error("质押数量不匹配");
    
    // ======== 第6部分: 等待并检查奖励 ========
    console.log("\n==================== 第6部分: 等待并检查奖励 ====================");
    
    // 推进时间增加奖励
    console.log("\n等待奖励生成 (模拟时间流逝)...");
    
    // 模拟区块时间前进1小时
    console.log("推进时间1小时...");
    await hre.network.provider.send("evm_increaseTime", [3600]);
    await hre.network.provider.send("evm_mine");
    
    // 检查待领取奖励
    const pendingReward = await contracts.farm.pendingAIH(0, user1.address);
    console.log(`待领取AIH奖励: ${hre.ethers.formatEther(pendingReward)}`);
    
    if (pendingReward == 0) {
      console.log("未生成奖励，再等待一段时间...");
      
      // 再次推进时间
      console.log("再推进时间3小时...");
      await hre.network.provider.send("evm_increaseTime", [10800]); // 3小时
      await hre.network.provider.send("evm_mine");
      
      const pendingReward2 = await contracts.farm.pendingAIH(0, user1.address);
      console.log(`现在的待领取AIH奖励: ${hre.ethers.formatEther(pendingReward2)}`);
      
      if (pendingReward2 == 0) {
        throw new Error("奖励计算可能有问题，未生成任何奖励");
      }
    }
    
    // ======== 第7部分: 收获奖励 ========
    console.log("\n==================== 第7部分: 收获奖励 ====================");
    
    // 收获奖励
    console.log("\n收获AIH奖励...");
    const harvestTx = await contracts.farm.connect(user1).harvest(0);
    await harvestTx.wait();
    console.log("收获操作完成");
    
    // 检查AIH余额
    const aihBalance = await contracts.aihToken.balanceOf(user1.address);
    console.log(`用户1 AIH余额: ${hre.ethers.formatEther(aihBalance)}`);
    
    if (aihBalance == 0) {
      throw new Error("收获操作失败，未收到AIH代币");
    } else {
      console.log("✓ 成功收到AIH奖励");
    }
    
    // ======== 第8部分: 提取质押 ========
    console.log("\n==================== 第8部分: 提取质押 ====================");
    
    // 提取部分质押
    console.log("\n提取部分质押...");
    const withdrawAmount = stakeAmount / 2n; // 提取一半的质押量
    console.log(`提取数量: ${hre.ethers.formatEther(withdrawAmount)} LP代币`);
    
    const withdrawTx = await contracts.farm.connect(user1).withdraw(0, withdrawAmount);
    await withdrawTx.wait();
    console.log("提取操作完成");
    
    // 验证剩余质押量
    const userInfoAfter = await contracts.farm.getUserInfo(0, user1.address);
    console.log("提取后质押数量:", hre.ethers.formatEther(userInfoAfter[0]));
    
    const expectedRemaining = stakeAmount - withdrawAmount;
    const correctRemainingStake = userInfoAfter[0] == expectedRemaining;
    console.log("剩余质押验证:", correctRemainingStake ? "✓ 正确" : "✗ 错误");
    if (!correctRemainingStake) throw new Error("剩余质押量不匹配");
    
    // 验证LP代币返还
    const lpBalanceAfter = await contracts.lpToken.balanceOf(user1.address);
    console.log(`提取后LP代币余额: ${hre.ethers.formatEther(lpBalanceAfter)}`);
    
    const expectedLpBalance = lpBalance - stakeAmount + withdrawAmount;
    const correctLpBalance = lpBalanceAfter == expectedLpBalance;
    console.log("LP代币余额验证:", correctLpBalance ? "✓ 正确" : "✗ 错误");
    if (!correctLpBalance) throw new Error("LP代币余额不匹配");
    
    // ======== 第9部分: 紧急提取测试 ========
    console.log("\n==================== 第9部分: 紧急提取测试 ====================");
    
    // 用户2操作
    console.log("\n用户2质押少量LP代币...");
    
    // 用户2添加流动性获取LP代币
    await (await contracts.tokenA.connect(user2).approve(contracts.routerAddress, hre.ethers.MaxUint256)).wait();
    await (await contracts.tokenB.connect(user2).approve(contracts.routerAddress, hre.ethers.MaxUint256)).wait();
    
    const smallAmount = hre.ethers.parseEther("100");
    await (await contracts.router.connect(user2).addLiquidity(
      contracts.tokenAAddress,
      contracts.tokenBAddress,
      smallAmount,
      smallAmount,
      0,
      0,
      user2.address
    )).wait();
    
    const user2LpBalance = await contracts.lpToken.balanceOf(user2.address);
    console.log(`用户2 LP代币余额: ${hre.ethers.formatEther(user2LpBalance)}`);
    
    // 用户2质押LP代币
    await (await contracts.lpToken.connect(user2).approve(contracts.farmAddress, hre.ethers.MaxUint256)).wait();
    await (await contracts.farm.connect(user2).deposit(0, user2LpBalance)).wait();
    console.log("用户2质押完成");
    
    // 验证用户2质押信息
    const user2Info = await contracts.farm.getUserInfo(0, user2.address);
    console.log(`用户2质押数量: ${hre.ethers.formatEther(user2Info[0])}`);
    
    // 执行紧急提款
    console.log("\n执行紧急提款...");
    const emergencyTx = await contracts.farm.connect(user2).emergencyWithdraw(0);
    await emergencyTx.wait();
    console.log("紧急提款完成");
    
    // 验证提款结果
    const user2LpBalanceAfter = await contracts.lpToken.balanceOf(user2.address);
    console.log(`用户2 LP代币余额: ${hre.ethers.formatEther(user2LpBalanceAfter)}`);
    
    const correctEmergencyWithdraw = user2LpBalanceAfter == user2LpBalance;
    console.log("紧急提款验证:", correctEmergencyWithdraw ? "✓ 正确" : "✗ 错误");
    if (!correctEmergencyWithdraw) throw new Error("紧急提款数量不匹配");
    
    // ======== 第10部分: 更新Farm池分配 ========
    console.log("\n==================== 第10部分: 更新Farm池分配 ====================");
    
    // 测试更新Farm池分配点数
    console.log("\n更新池分配点数...");
    const newAllocPoint = 200; // 新的分配点数
    
    await (await contracts.farm.set(0, newAllocPoint)).wait();
    console.log("更新分配点数完成");
    
    // 验证新的分配点数
    const updatedPoolInfo = await contracts.farm.getPoolInfo(0);
    console.log("更新后的分配点数:", updatedPoolInfo[1].toString());
    
    const correctAllocPoint = updatedPoolInfo[1] == newAllocPoint;
    console.log("分配点数验证:", correctAllocPoint ? "✓ 正确" : "✗ 错误");
    if (!correctAllocPoint) throw new Error("分配点数更新失败");
    
    // ======== 最终测试结果汇总 ========
    console.log("\n==================== 最终测试结果汇总 ====================");
    console.log("✅ 所有合约部署成功");
    console.log("✅ 创建代币对和LP代币成功");
    console.log("✅ 添加LP代币到Farm成功");
    console.log("✅ 质押LP代币功能正常");
    console.log("✅ AIH奖励生成和收获功能正常");
    console.log("✅ 提取质押功能正常");
    console.log("✅ 紧急提款功能正常");
    console.log("✅ 更新Farm池分配功能正常");
    
    console.log("\n系统功能全面验证通过! 可以安全部署到测试网。");
    
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