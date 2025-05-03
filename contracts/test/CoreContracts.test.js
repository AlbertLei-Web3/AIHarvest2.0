/**
 * Tests for AIHarvest core contracts
 * AIHarvest核心合约测试
 * 
 * This file contains tests for the main contracts:
 * - AIHToken
 * - SimpleSwapRouter
 * - SimpleFarm
 * 
 * 此文件包含对主要合约的测试:
 * - AIHToken
 * - SimpleSwapRouter
 * - SimpleFarm
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIHarvest Core Contracts", function () {
  // Test accounts
  // 测试账户
  let owner, teamWallet, ecosystemWallet, user1, user2;
  
  // Contract instances
  // 合约实例
  let aihToken, swapRouter, simpleFarm;
  
  // Test tokens (mock tokens for testing)
  // 测试代币（用于测试的模拟代币）
  let mockTokenA, mockTokenB;
  
  // Constants for testing
  // 测试常量
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const ONE_ETHER = ethers.utils.parseEther("1");
  const TEN_ETHER = ethers.utils.parseEther("10");
  const HUNDRED_ETHER = ethers.utils.parseEther("100");
  
  /**
   * Setup before each test
   * 每个测试前的设置
   */
  beforeEach(async function () {
    // Get test accounts
    // 获取测试账户
    [owner, teamWallet, ecosystemWallet, user1, user2] = await ethers.getSigners();
    
    // Deploy AIHToken
    // 部署AIHToken
    const AIHToken = await ethers.getContractFactory("AIHToken");
    aihToken = await AIHToken.deploy(teamWallet.address, ecosystemWallet.address);
    await aihToken.deployed();
    
    // Deploy SimpleSwapRouter
    // 部署SimpleSwapRouter
    const SimpleSwapRouter = await ethers.getContractFactory("SimpleSwapRouter");
    swapRouter = await SimpleSwapRouter.deploy(aihToken.address);
    await swapRouter.deployed();
    
    // Deploy SimpleFarm
    // 部署SimpleFarm
    const SimpleFarm = await ethers.getContractFactory("SimpleFarm");
    simpleFarm = await SimpleFarm.deploy(aihToken.address);
    await simpleFarm.deployed();
    
    // Set farm address in token contract
    // 在代币合约中设置农场地址
    await aihToken.setFarmAddress(simpleFarm.address);
    
    // Deploy mock tokens for testing
    // 部署用于测试的模拟代币
    const MockToken = await ethers.getContractFactory("AIHToken"); // Using AIHToken as a mock token
    mockTokenA = await MockToken.deploy(teamWallet.address, ecosystemWallet.address);
    await mockTokenA.deployed();
    mockTokenB = await MockToken.deploy(teamWallet.address, ecosystemWallet.address);
    await mockTokenB.deployed();
  });
  
  /**
   * Tests for AIHToken functionality
   * AIHToken功能测试
   */
  describe("AIHToken", function () {
    it("Should have correct name, symbol and decimals", async function () {
      expect(await aihToken.name()).to.equal("AIHarvest Token");
      expect(await aihToken.symbol()).to.equal("AIH");
      expect(await aihToken.decimals()).to.equal(18);
    });
    
    it("Should mint community allocation to the owner", async function () {
      const communityAllocation = await aihToken.COMMUNITY_ALLOCATION();
      expect(await aihToken.balanceOf(owner.address)).to.equal(communityAllocation);
    });
    
    it("Should set the farm address correctly", async function () {
      expect(await aihToken.farmAddress()).to.equal(simpleFarm.address);
    });
    
    it("Should not allow setting farm address twice", async function () {
      await expect(aihToken.setFarmAddress(user1.address))
        .to.be.revertedWith("Farm address already set");
    });
  });
  
  /**
   * Tests for SimpleSwapRouter functionality
   * SimpleSwapRouter功能测试
   */
  describe("SimpleSwapRouter", function () {
    it("Should be initialized with correct AIH token", async function () {
      expect(await swapRouter.aihToken()).to.equal(aihToken.address);
    });
    
    it("Should create a pair", async function () {
      const tokenAAddress = mockTokenA.address;
      const tokenBAddress = mockTokenB.address;
      
      await swapRouter.createPair(tokenAAddress, tokenBAddress);
      
      const pairAddress = await swapRouter.getPair(tokenAAddress, tokenBAddress);
      expect(pairAddress).to.not.equal(ZERO_ADDRESS);
    });
    
    it("Should set fee collector correctly", async function () {
      await swapRouter.setFeeCollector(user1.address);
      expect(await swapRouter.feeCollector()).to.equal(user1.address);
    });
  });
  
  /**
   * Tests for SimpleFarm functionality
   * SimpleFarm功能测试
   */
  describe("SimpleFarm", function () {
    it("Should be initialized with correct AIH token", async function () {
      expect(await simpleFarm.aihToken()).to.equal(aihToken.address);
    });
    
    it("Should add a pool", async function () {
      const mockLPTokenAddress = mockTokenA.address;
      await simpleFarm.add(100, mockTokenA.address, false);
      
      expect(await simpleFarm.poolLength()).to.equal(1);
      
      const poolInfo = await simpleFarm.getPoolInfo(0);
      expect(poolInfo.lpToken).to.equal(mockLPTokenAddress); // lpToken
      expect(poolInfo.allocPoint).to.equal(100); // allocPoint
    });
    
    it("Should update pool allocation points", async function () {
      const mockLPTokenAddress = mockTokenA.address;
      await simpleFarm.add(100, mockTokenA.address, false);
      
      await simpleFarm.set(0, 200, false);
      
      const poolInfo = await simpleFarm.getPoolInfo(0);
      expect(poolInfo.allocPoint).to.equal(200); // allocPoint
    });
  });
  
  /**
   * Tests for interactions between contracts
   * 合约间交互测试
   */
  describe("Contract Interactions", function () {
    it("Should allow farm to mint tokens", async function () {
      // Only farm can mint tokens
      // 只有农场可以铸造代币
      const initialSupply = await aihToken.totalSupply();
      
      // Fund the farm address with some ETH for gas
      // 为农场地址提供一些ETH用于支付gas
      await network.provider.send("hardhat_setBalance", [
        simpleFarm.address,
        "0x1000000000000000000", // 1 ETH
      ]);

      // Impersonate the farm contract to mint tokens
      // 模拟农场合约铸造代币
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [simpleFarm.address],
      });
      
      const farmSigner = await ethers.provider.getSigner(simpleFarm.address);
      await aihToken.connect(farmSigner).mint(user1.address, ONE_ETHER);
      
      // Stop impersonating
      // 停止模拟
      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [simpleFarm.address],
      });
      
      expect(await aihToken.balanceOf(user1.address)).to.equal(ONE_ETHER);
      expect(await aihToken.totalSupply()).to.equal(initialSupply.add(ONE_ETHER));
    });
  });
}); 