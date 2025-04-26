const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Protection Tests", function () {
  let owner, user1, user2;
  let weth, aih, testToken, attackToken;
  let factory, router, farm;
  let reentrancyChecker;

  // Test amounts
  const initialMint = ethers.utils.parseEther("10000");
  const testAmount = ethers.utils.parseEther("100");
  const smallAmount = ethers.utils.parseEther("10");
  const COMMUNITY_ALLOCATION = ethers.utils.parseEther("550000000"); // 55% of total

  before(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy WETH token (for testing)
    const WETH = await ethers.getContractFactory("AIHToken");
    weth = await WETH.deploy(owner.address, owner.address);
    await weth.deployed();

    // Deploy AIH token
    const AIH = await ethers.getContractFactory("AIHToken");
    aih = await AIH.deploy(owner.address, owner.address);
    await aih.deployed();

    // Deploy factory and router
    const Factory = await ethers.getContractFactory("SimpleSwapFactory");
    factory = await Factory.deploy();
    await factory.deployed();

    const Router = await ethers.getContractFactory("SimpleSwapRouter");
    router = await Router.deploy(aih.address);
    await router.deployed();

    // Deploy a test token for LP creation
    const TestToken = await ethers.getContractFactory("AIHToken");
    testToken = await TestToken.deploy(owner.address, owner.address);
    await testToken.deployed();

    // Deploy farm
    const Farm = await ethers.getContractFactory("SimpleFarm");
    farm = await Farm.deploy(aih.address);
    await farm.deployed();

    // Deploy ReentrancyChecker
    const ReentrancyChecker = await ethers.getContractFactory("ReentrancyChecker");
    reentrancyChecker = await ReentrancyChecker.deploy(router.address, farm.address, weth.address);
    await reentrancyChecker.deployed();

    // Get the malicious token from the reentrancy checker
    const attackTokenAddress = await reentrancyChecker.attackToken();
    attackToken = await ethers.getContractAt("MaliciousToken", attackTokenAddress);

    // Mint tokens for testing
    await weth.transfer(owner.address, COMMUNITY_ALLOCATION);
    await testToken.transfer(owner.address, COMMUNITY_ALLOCATION);
    
    // Setup AIH token for testing
    await aih.setFarmAddress(farm.address);
    await farm.setAIHPerSecond(ethers.utils.parseEther("1000")); // High rewards for testing
    
    // Create a dummy pool for rewards
    const poolId = 0;
    await farm.add(100, weth.address, false);
    
    // Add initial tokens to the reentrancy checker
    await weth.transfer(reentrancyChecker.address, initialMint);
    await testToken.transfer(reentrancyChecker.address, initialMint);
    await attackToken.mint(reentrancyChecker.address, initialMint);

    // Approve router to spend tokens
    await weth.approve(router.address, ethers.constants.MaxUint256);
    await testToken.approve(router.address, ethers.constants.MaxUint256);
    await attackToken.approve(router.address, ethers.constants.MaxUint256);

    // Create pairs for testing
    await router.createPair(weth.address, testToken.address);
    await router.createPair(weth.address, attackToken.address);

    // Add liquidity to the pairs to ensure they have reserves
    await router.addLiquidity(
      weth.address,
      testToken.address,
      testAmount,
      testAmount,
      0,
      0,
      owner.address
    );

    await router.addLiquidity(
      weth.address,
      attackToken.address,
      smallAmount,
      smallAmount,
      0,
      0,
      owner.address
    );

    // Fund the reentrancy checker contract
    await weth.transfer(reentrancyChecker.address, testAmount);
    await testToken.transfer(reentrancyChecker.address, testAmount);

    // Authorize farm in router
    await router.setFarmAuthorization(farm.address, true);

    // Setup a farm pool for the LP token
    const weth_test_pair = await router.getPair(weth.address, testToken.address);
    await farm.add(100, weth_test_pair, false);

    // Setup a farm pool for the attack token pair
    const weth_attack_pair = await router.getPair(weth.address, attackToken.address);
    await farm.add(100, weth_attack_pair, false);

    // Transfer ownership of AIH token to farm for minting rewards
    await aih.transferOwnership(farm.address);
    
    // Set reward rate in farm
    await farm.setAIHPerSecond(ethers.utils.parseEther("0.1")); // 0.1 AIH per second
  });

  describe("Setup", function () {
    it("Should have deployed all contracts", async function () {
      expect(router.address).to.not.equal(ethers.constants.AddressZero);
      expect(farm.address).to.not.equal(ethers.constants.AddressZero);
      expect(reentrancyChecker.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should have created the pairs", async function () {
      const wethTestPair = await router.getPair(weth.address, testToken.address);
      expect(wethTestPair).to.not.equal(ethers.constants.AddressZero);

      const wethAttackPair = await router.getPair(weth.address, attackToken.address);
      expect(wethAttackPair).to.not.equal(ethers.constants.AddressZero);
    });
  });

  describe("Reentrancy Tests - addLiquidity", function () {
    before(async function () {
      // Setup the reentrancy test
      await reentrancyChecker.setupAddLiquidityAttack(weth.address);
    });

    it("Should not be vulnerable to reentrancy in addLiquidity", async function () {
      await reentrancyChecker.testAddLiquidityReentrancy(testAmount, testAmount);
      const result = await reentrancyChecker.addLiquidityReentrancyDetected();
      
      // We expect the function to be protected against reentrancy
      expect(result).to.equal(false);
      console.log("  addLiquidity reentrancy vulnerable:", result);
    });
  });

  describe("Reentrancy Tests - removeLiquidity", function () {
    before(async function () {
      // Setup the reentrancy test
      await reentrancyChecker.setupRemoveLiquidityAttack(weth.address);
    });

    it("Should not be vulnerable to reentrancy in removeLiquidity", async function () {
      // Get the pair address
      const pairAddress = await router.getPair(attackToken.address, weth.address);
      
      // Get the LP token
      const pairToken = await ethers.getContractAt("PairERC20", pairAddress);
      
      // Check if reentrancyChecker has enough LP tokens
      const lpBalance = await pairToken.balanceOf(reentrancyChecker.address);
      
      if (lpBalance.eq(0)) {
        // Add more liquidity to get LP tokens for testing
        await attackToken.connect(owner).approve(router.address, testAmount);
        await weth.connect(owner).approve(router.address, testAmount);
        
        await router.connect(owner).addLiquidity(
          attackToken.address,
          weth.address,
          testAmount,
          testAmount,
          0,
          0,
          reentrancyChecker.address
        );
      }
      
      // Get updated LP balance
      const newLpBalance = await pairToken.balanceOf(reentrancyChecker.address);
      expect(newLpBalance).to.be.gt(0);
      
      // Approve LP token for router
      await pairToken.connect(owner).approve(router.address, newLpBalance);
      
      // Test for reentrancy
      await reentrancyChecker.testRemoveLiquidityReentrancy(newLpBalance.div(2));
      const result = await reentrancyChecker.removeLiquidityReentrancyDetected();
      
      // We expect the function to be protected against reentrancy
      expect(result).to.equal(false);
      console.log("  removeLiquidity reentrancy vulnerable:", result);
    });
  });

  describe("Reentrancy Tests - swap", function () {
    before(async function () {
      // Setup the reentrancy test
      await reentrancyChecker.setupSwapAttack(weth.address);
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
      
      // For router functions
      expect(results[0]).to.equal(false); // addLiquidity
      expect(results[1]).to.equal(false); // removeLiquidity
      expect(results[2]).to.equal(false); // swap
    });
  });
}); 