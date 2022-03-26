import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, BigNumber, Signer, utils } from 'ethers';

describe("StrategyLHB", () => {
    const { provider } = ethers;
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const MaxUint256 = BigNumber.from(2).pow(256).sub(1);
    const SECS_PER_YEAR = 31556952;

    let gov: Signer;
    let guardian: Signer;
    let management: Signer;
    let newGov: Signer;
    let newManagement: Signer;
    let newGuardian: Signer;
    let userA: Signer;

    let mdexRouterMock: Contract;
    let cUSDTMock: Contract;
    let comptrollerMock: Contract;
    let usdt: Contract;
    let lhb: Contract;
    let wht: Contract;
    let wht_usdt_pair: Contract;
    let wht_lhb_pair: Contract;
    let vault: Contract;
    let strategy: Contract;
    let rewards: String;

    before(async () => {
        [gov, guardian, management, newGov, newManagement, newGuardian, userA] = await ethers.getSigners();
    });

    beforeEach(async () => {
        // tokens
        const Token = await ethers.getContractFactory("TestToken");
        usdt = await Token.deploy('USDT Test Token', 'USDT');
        lhb  = await Token.deploy('LHB Test Token', 'LHB');
        wht  = await Token.deploy('WHT Test Token', 'WHT');

        // mocks
        const MdexRouterMock = await ethers.getContractFactory("MdexRouterMock");
        mdexRouterMock = await MdexRouterMock.deploy();
        const MdexPairMock = await ethers.getContractFactory("MdexPairMock");
        await mdexRouterMock.createPair(wht.address, usdt.address);
        wht_usdt_pair = await MdexPairMock.attach(await mdexRouterMock.pairs(wht.address, usdt.address));
        await mdexRouterMock.createPair(wht.address, lhb.address);
        wht_lhb_pair = await MdexPairMock.attach(await mdexRouterMock.pairs(wht.address, lhb.address));

        const CERC20Mock = await ethers.getContractFactory("CERC20Mock");
        cUSDTMock = await CERC20Mock.deploy(usdt.address, "cUSDT", "cUSDT");
        const ComptrollerMock = await ethers.getContractFactory("ComptrollerMock");
        comptrollerMock = await ComptrollerMock.deploy(lhb.address);
        await comptrollerMock.setCompSpeed(cUSDTMock.address, utils.parseEther('10'));

        // add initial liquidity
        const amountToken = utils.parseEther('10000');
        await usdt.connect(gov).approve(mdexRouterMock.address, MaxUint256);
        await lhb.connect(gov).approve(mdexRouterMock.address, MaxUint256);
        await wht.connect(gov).approve(mdexRouterMock.address, MaxUint256);
        await mdexRouterMock.connect(gov).addLiquidity(wht.address, usdt.address, amountToken, amountToken, 0, 0, gov.getAddress(), 0);
        await mdexRouterMock.connect(gov).addLiquidity(wht.address, lhb.address, amountToken, amountToken, 0, 0, gov.getAddress(), 0);

        // vault
        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy();

        rewards = '0x2000000000000000000000000000000000000000';
        await vault.initialize(usdt.address, await gov.getAddress(), rewards, await guardian.getAddress(), await management.getAddress());
        await vault.connect(gov).setDepositLimit(MaxUint256);
        await vault.connect(gov).setPerformanceFee(0);
        await vault.connect(gov).setManagementFee(0);

        const StrategyLHB = await ethers.getContractFactory("StrategyLHB");
        // address _vault, address _dex, address _wht, address _lhb, address _cToken, address _lendHub
        strategy = await StrategyLHB.deploy(vault.address, mdexRouterMock.address, wht.address, lhb.address, cUSDTMock.address, comptrollerMock.address);
        await vault.addStrategy(strategy.address, 1000, 0, MaxUint256, 0); 

        await usdt.connect(gov).approve(vault.address, MaxUint256);
        await vault.connect(gov).deposit(amountToken, userA.getAddress());
    });

    describe("StrategyLHB", () => {

        it("test: ethToWant", async () => {
            expect(await strategy.want()).to.eq(usdt.address);

            const amountWant = await strategy.connect(gov).ethToWant(utils.parseEther('1'));

            expect(amountWant).to.eq(utils.parseEther('1'));
        });

        it("test: adjustPosition", async () => {
            await strategy.connect(gov).harvest();

            await expect(await usdt.balanceOf(strategy.address)).to.eq(0);
            await expect(await usdt.balanceOf(cUSDTMock.address)).to.eq(utils.parseEther('1000'));    
            await expect(await vault.lockedProfit()).to.eq(0);    
        });

        it("test: prepareReturn", async () => {
            await strategy.connect(gov).harvest();

            // await usdt.connect(gov).transfer(strategy.address, utils.parseEther('50'));
            await strategy.connect(gov).harvest();
            
            await expect(await usdt.balanceOf(vault.address)).to.eq(utils.parseEther('9100'));
            await expect(await vault.lockedProfit()).to.eq(utils.parseEther('100'));    
            let strategyParams = await vault.strategies(strategy.address);
            expect(strategyParams.totalGain).to.eq(utils.parseEther('100'));
        });

        it("test: liquidatePosition", async () => {
            await strategy.connect(gov).harvest();
            
            // balance < amountNeeded
            await vault.connect(userA).withdraw(utils.parseEther('10000'), userA.getAddress(), 1);

            await expect(await usdt.balanceOf(await userA.getAddress())).to.eq(utils.parseEther('10000'));
            await expect(await usdt.balanceOf(strategy.address)).to.eq(0);
        });

        it("test: liquidateAllPositions", async () => {
            await strategy.connect(gov).harvest();
            await usdt.connect(gov).transfer(strategy.address, utils.parseEther('50'));
            await strategy.connect(gov).setEmergencyExit();
            await strategy.connect(gov).harvest();

            await expect(await usdt.balanceOf(vault.address)).to.eq(utils.parseEther('10050'));
            await expect(await usdt.balanceOf(strategy.address)).to.eq(0);
        });

        it("test: prepareMigration", async () => {
            const Strategy = await ethers.getContractFactory("TestStrategy");
            const newStrategy = await Strategy.deploy(vault.address);

            await strategy.connect(gov).harvest();
            await usdt.connect(gov).transfer(strategy.address, utils.parseEther('100'));
            await lhb.connect(gov).transfer(strategy.address, utils.parseEther('100'));
            await vault.connect(gov).migrateStrategy(strategy.address, newStrategy.address);

            expect(await usdt.balanceOf(strategy.address)).to.eq(0);
            expect(await lhb.balanceOf(strategy.address)).to.eq(0);
            expect(await cUSDTMock.balanceOf(strategy.address)).to.eq(0);
            expect(await cUSDTMock.balanceOf(newStrategy.address)).to.eq(utils.parseEther('100000'));
            expect(await lhb.balanceOf(newStrategy.address)).to.eq(utils.parseEther('200'));
            expect(await usdt.balanceOf(newStrategy.address)).to.eq(utils.parseEther('100'));
        });
    });

});
