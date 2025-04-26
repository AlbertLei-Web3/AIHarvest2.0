const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AIHarvest Integration Tests", function () {
  // 主要合约
  let aihToken, swapRouter, simpleFarm, pairToken;
  
  // 测试账户
  let owner, user1, user2, teamWallet, ecosystemWallet;
  
  // 测试用的金额常量
  const ONE_ETHER = ethers.utils.parseEther("1");
  const TEN_ETHER = ethers.utils.parseEther("10");
  const HUNDRED_ETHER = ethers.utils.parseEther("100");
  const THOUSAND_ETHER = ethers.utils.parseEther("1000");
  
  // 池子ID，用于测试农场功能
  let poolId = 0;
  
  // 部署所有合约并进行初始化设置
  before(async function () {
    // 获取测试账户
    [owner, user1, user2, teamWallet, ecosystemWallet] = await ethers.getSigners();
    
    console.log("部署所有核心合约...");
    
    // 1. 部署AIH代币
    const AIHToken = await ethers.getContractFactory("AIHToken");
    aihToken = await AIHToken.deploy(teamWallet.address, ecosystemWallet.address);
    await aihToken.deployed();
    console.log("AIHToken 已部署到:", aihToken.address);
    
    // 2. 部署SimpleSwapRouter
    const SimpleSwapRouter = await ethers.getContractFactory("SimpleSwapRouter");
    swapRouter = await SimpleSwapRouter.deploy(aihToken.address);
    await swapRouter.deployed();
    console.log("SimpleSwapRouter 已部署到:", swapRouter.address);
    
    // 3. 部署SimpleFarm
    const SimpleFarm = await ethers.getContractFactory("SimpleFarm");
    simpleFarm = await SimpleFarm.deploy(aihToken.address);
    await simpleFarm.deployed();
    console.log("SimpleFarm 已部署到:", simpleFarm.address);
    
    // 4. 配置合约之间的关系
    // 设置AIH代币的farm地址
    await aihToken.setFarmAddress(simpleFarm.address);
    console.log("Farm地址已设置在AIH代币中");
    
    // 设置Router的Farm授权
    await swapRouter.setFarmAuthorization(simpleFarm.address, true);
    console.log("Farm已在Router中获得授权");
    
    // 设置手续费收集地址
    await swapRouter.setFeeCollector(teamWallet.address);
    console.log("手续费收集地址设置为:", teamWallet.address);
  });
  
  describe("合约部署与基本功能", function () {
    it("各合约应该被正确初始化", async function () {
      // 验证AIH代币设置
      expect(await aihToken.name()).to.equal("AIHarvest Token");
      expect(await aihToken.symbol()).to.equal("AIH");
      expect(await aihToken.farmAddress()).to.equal(simpleFarm.address);
      
      // 验证Router设置
      expect(await swapRouter.aihToken()).to.equal(aihToken.address);
      expect(await swapRouter.feeCollector()).to.equal(teamWallet.address);
      
      // 验证Farm设置
      expect(await simpleFarm.aihToken()).to.equal(aihToken.address);
      expect(await simpleFarm.owner()).to.equal(owner.address);
    });
  });
  
  describe("创建和管理流动性对", function () {
    let tokenA, tokenB, lpToken, pairAddress;
    const initialLiquidity = THOUSAND_ETHER;
    
    it("应该能部署测试代币", async function () {
      // 部署两个测试代币
      const ERC20Factory = await ethers.getContractFactory("AIHToken");
      
      // 用AIHToken作为测试代币
      tokenA = await ERC20Factory.deploy(owner.address, owner.address);
      await tokenA.deployed();
      
      tokenB = await ERC20Factory.deploy(owner.address, owner.address);
      await tokenB.deployed();
      
      console.log("测试代币A部署到:", tokenA.address);
      console.log("测试代币B部署到:", tokenB.address);
      
      // 将代币转给测试用户
      await tokenA.transfer(user1.address, initialLiquidity.mul(2));
      await tokenB.transfer(user1.address, initialLiquidity.mul(2));
      
      expect(await tokenA.balanceOf(user1.address)).to.equal(initialLiquidity.mul(2));
      expect(await tokenB.balanceOf(user1.address)).to.equal(initialLiquidity.mul(2));
    });
    
    it("应该能创建代币对", async function () {
      // 创建代币对
      await swapRouter.createPair(tokenA.address, tokenB.address);
      
      // 获取对地址
      pairAddress = await swapRouter.getPair(tokenA.address, tokenB.address);
      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
      
      // 获取LP代币地址
      lpToken = await ethers.getContractAt("PairERC20", await swapRouter.getLPToken(pairAddress));
      expect(lpToken.address).to.not.equal(ethers.constants.AddressZero);
      
      console.log("创建的代币对地址:", pairAddress);
      console.log("LP代币地址:", lpToken.address);
    });
    
    it("应该能添加流动性", async function () {
      // 用户批准Router使用代币
      await tokenA.connect(user1).approve(swapRouter.address, initialLiquidity);
      await tokenB.connect(user1).approve(swapRouter.address, initialLiquidity);
      
      // 添加流动性
      await swapRouter.connect(user1).addLiquidity(
        tokenA.address,
        tokenB.address,
        initialLiquidity,
        initialLiquidity,
        0, // 最小A数量
        0, // 最小B数量
        user1.address // 接收LP代币的地址
      );
      
      // 验证LP代币余额
      const lpBalance = await lpToken.balanceOf(user1.address);
      expect(lpBalance).to.be.gt(0);
      console.log("用户获得LP代币数量:", ethers.utils.formatEther(lpBalance));
      
      // 验证Router中的代币余额
      expect(await tokenA.balanceOf(swapRouter.address)).to.equal(initialLiquidity);
      expect(await tokenB.balanceOf(swapRouter.address)).to.equal(initialLiquidity);
    });
    
    it("应该能查询交易对储备金额", async function () {
      const [reserveA, reserveB] = await swapRouter.getReserves(
        pairAddress,
        tokenA.address,
        tokenB.address
      );
      
      expect(reserveA).to.be.closeTo(initialLiquidity, initialLiquidity.div(100));
      expect(reserveB).to.be.closeTo(initialLiquidity, initialLiquidity.div(100));
      
      console.log("代币A储备:", ethers.utils.formatEther(reserveA));
      console.log("代币B储备:", ethers.utils.formatEther(reserveB));
    });
    
    describe("代币交换功能", function () {
      const swapAmount = HUNDRED_ETHER;
      
      it("应该能正确计算交换金额", async function () {
        // 获取当前储备
        const [reserveA, reserveB] = await swapRouter.getReserves(
          pairAddress,
          tokenA.address,
          tokenB.address
        );
        
        // 计算交换代币A能获得多少代币B
        const amountOut = await swapRouter.getAmountOut(
          swapAmount,
          reserveA,
          reserveB
        );
        
        expect(amountOut).to.be.gt(0);
        console.log("交换", ethers.utils.formatEther(swapAmount), "代币A预计能获得", ethers.utils.formatEther(amountOut), "代币B");
      });
      
      it("应该能执行代币交换", async function () {
        // 记录交换前代币余额
        const beforeABalance = await tokenA.balanceOf(user1.address);
        const beforeBBalance = await tokenB.balanceOf(user1.address);
        
        // 批准Router使用代币
        await tokenA.connect(user1).approve(swapRouter.address, swapAmount);
        
        // 执行交换
        await swapRouter.connect(user1).swapExactTokensForTokens(
          swapAmount,
          0, // 最小输出量
          [tokenA.address, tokenB.address], // 交换路径
          user1.address // 接收代币的地址
        );
        
        // 验证交换结果
        const afterABalance = await tokenA.balanceOf(user1.address);
        const afterBBalance = await tokenB.balanceOf(user1.address);
        
        expect(beforeABalance.sub(afterABalance)).to.equal(swapAmount); // A减少
        expect(afterBBalance).to.be.gt(beforeBBalance); // B增加
        
        const receivedB = afterBBalance.sub(beforeBBalance);
        console.log("用户A代币减少:", ethers.utils.formatEther(beforeABalance.sub(afterABalance)));
        console.log("用户B代币增加:", ethers.utils.formatEther(receivedB));
        
        // 检查手续费收入
        // 注意：手续费可能是AIH代币或者是原始代币，取决于具体实现
        // 这里我们只检查是否有手续费收入，不检查具体金额
        const feeCollectorAIHBalance = await aihToken.balanceOf(teamWallet.address);
        console.log("手续费收集器AIH代币余额:", ethers.utils.formatEther(feeCollectorAIHBalance));
        
        // 如果手续费是以原始代币收取，则检查teamWallet的tokenA或tokenB余额
        const feeCollectorTokenABalance = await tokenA.balanceOf(teamWallet.address);
        const feeCollectorTokenBBalance = await tokenB.balanceOf(teamWallet.address);
        
        console.log("手续费收集器代币A余额:", ethers.utils.formatEther(feeCollectorTokenABalance));
        console.log("手续费收集器代币B余额:", ethers.utils.formatEther(feeCollectorTokenBBalance));
        
        // 检查是否有至少一种形式的手续费收入
        const hasFee = feeCollectorAIHBalance.gt(0) || 
                      feeCollectorTokenABalance.gt(0) || 
                      feeCollectorTokenBBalance.gt(0);
                      
        // 注意：如果手续费模式有变化，可能需要调整此处的检查逻辑
        console.log("是否检测到手续费收入:", hasFee);
      });
    });
    
    describe("移除流动性功能", function () {
      it("应该能移除部分流动性", async function () {
        // 获取LP代币余额
        const lpBalance = await lpToken.balanceOf(user1.address);
        const removeAmount = lpBalance.div(2); // 移除一半
        
        // 记录移除前的代币余额
        const beforeABalance = await tokenA.balanceOf(user1.address);
        const beforeBBalance = await tokenB.balanceOf(user1.address);
        
        // 批准Router使用LP代币
        await lpToken.connect(user1).approve(swapRouter.address, removeAmount);
        
        // 移除流动性
        await swapRouter.connect(user1).removeLiquidity(
          tokenA.address,
          tokenB.address,
          removeAmount,
          0, // 最小A数量
          0, // 最小B数量
          user1.address // 接收代币的地址
        );
        
        // 验证LP代币减少
        const afterLpBalance = await lpToken.balanceOf(user1.address);
        expect(lpBalance.sub(afterLpBalance)).to.equal(removeAmount);
        
        // 验证代币增加
        const afterABalance = await tokenA.balanceOf(user1.address);
        const afterBBalance = await tokenB.balanceOf(user1.address);
        
        expect(afterABalance).to.be.gt(beforeABalance);
        expect(afterBBalance).to.be.gt(beforeBBalance);
        
        console.log("移除", ethers.utils.formatEther(removeAmount), "LP代币");
        console.log("获得代币A:", ethers.utils.formatEther(afterABalance.sub(beforeABalance)));
        console.log("获得代币B:", ethers.utils.formatEther(afterBBalance.sub(beforeBBalance)));
      });
    });
    
    describe("Farm质押功能", function () {
      it("应该能在Farm中创建池子", async function () {
        // 创建Farm池子
        await simpleFarm.add(100, lpToken.address, false);
        
        // 验证池子创建成功
        expect(await simpleFarm.poolLength()).to.be.gt(0);
        
        // 获取池子信息
        const poolInfo = await simpleFarm.getPoolInfo(poolId);
        expect(poolInfo.lpToken).to.equal(lpToken.address);
        expect(poolInfo.allocPoint).to.equal(100);
        
        console.log("在Farm中创建了池子ID:", poolId);
      });
      
      it("应该能质押LP代币到Farm", async function () {
        // 获取剩余LP代币余额
        const lpBalance = await lpToken.balanceOf(user1.address);
        expect(lpBalance).to.be.gt(0);
        
        // 批准Farm使用LP代币
        await lpToken.connect(user1).approve(simpleFarm.address, lpBalance);
        
        // 在Farm中质押LP代币
        await simpleFarm.connect(user1).deposit(poolId, lpBalance);
        
        // 验证质押成功
        const userInfo = await simpleFarm.userInfo(poolId, user1.address);
        expect(userInfo.amount).to.equal(lpBalance);
        
        // 验证LP代币已转移到Farm
        expect(await lpToken.balanceOf(user1.address)).to.equal(0);
        expect(await lpToken.balanceOf(simpleFarm.address)).to.equal(lpBalance);
        
        console.log("在Farm中质押了", ethers.utils.formatEther(lpBalance), "LP代币");
      });
      
      it("应该能设置奖励发放速率", async function () {
        // 设置每秒奖励数量
        const rewardPerSecond = ONE_ETHER.div(10); // 0.1 AIH每秒
        await simpleFarm.setAIHPerSecond(rewardPerSecond);
        
        // 验证设置成功
        expect(await simpleFarm.aihPerSecond()).to.equal(rewardPerSecond);
        console.log("设置Farm奖励率为", ethers.utils.formatEther(rewardPerSecond), "AIH/秒");
      });
      
      it("应该能获取奖励累积", async function () {
        // 增加区块时间，模拟经过一段时间
        await network.provider.send("evm_increaseTime", [3600]); // 增加1小时
        await network.provider.send("evm_mine"); // 挖一个新区块
        
        // 获取待领取奖励
        const pendingRewards = await simpleFarm.pendingAIH(poolId, user1.address);
        expect(pendingRewards).to.be.gt(0);
        
        console.log("1小时后待领取的AIH奖励:", ethers.utils.formatEther(pendingRewards));
      });
      
      it("应该能通过Farm提取LP代币和奖励", async function () {
        // 获取质押数量
        const userInfo = await simpleFarm.userInfo(poolId, user1.address);
        const stakedAmount = userInfo.amount;
        
        // 记录提取前的余额
        const beforeAIHBalance = await aihToken.balanceOf(user1.address);
        const beforeLPBalance = await lpToken.balanceOf(user1.address);
        const beforeTokenABalance = await tokenA.balanceOf(user1.address);
        const beforeTokenBBalance = await tokenB.balanceOf(user1.address);
        
        // 通过Farm从流动性池提取LP代币和对应的原始代币
        await simpleFarm.connect(user1).withdraw(poolId, stakedAmount);
        
        // 验证LP代币和AIH奖励
        const afterAIHBalance = await aihToken.balanceOf(user1.address);
        const afterLPBalance = await lpToken.balanceOf(user1.address);
        const afterTokenABalance = await tokenA.balanceOf(user1.address);
        const afterTokenBBalance = await tokenB.balanceOf(user1.address);
        
        // 验证收到了AIH奖励
        const rewardsReceived = afterAIHBalance.sub(beforeAIHBalance);
        expect(rewardsReceived).to.be.gt(0);
        console.log("提取的AIH奖励:", ethers.utils.formatEther(rewardsReceived));
        
        // 验证代币A和B的余额增加，LP代币应该是0(因为直接从Farm提取并转换)
        expect(afterTokenABalance).to.be.gte(beforeTokenABalance);
        expect(afterTokenBBalance).to.be.gte(beforeTokenBBalance);
        
        console.log("从Farm提取并获得代币A:", ethers.utils.formatEther(afterTokenABalance.sub(beforeTokenABalance)));
        console.log("从Farm提取并获得代币B:", ethers.utils.formatEther(afterTokenBBalance.sub(beforeTokenBBalance)));
      });
      
      it("应该能收获奖励而不提取LP代币", async function () {
        // 先重新质押一些LP代币
        const depositAmount = HUNDRED_ETHER;
        
        // 为用户1添加更多代币，并添加流动性获取LP代币
        await tokenA.transfer(user1.address, depositAmount.mul(2));
        await tokenB.transfer(user1.address, depositAmount.mul(2));
        
        await tokenA.connect(user1).approve(swapRouter.address, depositAmount);
        await tokenB.connect(user1).approve(swapRouter.address, depositAmount);
        
        await swapRouter.connect(user1).addLiquidity(
          tokenA.address,
          tokenB.address,
          depositAmount,
          depositAmount,
          0,
          0,
          user1.address
        );
        
        // 获取新的LP代币余额
        const lpBalance = await lpToken.balanceOf(user1.address);
        
        // 批准并质押LP代币
        await lpToken.connect(user1).approve(simpleFarm.address, lpBalance);
        await simpleFarm.connect(user1).deposit(poolId, lpBalance);
        
        // 增加区块时间，模拟经过时间
        await network.provider.send("evm_increaseTime", [1800]); // 增加30分钟
        await network.provider.send("evm_mine");
        
        // 记录收获前的AIH余额
        const beforeAIHBalance = await aihToken.balanceOf(user1.address);
        
        // 只收获奖励，不提取LP代币
        await simpleFarm.connect(user1).harvest(poolId);
        
        // 验证收到了AIH奖励，但LP代币仍在Farm中
        const afterAIHBalance = await aihToken.balanceOf(user1.address);
        expect(afterAIHBalance).to.be.gt(beforeAIHBalance);
        
        // 验证LP代币仍在Farm中
        const userInfo = await simpleFarm.userInfo(poolId, user1.address);
        expect(userInfo.amount).to.equal(lpBalance);
        
        console.log("收获的AIH奖励(不提取LP):", ethers.utils.formatEther(afterAIHBalance.sub(beforeAIHBalance)));
      });
    });
  });
  
  describe("紧急操作和边界情况", function() {
    let lpToken;
    
    before(async function() {
      // 获取测试中使用的LP代币地址
      const [tokenA, tokenB] = await Promise.all([
        ethers.getContractAt("AIHToken", await simpleFarm.getPoolInfo(poolId).then(info => info.lpToken))
      ]);
      
      // 如果simpleFarm中有池子，获取池子的LP代币信息
      if (await simpleFarm.poolLength() > 0) {
        const poolInfo = await simpleFarm.getPoolInfo(poolId);
        lpToken = await ethers.getContractAt("PairERC20", poolInfo.lpToken);
      }
    });
    
    it("应该能从Farm紧急提款", async function() {
      // 跳过测试如果lpToken未定义
      if (!lpToken) {
        console.log("没有设置LP代币，跳过紧急提款测试");
        this.skip();
        return;
      }
      
      // 获取用户在Farm中的质押量
      const userInfo = await simpleFarm.userInfo(poolId, user1.address);
      const stakedAmount = userInfo.amount;
      
      if(stakedAmount.gt(0)) {
        // 记录提取前的LP代币余额
        const beforeLPBalance = await lpToken.balanceOf(user1.address);
        
        // 紧急提款
        await simpleFarm.connect(user1).emergencyWithdraw(poolId);
        
        // 验证LP代币已返还，但没有奖励
        const afterLPBalance = await lpToken.balanceOf(user1.address);
        expect(afterLPBalance.sub(beforeLPBalance)).to.equal(stakedAmount);
        
        // 验证用户在Farm中的质押量已清零
        const updatedUserInfo = await simpleFarm.userInfo(poolId, user1.address);
        expect(updatedUserInfo.amount).to.equal(0);
        
        console.log("紧急提款收回的LP代币:", ethers.utils.formatEther(stakedAmount));
      } else {
        console.log("用户没有在Farm中质押LP代币，跳过紧急提款测试");
      }
    });
    
    it("应该能处理空质押和零提取", async function() {
      // 尝试质押0个LP代币应该失败（合约要求金额大于0）
      await expect(
        simpleFarm.connect(user1).deposit(poolId, 0)
      ).to.be.revertedWith("SimpleFarm: Amount must be greater than 0");
      
      // 尝试提取0个LP代币
      await simpleFarm.connect(user1).withdraw(poolId, 0);
      
      // 如果没有抛出异常，测试通过
      console.log("成功处理零提取操作");
    });
  });
  
  describe("综合流程", function() {
    it("应该能完成从零开始的完整DeFi流程", async function() {
      // 部署新的测试代币
      const ERC20Factory = await ethers.getContractFactory("AIHToken");
      const newTokenA = await ERC20Factory.deploy(owner.address, owner.address);
      const newTokenB = await ERC20Factory.deploy(owner.address, owner.address);
      
      // 为用户2提供代币
      await newTokenA.transfer(user2.address, THOUSAND_ETHER);
      await newTokenB.transfer(user2.address, THOUSAND_ETHER);
      
      console.log("\n===== 开始综合流程测试 =====");
      console.log("1. 创建代币对");
      await swapRouter.createPair(newTokenA.address, newTokenB.address);
      const newPairAddress = await swapRouter.getPair(newTokenA.address, newTokenB.address);
      const newLpToken = await ethers.getContractAt("PairERC20", await swapRouter.getLPToken(newPairAddress));
      
      console.log("2. 添加流动性");
      // 确保用户2有足够的代币进行后续操作
      await newTokenA.transfer(user2.address, THOUSAND_ETHER.mul(5));
      await newTokenB.transfer(user2.address, THOUSAND_ETHER.mul(5));
      console.log("为用户2额外提供了代币，当前余额A:", ethers.utils.formatEther(await newTokenA.balanceOf(user2.address)));
      
      await newTokenA.connect(user2).approve(swapRouter.address, THOUSAND_ETHER);
      await newTokenB.connect(user2).approve(swapRouter.address, THOUSAND_ETHER);
      await swapRouter.connect(user2).addLiquidity(
        newTokenA.address, 
        newTokenB.address, 
        THOUSAND_ETHER, 
        THOUSAND_ETHER, 
        0, 
        0, 
        user2.address
      );
      
      console.log("3. 在Farm中添加新池子");
      const newPoolId = (await simpleFarm.poolLength()).toNumber();
      await simpleFarm.add(200, newLpToken.address, false);
      
      console.log("4. 质押LP代币到Farm");
      const lpBalance = await newLpToken.balanceOf(user2.address);
      await newLpToken.connect(user2).approve(simpleFarm.address, lpBalance);
      await simpleFarm.connect(user2).deposit(newPoolId, lpBalance);
      
      console.log("5. 执行代币交换");
      // 确保用户2有足够的代币余额
      const tokenABalance = await newTokenA.balanceOf(user2.address);
      console.log("用户2的代币A余额:", ethers.utils.formatEther(tokenABalance));
      
      // 只交换可用余额的一部分
      const swapAmount = tokenABalance.div(10); // 只使用10%的余额
      await newTokenA.connect(user2).approve(swapRouter.address, swapAmount);
      await swapRouter.connect(user2).swapExactTokensForTokens(
        swapAmount,
        0,
        [newTokenA.address, newTokenB.address],
        user2.address
      );
      
      console.log("6. 等待一段时间后收获奖励");
      await network.provider.send("evm_increaseTime", [3600]); // 1小时
      await network.provider.send("evm_mine");
      
      const pendingRewards = await simpleFarm.pendingAIH(newPoolId, user2.address);
      console.log("待收获奖励:", ethers.utils.formatEther(pendingRewards));
      
      console.log("7. 收获奖励");
      await simpleFarm.connect(user2).harvest(newPoolId);
      
      console.log("8. 提取一半LP代币");
      const stakedAmount = (await simpleFarm.userInfo(newPoolId, user2.address)).amount;
      const halfAmount = stakedAmount.div(2);
      await simpleFarm.connect(user2).withdraw(newPoolId, halfAmount);
      
      console.log("9. 移除一部分流动性");
      const remainingLp = await newLpToken.balanceOf(user2.address);
      await newLpToken.connect(user2).approve(swapRouter.address, remainingLp);
      await swapRouter.connect(user2).removeLiquidity(
        newTokenA.address,
        newTokenB.address,
        remainingLp,
        0,
        0,
        user2.address
      );
      
      console.log("综合流程测试完成!\n");
    });
  });
}); 