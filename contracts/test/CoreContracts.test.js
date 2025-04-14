const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIHarvest Core Contracts", function () {
  // Test accounts
  let owner, teamWallet, ecosystemWallet, user1, user2;
  
  // Contract instances
  let aihToken, swapRouter, simpleFarm;
  
  // Test tokens (mock tokens for testing)
  let mockTokenA, mockTokenB;
  
  // Constants for testing
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const ONE_ETHER = ethers.utils.parseEther("1");
  const TEN_ETHER = ethers.utils.parseEther("10");
  const HUNDRED_ETHER = ethers.utils.parseEther("100");
  
  beforeEach(async function () {
    // Get test accounts
    [owner, teamWallet, ecosystemWallet, user1, user2] = await ethers.getSigners();
    
    // Deploy AIHToken
    const AIHToken = await ethers.getContractFactory("AIHToken");
    aihToken = await AIHToken.deploy(teamWallet.address, ecosystemWallet.address);
    await aihToken.deployed();
    
    // Deploy SimpleSwapRouter
    const SimpleSwapRouter = await ethers.getContractFactory("SimpleSwapRouter");
    swapRouter = await SimpleSwapRouter.deploy(aihToken.address);
    await swapRouter.deployed();
    
    // Deploy SimpleFarm
    const SimpleFarm = await ethers.getContractFactory("SimpleFarm");
    simpleFarm = await SimpleFarm.deploy(aihToken.address);
    await simpleFarm.deployed();
    
    // Set farm address in token contract
    await aihToken.setFarmAddress(simpleFarm.address);
    
    // Deploy mock tokens for testing
    const MockToken = await ethers.getContractFactory("AIHToken"); // Using AIHToken as a mock token
    mockTokenA = await MockToken.deploy(teamWallet.address, ecosystemWallet.address);
    await mockTokenA.deployed();
    mockTokenB = await MockToken.deploy(teamWallet.address, ecosystemWallet.address);
    await mockTokenB.deployed();
  });
  
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
  
  describe("Contract Interactions", function () {
    it("Should allow farm to mint tokens", async function () {
      // Only farm can mint tokens
      const initialSupply = await aihToken.totalSupply();
      
      // Fund the farm address with some ETH for gas
      await network.provider.send("hardhat_setBalance", [
        simpleFarm.address,
        "0x1000000000000000000", // 1 ETH
      ]);

      // Impersonate the farm contract to mint tokens
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [simpleFarm.address],
      });
      
      const farmSigner = await ethers.provider.getSigner(simpleFarm.address);
      await aihToken.connect(farmSigner).mint(user1.address, ONE_ETHER);
      
      // Stop impersonating
      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [simpleFarm.address],
      });
      
      expect(await aihToken.balanceOf(user1.address)).to.equal(ONE_ETHER);
      expect(await aihToken.totalSupply()).to.equal(initialSupply.add(ONE_ETHER));
    });
  });
}); 