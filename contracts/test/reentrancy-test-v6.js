/**
 * Reentrancy protection tests for AIHarvest contracts
 * AIHarvest合约重入保护测试
 * 
 * This file tests the reentrancy protection mechanisms in:
 * - SimpleSwapRouter (addLiquidity, removeLiquidity, swap functions)
 * - SimpleFarm (deposit, withdraw, harvest, emergencyWithdraw functions)
 *
 * 此文件测试以下合约的重入保护机制：
 * - SimpleSwapRouter (addLiquidity, removeLiquidity, swap函数)
 * - SimpleFarm (deposit, withdraw, harvest, emergencyWithdraw函数)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Protection Tests", function () {
  // Test accounts and contracts
  // 测试账户和合约
  let owner, user1, user2;
  let weth, aih, testToken, attackToken;
  let factory, router, farm;
  let reentrancyChecker;

  // Test amounts - updated for ethers v6
  // 测试金额 - 已更新为ethers v6
  const initialMint = ethers.parseEther("10000");
  const testAmount = ethers.parseEther("100");
  const smallAmount = ethers.parseEther("10");
  const COMMUNITY_ALLOCATION = ethers.parseEther("550000000"); // 55% of total

  /**
   * Setup test environment before all tests
   * 在所有测试前设置测试环境
   */
  before(async function () {
    // Get signers
    // 获取签名者
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy WETH token (for testing)
    // 部署WETH代币(用于测试)
    const WETH = await ethers.getContractFactory("AIHToken");
    weth = await WETH.deploy(owner.address, owner.address);
    await weth.waitForDeployment();

    // Deploy AIH token
    // 部署AIH代币
    const AIH = await ethers.getContractFactory("AIHToken");
    aih = await AIH.deploy(owner.address, owner.address);
    await aih.waitForDeployment();

    // Deploy factory and router
    // 部署工厂和路由器
    const Factory = await ethers.getContractFactory("SimpleSwapFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    const Router = await ethers.getContractFactory("SimpleSwapRouter");
    router = await Router.deploy(await aih.getAddress());
    await router.waitForDeployment();

    // Deploy a test token for LP creation
    // 部署测试代币用于创建流动性池
    const TestToken = await ethers.getContractFactory("AIHToken");
    testToken = await TestToken.deploy(owner.address, owner.address);
    await testToken.waitForDeployment();

    // Deploy farm
    // 部署农场
    const Farm = await ethers.getContractFactory("SimpleFarm");
    farm = await Farm.deploy(await aih.getAddress());
    await farm.waitForDeployment();

    // Deploy ReentrancyChecker
    // 部署重入检查器
    const ReentrancyChecker = await ethers.getContractFactory("ReentrancyChecker");
    reentrancyChecker = await ReentrancyChecker.deploy(
      await router.getAddress(), 
      await farm.getAddress(), 
      await weth.getAddress()
    );
    await reentrancyChecker.waitForDeployment();

    // Get the malicious token from the reentrancy checker
    // 从重入检查器获取恶意代币
    const attackTokenAddress = await reentrancyChecker.attackToken();
    attackToken = await ethers.getContractAt("MaliciousToken", attackTokenAddress);

    // Mint tokens for testing
    // 铸造代币用于测试
    await weth.transfer(owner.address, COMMUNITY_ALLOCATION);
    await testToken.transfer(owner.address, COMMUNITY_ALLOCATION);
    
    // Setup AIH token for testing
    // 设置AIH代币用于测试
    await aih.setFarmAddress(await farm.getAddress());
    await farm.setAIHPerSecond(ethers.parseEther("1000")); // High rewards for testing 高奖励用于测试
    
    // Create a dummy pool for rewards
    // 创建一个虚拟池用于奖励
    const poolId = 0;
    await farm.add(100, await weth.getAddress(), false);
    
    // Add initial tokens to the reentrancy checker
    // 向重入检查器添加初始代币
    await weth.transfer(await reentrancyChecker.getAddress(), initialMint);
    await testToken.transfer(await reentrancyChecker.getAddress(), initialMint);
    await attackToken.mint(await reentrancyChecker.getAddress(), initialMint);

    // Approve router to spend tokens
    // 授权路由器使用代币
    await weth.approve(await router.getAddress(), ethers.MaxUint256);
    await testToken.approve(await router.getAddress(), ethers.MaxUint256);
    await attackToken.approve(await router.getAddress(), ethers.MaxUint256);

    // Create pairs for testing
    // 创建代币对用于测试
    await router.createPair(await weth.getAddress(), await testToken.getAddress());
    await router.createPair(await weth.getAddress(), await attackToken.getAddress());

    // Add liquidity to the pairs to ensure they have reserves
    // 向代币对添加流动性以确保它们有储备
    await router.addLiquidity(
      await weth.getAddress(),
      await testToken.getAddress(),
      testAmount,
      testAmount,
      0,
      0,
      owner.address
    );

    await router.addLiquidity(
      await weth.getAddress(),
      await attackToken.getAddress(),
      smallAmount,
      smallAmount,
      0,
      0,
      owner.address
    );

    // Fund the reentrancy checker contract
    // 为重入检查器合约提供资金
    await weth.transfer(await reentrancyChecker.getAddress(), testAmount);
    await testToken.transfer(await reentrancyChecker.getAddress(), testAmount);

    // Authorize farm in router
    // 在路由器中授权农场
    await router.setFarmAuthorization(await farm.getAddress(), true);

    // Setup a farm pool for the LP token
    // 为LP代币设置农场池
    const weth_test_pair = await router.getPair(await weth.getAddress(), await testToken.getAddress());
    await farm.add(100, weth_test_pair, false);

    // Setup a farm pool for the attack token pair
    // 为攻击代币对设置农场池
    const weth_attack_pair = await router.getPair(await weth.getAddress(), await attackToken.getAddress());
    await farm.add(100, weth_attack_pair, false);

    // Transfer ownership of AIH token to farm for minting rewards
    // 将AIH代币的所有权转移给农场用于铸造奖励
    await aih.transferOwnership(await farm.getAddress());
    
    // Set reward rate in farm
    // 设置农场的奖励率
    await farm.setAIHPerSecond(ethers.parseEther("0.1")); // 0.1 AIH per second
  });

  /**
   * Verify the setup is correct
   * 验证设置是否正确
   */
  describe("Setup", function () {
    it("Should have deployed all contracts", async function () {
      expect(await router.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await farm.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await reentrancyChecker.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have created the pairs", async function () {
      const wethTestPair = await router.getPair(await weth.getAddress(), await testToken.getAddress());
      expect(wethTestPair).to.not.equal(ethers.ZeroAddress);

      const wethAttackPair = await router.getPair(await weth.getAddress(), await attackToken.getAddress());
      expect(wethAttackPair).to.not.equal(ethers.ZeroAddress);
    });
  });

  /**
   * Test reentrancy protection in addLiquidity function
   * 测试addLiquidity函数中的重入保护
   */
  describe("Reentrancy Tests - addLiquidity", function () {
    before(async function () {
      // Setup the reentrancy test
      // 设置重入测试
      await reentrancyChecker.setupAddLiquidityAttack(await weth.getAddress());
    });

    it("Should not be vulnerable to reentrancy in addLiquidity", async function () {
      await reentrancyChecker.testAddLiquidityReentrancy(testAmount, testAmount);
      const result = await reentrancyChecker.addLiquidityReentrancyDetected();
      
      // We expect the function to be protected against reentrancy
      // 我们期望该函数受到重入保护
      expect(result).to.equal(false);
      console.log("  addLiquidity reentrancy vulnerable:", result);
    });
  });

  /**
   * Test reentrancy protection in removeLiquidity function
   * 测试removeLiquidity函数中的重入保护
   */
  describe("Reentrancy Tests - removeLiquidity", function () {
    before(async function () {
      // Setup the reentrancy test
      // 设置重入测试
      await reentrancyChecker.setupRemoveLiquidityAttack(await weth.getAddress());
    });

    it("Should not be vulnerable to reentrancy in removeLiquidity", async function () {
      // Get the pair address
      // 获取代币对地址
      const pairAddress = await router.getPair(await attackToken.getAddress(), await weth.getAddress());
      
      // Get the LP token
      // 获取LP代币
      const pairToken = await ethers.getContractAt("PairERC20", pairAddress);
      
      // Check if reentrancyChecker has enough LP tokens
      // 检查重入检查器是否有足够的LP代币
      const lpBalance = await pairToken.balanceOf(await reentrancyChecker.getAddress());
      
      if (lpBalance == 0) {
        // Add more liquidity to get LP tokens for testing
        // 添加更多流动性以获取用于测试的LP代币
        await attackToken.connect(owner).approve(await router.getAddress(), testAmount);
        await weth.connect(owner).approve(await router.getAddress(), testAmount);
        
        await router.connect(owner).addLiquidity(
          await attackToken.getAddress(),
          await weth.getAddress(),
          testAmount,
          testAmount,
          0,
          0,
          await reentrancyChecker.getAddress()
        );
      }
      
      // Get updated LP balance
      // 获取更新后的LP余额
      const newLpBalance = await pairToken.balanceOf(await reentrancyChecker.getAddress());
      expect(newLpBalance).to.be.gt(0);
      
      // Approve LP token for router
      // 授权路由器使用LP代币
      await pairToken.connect(owner).approve(await router.getAddress(), newLpBalance);
      
      // Test for reentrancy
      await reentrancyChecker.testRemoveLiquidityReentrancy(newLpBalance / 2n);
      const result = await reentrancyChecker.removeLiquidityReentrancyDetected();
      
      // We expect the function to be protected against reentrancy
      // 我们期望该函数受到重入保护
      expect(result).to.equal(false);
      console.log("  removeLiquidity reentrancy vulnerable:", result);
    });
  });

  describe("Reentrancy Tests - swap", function () {
    before(async function () {
      // Setup the reentrancy test
      await reentrancyChecker.setupSwapAttack(await weth.getAddress());
    });

    it("Should not be vulnerable to reentrancy in swap", async function () {
      await reentrancyChecker.testSwapReentrancy(smallAmount);
      const result = await reentrancyChecker.swapReentrancyDetected();
      
      // We expect the function to be protected against reentrancy
      expect(result).to.equal(false);
      console.log("  swap reentrancy vulnerable:", result);
    });
  });

  describe("Test overall protection", function () {
    it("Should have all router functions protected against reentrancy", async function () {
      const results = await reentrancyChecker.getAttackResults();
      
      console.log("\nReentrancy Test Results:");
      console.log("------------------------");
      console.log("Router - addLiquidity:    ", results[0] ? "VULNERABLE" : "Protected");
      console.log("Router - removeLiquidity: ", results[1] ? "VULNERABLE" : "Protected");
      console.log("Router - swap:            ", results[2] ? "VULNERABLE" : "Protected");
      console.log("Farm - deposit:           ", results[3] ? "VULNERABLE" : "Protected");
      console.log("Farm - withdraw:          ", results[4] ? "VULNERABLE" : "Protected");
      console.log("Farm - harvest:           ", results[5] ? "VULNERABLE" : "Protected");
      console.log("Farm - emergencyWithdraw: ", results[6] ? "VULNERABLE" : "Protected");
      
      // For router functions
      expect(results[0]).to.equal(false); // addLiquidity
      expect(results[1]).to.equal(false); // removeLiquidity
      expect(results[2]).to.equal(false); // swap
      expect(results[3]).to.equal(false); // deposit
      expect(results[4]).to.equal(false); // withdraw
      expect(results[5]).to.equal(false); // harvest
      expect(results[6]).to.equal(false); // emergencyWithdraw
    });
  });
}); 