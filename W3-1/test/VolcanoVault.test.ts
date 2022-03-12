import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, BigNumber, Signer, utils } from 'ethers';

describe("Vault", () => {
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

    let vault: Contract;
    let token: Contract;
    let rewards: String;

    before(async () => {
        [gov, guardian, management, newGov, newManagement, newGuardian, userA] = await ethers.getSigners();
    });

    beforeEach(async () => {
        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy();

        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy(18);

        rewards = '0x2000000000000000000000000000000000000000';
        await vault.initialize(token.address, await gov.getAddress(), rewards, await guardian.getAddress(), await management.getAddress());
    });

    describe("config", () => {

        it("Should initialize succeed", async () => {
            expect(await vault.governance()).to.eq(await gov.getAddress());
            expect(await vault.management()).to.eq(await management.getAddress());
            expect(await vault.guardian()).to.eq(await guardian.getAddress());
            expect(await vault.rewards()).to.eq(rewards);
            expect(await vault.token()).to.eq(token.address);

            expect(await vault.name()).to.eq(await token.symbol() + " vVault");
            expect(await vault.symbol()).to.eq("v" + await token.symbol());
            expect(await vault.decimals()).to.eq(await token.decimals());
            expect(await vault.apiVersion()).to.eq("0.4.2");

            expect(await vault.debtRatio()).to.eq(0);
            expect(await vault.depositLimit()).to.eq(0);
            // expect(await vault.creditAvailable()).to.eq(0);
            // expect(await vault.debtOutstanding()).to.eq(0);
            expect(await vault.maxAvailableShares()).to.eq(0);
            expect(await vault.getTotalAssets()).to.eq(0);
            expect((await vault.getPricePerShare()) / (10 ** await vault.decimals())).to.eq(1.0);
        });

        it("Should reinitialize failed", async () => {
            await expect(vault.initialize(token.address, await gov.getAddress(), rewards, await guardian.getAddress(), await management.getAddress()))
                .to.revertedWith('Vault: already initialized');
        });

        it("Should setName", async () => {
            const newName = 'NewName yVault';
            await expect(vault.connect(guardian).setName(newName))
                .to.revertedWith('Vault: not governance');
            await vault.connect(gov).setName(newName);
            expect(await vault.name()).to.eq(newName);
        });

        it("Should setSymbol", async () => {
            const newSymbol = 'yvNEW';
            await expect(vault.connect(guardian).setSymbol(newSymbol))
                .to.revertedWith('Vault: not governance');
            await vault.connect(gov).setSymbol(newSymbol);
            expect(await vault.symbol()).to.eq(newSymbol);
        });

        it("Should setManagement", async () => {
            await expect(vault.connect(guardian).setManagement(await newManagement.getAddress()))
                .to.revertedWith('Vault: not governance');
            await vault.connect(gov).setManagement(await newManagement.getAddress());
            expect(await vault.management()).to.eq(await newManagement.getAddress());
        });
        
        it("Should setRewards", async () => {
            const newReawrds = '0x3000000000000000000000000000000000000000';
            await expect(vault.connect(guardian).setRewards(newReawrds))
                .to.revertedWith('Vault: not governance');
            await expect(vault.connect(gov).setRewards(ZERO_ADDRESS))
                .to.revertedWith('Vault: zero address');
            await expect(vault.connect(gov).setRewards(vault.address))
                .to.revertedWith('Vault: cant be self');
            await vault.connect(gov).setRewards(newReawrds);
            expect(await vault.rewards()).to.eq(newReawrds);
        });
         
        it("Should setLockedProfitDegradation", async () => {
            let newDegradation = utils.parseEther('2');
            await expect(vault.connect(guardian).setLockedProfitDegradation(newDegradation))
                .to.revertedWith('Vault: not governance');
            await expect(vault.connect(gov).setLockedProfitDegradation(newDegradation))
                .to.revertedWith('Vault: over maxAvail');
            newDegradation = utils.parseEther('0.5');
            await vault.connect(gov).setLockedProfitDegradation(newDegradation);
            expect(await vault.lockedProfitDegradation()).to.eq(newDegradation);
        });

        it("Should setDepositLimit", async () => {
            const newDepositLimit = utils.parseEther('2');
            await expect(vault.connect(guardian).setDepositLimit(newDepositLimit))
                .to.revertedWith('Vault: not governance');
            await vault.connect(gov).setDepositLimit(newDepositLimit);
            expect(await vault.depositLimit()).to.eq(newDepositLimit);
        });

        it("Should setPerformanceFee", async () => {
            let newPerformanceFee = 5001;
            await expect(vault.connect(guardian).setPerformanceFee(newPerformanceFee))
                .to.revertedWith('Vault: not governance');
            await expect(vault.connect(gov).setPerformanceFee(newPerformanceFee))
                .to.revertedWith('Vault: over maxAvail');
            newPerformanceFee = 5000;
            await vault.connect(gov).setPerformanceFee(newPerformanceFee);
            expect(await vault.performanceFee()).to.eq(newPerformanceFee);
        });

        it("Should setManagementFee", async () => {
            let newManagementFee = 5001;
            await expect(vault.connect(guardian).setManagementFee(newManagementFee))
                .to.revertedWith('Vault: not governance');
            await expect(vault.connect(gov).setManagementFee(newManagementFee))
                .to.revertedWith('Vault: over maxAvail');
            newManagementFee = 5000;
            await vault.connect(gov).setManagementFee(newManagementFee);
            expect(await vault.managementFee()).to.eq(newManagementFee);
        });

        it("Should setGuardian", async () => {
            await expect(vault.connect(management).setGuardian(await newGuardian.getAddress()))
                .to.revertedWith('Vault: not governance or guardian');
            await vault.connect(guardian).setGuardian(await newGuardian.getAddress());
            expect(await vault.guardian()).to.eq(await newGuardian.getAddress());

            await vault.connect(gov).setGuardian(await guardian.getAddress());
            expect(await vault.guardian()).to.eq(await guardian.getAddress());
        });

        it("Should setEmergencyShutdown", async () => {
            let active = true;
            await expect(vault.connect(management).setEmergencyShutdown(active))
                .to.revertedWith('Vault: not governance or guardian');
            await vault.connect(guardian).setEmergencyShutdown(active);
            expect(await vault.emergencyShutdown()).to.eq(active);

            active = false;
            await expect(vault.connect(guardian).setEmergencyShutdown(active))
                .to.revertedWith('Vault: not governance');
            await vault.connect(gov).setEmergencyShutdown(active);
            expect(await vault.emergencyShutdown()).to.eq(active);
        });

        it("Should setGovernance", async () => {
            await expect(vault.connect(guardian).setGovernance(await newGov.getAddress()))
                .to.revertedWith('Vault: not governance');
            await vault.connect(gov).setGovernance(await newGov.getAddress());
            expect(await vault.governance()).to.eq(await gov.getAddress());

            await expect(vault.connect(guardian).acceptGovernance())
                .to.revertedWith('Vault: not pendingGovernance');
            await vault.connect(newGov).acceptGovernance();
            expect(await vault.governance()).to.eq(await newGov.getAddress());
        });

    });

    describe("strategy", () => {

        let strategy: Contract;

        beforeEach(async () => {
            const Strategy = await ethers.getContractFactory("TestStrategy");
            strategy = await Strategy.deploy(vault.address);
        });

        async function addStrategy(strategyAddress: String) {
            // addStrategy(address strategy, uint256 _debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)
            await vault.addStrategy(strategyAddress, 1000, 0, 1000, 0);
        }

        it("Should addStrategy", async () => {
            await expect(vault.connect(guardian).addStrategy(strategy.address, 1000, 0, 1000, 0))
                .to.revertedWith('Vault: not governance');

            await vault.connect(guardian).setEmergencyShutdown(true);
            await expect(vault.connect(gov).addStrategy(strategy.address, 1000, 0, 1000, 0))
                .to.revertedWith('Vault: in emergency');

            await vault.connect(gov).setEmergencyShutdown(false);
            
            await expect(vault.connect(gov).addStrategy(ZERO_ADDRESS, 1000, 0, 1000, 0))
                .to.revertedWith('Vault: zero address');

            const Strategy = await ethers.getContractFactory("TestStrategy");
            const Vault = await ethers.getContractFactory("Vault");
            const vault2 = await Vault.deploy();
            await vault2.initialize(token.address, await gov.getAddress(), rewards, await guardian.getAddress(), await management.getAddress());
            const strategy2 = await Strategy.deploy(vault2.address);
            await expect(vault.connect(gov).addStrategy(strategy2.address, 1000, 0, 1000, 0))
                .to.revertedWith('Vault: invalid vault');

            await expect(vault.connect(gov).addStrategy(strategy.address, 10001, 0, 1000, 0))
                .to.revertedWith('Vault: over maxAvail');

            await strategy._setWant(ZERO_ADDRESS);
            await expect(vault.connect(gov).addStrategy(strategy.address, 10001, 0, 1000, 0))
                .to.revertedWith('Vault: invalid want');
            await strategy._setWant(token.address);
                
            await expect(vault.connect(gov).addStrategy(strategy.address, 1000, 1001, 1000, 0))
                .to.revertedWith('Vault: min > max');

            await expect(vault.connect(gov).addStrategy(strategy.address, 1000, 0, 1000, 5001))
                .to.revertedWith('Vault: over maxAvail');

            // emit StrategyAdded(strategy, _debtRatio, minDebtPerHarvest, maxDebtPerHarvest, performanceFee);
            await expect(vault.connect(gov).addStrategy(strategy.address, 1000, 0, 1000, 0))
                .to.emit(vault, 'StrategyAdded')
                .withArgs(strategy.address, 1000, 0, 1000, 0);
            expect(await vault.debtRatio()).to.eq(1000);

            await expect(vault.connect(gov).addStrategy(strategy.address, 10001, 0, 1000, 0))
                .to.revertedWith('Vault: activated');

            for (let i = 0; i < 19; i++) {
                const s = await Strategy.deploy(vault.address);
                await vault.connect(gov).addStrategy(s.address, 100, 0, 1000, 0);
            }

            const strategy3 = await Strategy.deploy(vault.address);
            await expect(vault.connect(gov).addStrategy(strategy3.address, 1000, 0, 1000, 0))
                .to.revertedWith('Vault: queue is full');
        });

        it("Should updateStrategy", async () => {
            await addStrategy(strategy.address);
            const activationTimestamp = (await provider.getBlock('latest')).timestamp;

            // updateStrategyDebtRatio
            await expect(vault.connect(guardian).updateStrategyDebtRatio(strategy.address, 1000))
                .to.revertedWith('Vault: not governance or management');
            await expect(vault.connect(management).updateStrategyDebtRatio(ZERO_ADDRESS, 1000))
                .to.revertedWith('Vault: not activated');
            await expect(vault.connect(management).updateStrategyDebtRatio(strategy.address, 10001))
                .to.revertedWith('Vault: over maxAvail');
            await expect(vault.connect(gov).updateStrategyDebtRatio(strategy.address, 500))
                .to.emit(vault, 'StrategyUpdateDebtRatio')
                .withArgs(strategy.address, 500);
            let strategyParams = await vault.strategies(strategy.address);
            expectStrategyParamsEqual(strategyParams, {
                "performanceFee": 0,
                "activation": activationTimestamp,
                "debtRatio": 500,  // This changed
                "minDebtPerHarvest": 0,
                "maxDebtPerHarvest": 1000,
                "lastReport": activationTimestamp,
                "totalGain": BigNumber.from(0),
                "totalLoss": BigNumber.from(0),
                "totalDebt": BigNumber.from(0),
            });

            // updateStrategyMinDebtPerHarvest
            await expect(vault.connect(guardian).updateStrategyMinDebtPerHarvest(strategy.address, 1000))
                .to.revertedWith('Vault: not governance or management');
            await expect(vault.connect(management).updateStrategyMinDebtPerHarvest(ZERO_ADDRESS, 1000))
                .to.revertedWith('Vault: not activated');
            await expect(vault.connect(management).updateStrategyMinDebtPerHarvest(strategy.address, 1001))
                .to.revertedWith('Vault: min > max');
            await expect(vault.connect(gov).updateStrategyMinDebtPerHarvest(strategy.address, 500))
                .to.emit(vault, 'StrategyUpdateMinDebtPerHarvest')
                .withArgs(strategy.address, 500);
            strategyParams = await vault.strategies(strategy.address);
            expectStrategyParamsEqual(strategyParams, {
                "performanceFee": 0,
                "activation": activationTimestamp,
                "debtRatio": 500,  
                "minDebtPerHarvest": 500, // This changed
                "maxDebtPerHarvest": 1000,
                "lastReport": activationTimestamp,
                "totalGain": BigNumber.from(0),
                "totalLoss": BigNumber.from(0),
                "totalDebt": BigNumber.from(0),
            });

            // updateStrategyMaxDebtPerHarvest
            await expect(vault.connect(guardian).updateStrategyMaxDebtPerHarvest(strategy.address, 1000))
                .to.revertedWith('Vault: not governance or management');
            await expect(vault.connect(management).updateStrategyMaxDebtPerHarvest(ZERO_ADDRESS, 1000))
                .to.revertedWith('Vault: not activated');
            await expect(vault.connect(management).updateStrategyMaxDebtPerHarvest(strategy.address, 499))
                .to.revertedWith('Vault: min > max');
            await expect(vault.connect(gov).updateStrategyMaxDebtPerHarvest(strategy.address, 2000))
                .to.emit(vault, 'StrategyUpdateMaxDebtPerHarvest')
                .withArgs(strategy.address, 2000);
            strategyParams = await vault.strategies(strategy.address);
            expectStrategyParamsEqual(strategyParams, {
                "performanceFee": 0,
                "activation": activationTimestamp,
                "debtRatio": 500,  
                "minDebtPerHarvest": 500, 
                "maxDebtPerHarvest": 2000, // This changed
                "lastReport": activationTimestamp,
                "totalGain": BigNumber.from(0),
                "totalLoss": BigNumber.from(0),
                "totalDebt": BigNumber.from(0),
            });

            // updateStrategyPerformanceFee
            await expect(vault.connect(guardian).updateStrategyPerformanceFee(strategy.address, 1000))
                .to.revertedWith('Vault: not governance');
            await expect(vault.connect(gov).updateStrategyPerformanceFee(ZERO_ADDRESS, 1000))
                .to.revertedWith('Vault: not activated');
            await expect(vault.connect(gov).updateStrategyPerformanceFee(strategy.address, 5001))
                .to.revertedWith('Vault: over maxAvail');
            await expect(vault.connect(gov).updateStrategyPerformanceFee(strategy.address, 1000))
                .to.emit(vault, 'StrategyUpdatePerformanceFee')
                .withArgs(strategy.address, 1000);
            strategyParams = await vault.strategies(strategy.address);
            expectStrategyParamsEqual(strategyParams, {
                "performanceFee": 1000, // This changed
                "activation": activationTimestamp,
                "debtRatio": 500,  
                "minDebtPerHarvest": 500, 
                "maxDebtPerHarvest": 2000, 
                "lastReport": activationTimestamp,
                "totalGain": BigNumber.from(0),
                "totalLoss": BigNumber.from(0),
                "totalDebt": BigNumber.from(0),
            });
        });

        it("Should revokeStrategy", async () => {
            await addStrategy(strategy.address);
            
            const debtRatioBefore = await vault.debtRatio();
            const strategyParams = await vault.strategies(strategy.address);
            const strategyDebtRatioBefore = strategyParams.debtRatio;
            await expect(vault.connect(management).revokeStrategy(strategy.address))
                .to.revertedWith('Vault: not governance or guardian or strategy self');

            await expect(vault.connect(gov).revokeStrategy(strategy.address))
                .to.emit(vault, 'StrategyRevoked')
                .withArgs(strategy.address);

            // await expect(vault.connect(guardian).revokeStrategy(strategy.address))
            //     .to.revertedWith('Vault: already zero'); // strategies[strategy].debtRatio = 0;

            const debtRatioAfter = await vault.debtRatio();
            expect(debtRatioBefore.sub(debtRatioAfter)).to.eq(strategyDebtRatioBefore);

        });

        it("Should migrateStrategy", async () => {
            await addStrategy(strategy.address);

            const Strategy = await ethers.getContractFactory("TestStrategy");
            const newStrategy = await Strategy.deploy(vault.address);

            const debtRatioBefore = await vault.debtRatio();
            const strategyParamsBefore = await vault.strategies(strategy.address);

            await expect(vault.connect(management).migrateStrategy(strategy.address, newStrategy.address))
                .to.revertedWith('Vault: not governance');
            await expect(vault.connect(gov).migrateStrategy(strategy.address, ZERO_ADDRESS))
                .to.revertedWith('Vault: zero address');
            await expect(vault.connect(gov).migrateStrategy(ZERO_ADDRESS, newStrategy.address))
                .to.revertedWith('Vault: old not activated');
            await expect(vault.connect(gov).migrateStrategy(strategy.address, strategy.address))
                .to.revertedWith('Vault: new activated');

            await expect(vault.connect(gov).migrateStrategy(strategy.address, newStrategy.address))
                .to.emit(vault, 'StrategyRevoked')
                .withArgs(strategy.address)
                .to.emit(vault, 'StrategyMigrated')
                .withArgs(strategy.address, newStrategy.address);

            const debtRatioAfter = await vault.debtRatio();
            const strategyParamsAfter = await vault.strategies(strategy.address);
            const strategyTotalDebtAfter = strategyParamsAfter.totalDebt;
            const newStrategyParamsAfter = await vault.strategies(newStrategy.address);

            expect(strategyTotalDebtAfter).to.eq(0);
            expect(debtRatioBefore).to.eq(debtRatioAfter);
            expectStrategyParamsEqual(newStrategyParamsAfter, {
                "performanceFee": strategyParamsBefore.performanceFee,
                "activation": strategyParamsBefore.lastReport,
                "debtRatio": strategyParamsBefore.debtRatio,
                "minDebtPerHarvest": strategyParamsBefore.minDebtPerHarvest,
                "maxDebtPerHarvest": strategyParamsBefore.maxDebtPerHarvest,
                "lastReport": strategyParamsBefore.lastReport,
                "totalGain": strategyParamsBefore.totalDebt,
                "totalLoss": BigNumber.from(0),
                "totalDebt": BigNumber.from(0),
            });

            // todo withdrawalQueue : newVersion replace oldVersion
        });

        it("Should removeStrategyFromQueue", async () => {
            await addStrategy(strategy.address);

            await expect(vault.connect(guardian).removeStrategyFromQueue(strategy.address))
                .to.revertedWith('Vault: not governance or management');

            await expect(vault.connect(management).removeStrategyFromQueue(strategy.address))
                .to.emit(vault, 'StrategyRemovedFromQueue')
                .withArgs(strategy.address);
            // todo check queue
        });

        it("Should addStrategyToQueue", async () => {
            await addStrategy(strategy.address);

            await expect(vault.connect(guardian).addStrategyToQueue(strategy.address))
                .to.revertedWith('Vault: not governance or management');
            await expect(vault.connect(management).addStrategyToQueue(ZERO_ADDRESS)) // any address
                .to.revertedWith('Vault: not activated');
            await expect(vault.connect(management).addStrategyToQueue(strategy.address))
                .to.revertedWith('Vault: already in');

            await vault.connect(management).removeStrategyFromQueue(strategy.address);
            await expect(vault.connect(management).addStrategyToQueue(strategy.address))
                .to.emit(vault, 'StrategyAddedToQueue')
                .withArgs(strategy.address);
            // todo check queue

            await vault.connect(management).removeStrategyFromQueue(strategy.address);
            const Strategy = await ethers.getContractFactory("TestStrategy");
            for (let i = 0; i < 20; i++) {
                const s = await Strategy.deploy(vault.address);
                await vault.connect(gov).addStrategy(s.address, 100, 0, 1000, 0);
            }
            await expect(vault.connect(management).addStrategyToQueue(strategy.address))
                .to.revertedWith('Vault: full');
        });

        
        it("Should setWithdrawalQueue", async () => {
            const Strategy = await ethers.getContractFactory("TestStrategy");
            let strategies = new Array();
            for (let i = 0; i < 20; i++) {
                const s = await Strategy.deploy(vault.address);
                strategies.push(s.address);
                await vault.connect(gov).addStrategy(s.address, 100, 0, 1000, 0);
            }

            await vault.connect(gov).setWithdrawalQueue(strategies);
        });

    });

    describe("deposit", () => {

        it('Should deposit', async () => {
            const balance = await token.balanceOf(gov.getAddress());
            const depositAmount = BigNumber.from(balance).div(2);
            // fails
            await expect(vault.connect(userA).deposit(depositAmount, ZERO_ADDRESS))
                .to.revertedWith('Vault: zero address');
            await expect(vault.connect(userA).deposit(depositAmount, vault.address))
                .to.revertedWith('Vault: cant be self');
            await expect(vault.connect(userA).deposit(0, userA.getAddress()))
                .to.revertedWith('Vault: illegal amount');
            await expect(vault.connect(userA).deposit(depositAmount, userA.getAddress()))
                .to.revertedWith('Vault: over depositLimit');
            await vault.connect(gov).setDepositLimit(balance);
            await expect(vault.connect(userA).deposit(depositAmount, userA.getAddress()))
                .to.revertedWith('TransferHelper::transferFrom: transferFrom failed');

            // success
            await token.connect(gov).transfer(userA.getAddress(), balance);
            await token.connect(userA).approve(vault.address, balance);
            // first deposit
            await expect(vault.connect(userA).deposit(depositAmount, userA.getAddress()))
                .to.emit(vault, 'Transfer')
                .withArgs(ZERO_ADDRESS, await userA.getAddress(), depositAmount);
            expect(await token.balanceOf(vault.address)).to.eq(depositAmount);
            expect(await vault.getTotalAssets()).to.eq(depositAmount);
            expect(await vault.totalSupply()).to.eq(depositAmount);
            expect(await vault.balanceOf(await userA.getAddress())).to.eq(depositAmount);
            
            // second deposit
            await vault.connect(userA).deposit(depositAmount, userA.getAddress());
            expect(await token.balanceOf(vault.address)).to.eq(balance);
            expect(await vault.getTotalAssets()).to.eq(balance);
            expect(await vault.totalSupply()).to.eq(balance);
            expect(await vault.balanceOf(await userA.getAddress())).to.eq(balance);
        });
    });

    describe("report", () => {

        const depositAmount = utils.parseEther('10000');
        const strategyDebtRatio = 1000;
        const maxDebtPerHarvest = utils.parseEther('1000');
        let strategy: Contract;

        beforeEach(async () => {
            const Strategy = await ethers.getContractFactory("TestStrategy");
            strategy = await Strategy.deploy(vault.address);

            // addStrategy(address strategy, uint256 _debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)
            await vault.addStrategy(strategy.address, strategyDebtRatio, 0, maxDebtPerHarvest, 0); 
            await vault.connect(gov).setDepositLimit(MaxUint256);
            await token.connect(gov).approve(vault.address, token.balanceOf(gov.getAddress()));
            await vault.connect(gov).deposit(depositAmount, userA.getAddress());

            await vault.connect(gov).setPerformanceFee(0);
            await vault.connect(gov).setManagementFee(0);
        });

        it('Should report fails', async () => {
            await expect(vault.connect(gov).report(100, 0, 0)).to.revertedWith('Vault: not activated');
            // NOTE: This is a test-only function to simulate fails cases
            // function _harvest(uint256 profit, uint256 loss, uint256 debtPayment)
            await expect(strategy.connect(gov)._harvest(100, 0, 0)).to.revertedWith('Vault: insufficient balance');
            await expect(strategy.connect(gov)._harvest(0, 100, 0)).to.revertedWith('Vault: invalid loss');
        });

        it('Should report success firsttime', async () => {
            // emit StrategyReported(
            //     msg.sender,
            //     gain,
            //     loss,
            //     debtPayment,
            //     strategies[msg.sender].totalGain,
            //     strategies[msg.sender].totalLoss,
            //     strategies[msg.sender].totalDebt,
            //     credit,
            //     strategies[msg.sender].debtRatio
            // );
            await expect(strategy.connect(gov).harvest())
                .to.emit(vault, 'StrategyReported')
                .withArgs(strategy.address, 0, 0, 0, 0, 0, utils.parseEther('1000'), utils.parseEther('1000'), 1000);
            await expect(await token.balanceOf(strategy.address)).to.eq(utils.parseEther('1000'));
            await expect(await token.balanceOf(vault.address)).to.eq(utils.parseEther('9000'));
            let lastReport = (await provider.getBlock('latest')).timestamp;
            let strategyParams = await vault.strategies(strategy.address);
            await expect(await vault.lastReport()).to.eq(lastReport);

            expectStrategyParamsEqual(strategyParams, {
                "performanceFee": 0,
                "activation": strategyParams.activation,
                "debtRatio": strategyParams.debtRatio,
                "minDebtPerHarvest": strategyParams.minDebtPerHarvest,
                "maxDebtPerHarvest": strategyParams.maxDebtPerHarvest,
                "lastReport": lastReport,
                "totalGain": BigNumber.from(0),
                "totalLoss": BigNumber.from(0),
                "totalDebt": utils.parseEther('1000'),
            });
        });

        describe("Should report with gain", () => {

            it('test: report gain without fee fails', async () => {
                // await strategy.connect(gov).harvest();

                // const gain = utils.parseEther('1000');
                // await token.connect(gov).transfer(strategy.address, gain);

                // await provider.send("evm_setAutomine", [false]);
                // await provider.send("evm_setIntervalMining", [0]);

                // await strategy.connect(gov).harvest(); 
                // const bal1 = await token.balanceOf(strategy.address);
                // await token.connect(gov).transfer(strategy.address, gain);
                // const bal2 = await token.balanceOf(strategy.address);
                // // await expect(strategy.connect(gov).harvest()).to.revertedWith('Vault: cant assessFees twice within the same block');
                // await strategy.connect(gov).harvest(); 
                // const bal3 = await token.balanceOf(strategy.address);
                
                
                
                // await provider.send("evm_mine", []);
                // const bal4 = await token.balanceOf(strategy.address);
                // await provider.send("evm_setAutomine", [true]);
                // const bal5 = await token.balanceOf(strategy.address);
                // console.log(`bal1: ${bal1}, bal2: ${bal2}, bal3: ${bal3}. bal4: ${bal4}, bal5: ${bal5}`);

            });

            it('test: report gain without fee', async () => {
                await strategy.connect(gov).harvest();

                const gain = utils.parseEther('1000');
                await token.connect(gov).transfer(strategy.address, gain);
                await expect(strategy.connect(gov).harvest())
                    .to.emit(vault, 'StrategyReported')
                    .withArgs(strategy.address, gain, 0, 0, gain, 0, gain, 0, 1000);
                await expect(await token.balanceOf(strategy.address)).to.eq(gain);
                await expect(await token.balanceOf(vault.address)).to.eq(utils.parseEther('10000'));
                await expect(await vault.lockedProfit()).to.eq(gain);    
                
                let strategyParams = await vault.strategies(strategy.address);
                expect(strategyParams.totalGain).to.eq(gain);
            });

            it('test: calc locked profit without fee', async () => {
                await strategy.connect(gov).harvest();
                const gain = utils.parseEther('1000');
                await token.connect(gov).transfer(strategy.address, gain);
                await strategy.connect(gov).harvest();

                let lastReportBefore = await vault.lastReport();
                let degradation = BigNumber.from(10).pow(16);
                await vault.connect(gov).setLockedProfitDegradation(degradation);
                await strategy.connect(gov).harvest();
                let lastReportAfter = await vault.lastReport();

                const lp = await vault.lockedProfit();
                expect(await vault.lockedProfit()).to.eq(utils.parseEther('1000').mul(utils.parseEther('' + (1 - (lastReportAfter - lastReportBefore) / 100))).div(utils.parseEther('1')));
            });

            it('test: report gain with fee', async () => {
                await vault.connect(gov).setPerformanceFee(1000);
                await vault.connect(gov).setManagementFee(1000);
                await vault.connect(gov).updateStrategyPerformanceFee(strategy.address, 1000);

                await strategy.connect(gov).harvest();
                const gain = utils.parseEther('1000');
                await token.connect(gov).transfer(strategy.address, gain);
                const lastReportBefore = await vault.lastReport();
                const nextBlockTimestamp = +lastReportBefore + SECS_PER_YEAR;
                provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);
                await strategy.connect(gov).harvest();
                const lastReportAfter = await vault.lastReport();
                // console.log(`lastReportBefore: ${lastReportBefore}, nextBlockTimestamp: ${nextBlockTimestamp}, lastReportAfter: ${lastReportAfter}`);

                expect(await vault.balanceOf(strategy.address)).to.eq(utils.parseEther('100'));
                expect(await vault.balanceOf(rewards)).to.eq(utils.parseEther('200'));
            });
        });

        describe("Should report with loss", () => {

            it('test: report loss', async () => {
                await strategy.connect(gov).harvest();

                // first loss
                await strategy.connect(gov)._takeFunds(utils.parseEther('200'));
                await vault.connect(gov).deposit(utils.parseEther('200'), userA.getAddress());
                await expect(strategy.connect(gov).harvest())
                    .to.emit(vault, 'StrategyReported')
                    .withArgs(strategy.address, 0, utils.parseEther('200'), 0, 0, utils.parseEther('200'), utils.parseEther('800'), 0, 800);
                expect(await token.balanceOf(strategy.address)).to.eq(utils.parseEther('800'));
                expect(await token.balanceOf(vault.address)).to.eq(utils.parseEther('9200'));

                // second loss
                await strategy.connect(gov)._takeFunds(utils.parseEther('200'));
                await vault.connect(gov).deposit(utils.parseEther('200'), userA.getAddress());
                await expect(strategy.connect(gov).harvest())
                    .to.emit(vault, 'StrategyReported')
                    .withArgs(strategy.address, 0, utils.parseEther('200'), 0, 0, utils.parseEther('400'), utils.parseEther('600'), 0, 600);
                expect(await token.balanceOf(strategy.address)).to.eq(utils.parseEther('600'));
                expect(await token.balanceOf(vault.address)).to.eq(utils.parseEther('9400'));

                // third loss
                await strategy.connect(gov)._takeFunds(utils.parseEther('600'));
                await vault.connect(gov).deposit(utils.parseEther('600'), userA.getAddress());
                await expect(strategy.connect(gov).harvest())
                    .to.emit(vault, 'StrategyReported')
                    .withArgs(strategy.address, 0, utils.parseEther('600'), 0, 0, utils.parseEther('1000'), 0, 0, 0);
                expect(await token.balanceOf(strategy.address)).to.eq(0);
                expect(await token.balanceOf(vault.address)).to.eq(utils.parseEther('10000'));
            });

            it('test: loss should be removed from locked profit', async () => {
                await strategy.connect(gov).harvest();

                const gain = utils.parseEther('1000');
                await token.connect(gov).transfer(strategy.address, gain);
                await strategy.connect(gov).harvest();
                
                await strategy.connect(gov)._takeFunds(utils.parseEther('200'));

                let degradation = BigNumber.from(10).pow(16);
                await vault.connect(gov).setLockedProfitDegradation(degradation);
                const lastReportBefore = await vault.lastReport();
                const nextBlockTimestamp = +lastReportBefore + 10;
                provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                await strategy.connect(gov).harvest();

                expect(await vault.lockedProfit()).to.eq(utils.parseEther('700'));
            });

        });

        describe("Should report with debtPayment", () => {

            it('test: report debtPayment', async () => {
                await strategy.connect(gov).harvest();
                await vault.connect(gov).updateStrategyDebtRatio(strategy.address, 500);

                await strategy.connect(gov).harvest();

                expect((await vault.strategies(strategy.address)).totalDebt).to.eq(utils.parseEther('500'));
                expect (await vault.totalDebt()).to.eq(utils.parseEther('500'));
            });

        });
    });

    describe("withdraw", () => {

        const depositAmount = utils.parseEther('10000');
        const shares = utils.parseEther('10000');
        const maxDebtPerHarvest = MaxUint256;
        let strategy: Contract;

        beforeEach(async () => {
            const Strategy = await ethers.getContractFactory("TestStrategy");
            strategy = await Strategy.deploy(vault.address);
     
            await vault.connect(gov).setDepositLimit(MaxUint256);
            await token.connect(gov).approve(vault.address, token.balanceOf(gov.getAddress()));
            await vault.connect(gov).deposit(depositAmount, userA.getAddress());

            await vault.connect(gov).setPerformanceFee(0);
            await vault.connect(gov).setManagementFee(0);

        });

        it('Should withdraw fails', async () => {
            await expect(vault.connect(userA).withdraw(100, userA.getAddress(), 10001)).to.revertedWith('Vault: invalid maxLoss');
            await expect(vault.connect(userA).withdraw(shares.add(1), userA.getAddress(), 1)).to.revertedWith('Vault: insufficient balance');
            await expect(vault.connect(userA).withdraw(0, userA.getAddress(), 1)).to.revertedWith('Vault: invalid shares');
        });

        describe('Should withdraw success', () => {

            it('test: withdraw all', async () => {
                await vault.addStrategy(strategy.address, 1000, 0, maxDebtPerHarvest, 0); 
                await expect(vault.connect(userA).withdraw(shares, userA.getAddress(), 1))
                    .to.emit(vault, 'Transfer')
                    .withArgs(await userA.getAddress(), ZERO_ADDRESS, shares);

                expect(await vault.balanceOf(await userA.getAddress())).to.eq(0);
                expect(await token.balanceOf(await userA.getAddress())).to.eq(depositAmount);
                expect(await token.balanceOf(vault.address)).to.eq(0);
            });
            
            it('test: withdraw from one strategy', async () => {
                await vault.addStrategy(strategy.address, 10000, 0, maxDebtPerHarvest, 0); 
                await strategy.connect(gov).harvest();

                expect(await token.balanceOf(vault.address)).to.eq(0);
                expect(await token.balanceOf(strategy.address)).to.eq(depositAmount);

                await vault.connect(userA).withdraw(shares.div(2), userA.getAddress(), 1);

                expect((await vault.strategies(strategy.address)).totalDebt).to.eq(depositAmount.div(2));
                expect(await vault.totalDebt()).to.eq(depositAmount.div(2));
            });

            it('test: withdraw from multiple strategys', async () => {
                const Strategy = await ethers.getContractFactory("TestStrategy");
                const strategy2 = await Strategy.deploy(vault.address);
                const strategy3 = await Strategy.deploy(vault.address);

                await vault.addStrategy(strategy.address, 0, 0, maxDebtPerHarvest, 0); 
                await vault.addStrategy(strategy2.address, 1000, 0, maxDebtPerHarvest, 0); 
                await vault.addStrategy(strategy3.address, 9000, 0, maxDebtPerHarvest, 0); 
                await strategy.connect(gov).harvest();
                await strategy2.connect(gov).harvest();
                await strategy3.connect(gov).harvest();

                await vault.connect(userA).withdraw(shares.div(2), userA.getAddress(), 1);

                expect((await vault.strategies(strategy.address)).totalDebt).to.eq(0);
                expect((await vault.strategies(strategy2.address)).totalDebt).to.eq(0);
                expect((await vault.strategies(strategy3.address)).totalDebt).to.eq(depositAmount.div(2));
                expect(await vault.totalDebt()).to.eq(depositAmount.div(2));
            });

            it('test: withdraw fails with loss', async () => {
                await vault.addStrategy(strategy.address, 10000, 0, maxDebtPerHarvest, 0); 
                await strategy.connect(gov).harvest();

                const bal = await token.balanceOf(strategy.address);
                await strategy.connect(gov)._takeFunds(depositAmount.div(2));

                await expect(vault.connect(userA).withdraw(shares.div(2), userA.getAddress(), 1)).to.revertedWith('Vault: over acceptable loss');
            });

            it('test: withdraw with loss', async () => {
                await vault.addStrategy(strategy.address, 10000, 0, maxDebtPerHarvest, 0); 
                await strategy.connect(gov).harvest();

                let snapshot = await provider.send('evm_snapshot', []);
                // loss < withdraw
                await strategy.connect(gov)._takeFunds(depositAmount.div(5));
                await vault.connect(userA).withdraw(shares.div(2), userA.getAddress(), 10000);

                expect(await token.balanceOf(await userA.getAddress())).to.eq(depositAmount.div(2).sub(depositAmount.div(5)));
                provider.send('evm_revert', [snapshot]);

                snapshot = await provider.send('evm_snapshot', []);
                // loss > withdraw
                await strategy.connect(gov)._takeFunds(depositAmount.div(2));
                await vault.connect(userA).withdraw(shares.div(2), userA.getAddress(), 10000);

                expect(await token.balanceOf(await userA.getAddress())).to.eq(0);
                provider.send('evm_revert', [snapshot]);
            });
        });
    });

    // describe("erc20", () => {

    //     it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    //         const name = await vault.name();
    //         expect(name).to.eq(await token.symbol() + " yVault");
    //         // expect(await token.symbol()).to.eq('DTC');
    //         // expect(await token.decimals()).to.eq(18);
    //         expect(await token.totalSupply()).to.eq(0);
    //         expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY);
    //         expect(await token.DOMAIN_SEPARATOR()).to.eq(
    //         keccak256(
    //             defaultAbiCoder.encode(
    //               ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    //               [
    //                 keccak256(
    //                   toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
    //                 ),
    //                 keccak256(toUtf8Bytes(name)),
    //                 keccak256(toUtf8Bytes('1')),
    //                 chainId,
    //                 vault.address
    //               ]
    //             )
    //           )
    //         );
    //         expect(await token.PERMIT_TYPEHASH()).to.eq(
    //           keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
    //         );
    //     });
        
    //     it('approve', async () => {
    //         await expect(token.approve(other.address, TEST_AMOUNT))
    //           .to.emit(token, 'Approval')
    //           .withArgs(wallet.address, other.address, TEST_AMOUNT);
    //         expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT);
    //     });
        
    //     it('transfer', async () => {
    //         await expect(token.transfer(other.address, TEST_AMOUNT))
    //           .to.emit(token, 'Transfer');
    //           .withArgs(wallet.address, other.address, TEST_AMOUNT)
    //         expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT));
    //         expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT);
    //     });
        
    //     it('transfer:fail', async () => {
    //         await expect(token.transfer(other.address, TOTAL_SUPPLY.add(1))).to.be.reverted ;// ds-math-sub-underflow
    //         await expect(token.connect(other).transfer(wallet.address, 1)).to.be.reverted ;// ds-math-sub-underflow
    //     })
        
    //     it('transferFrom', async () => {
    //         await token.approve(other.address, TEST_AMOUNT);
    //         await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
    //           .to.emit(token, 'Transfer')
    //           .withArgs(wallet.address, other.address, TEST_AMOUNT);
    //         expect(await token.allowance(wallet.address, other.address)).to.eq(0);
    //         expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT));
    //         expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT);
    //     });
        
    //     it('transferFrom:max', async () => {
    //         await token.approve(other.address, MaxUint256);
    //         await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
    //           .to.emit(token, 'Transfer')
    //           .withArgs(wallet.address, other.address, TEST_AMOUNT);
    //         expect(await token.allowance(wallet.address, other.address)).to.eq(MaxUint256);
    //         expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT));
    //         expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT);
    //     })
        
    //     it('permit', async () => {
    //         const nonce = await token.nonces(wallet.address);
    //         const deadline = MaxUint256;
    //         const digest = await getApprovalDigest(
    //           token,
    //           { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
    //           nonce,
    //           deadline
    //         );
        
    //         const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))
        
    //         await expect(token.permit(wallet.address, other.address, TEST_AMOUNT, deadline, v, hexlify(r), hexlify(s)))
    //           .to.emit(token, 'Approval')
    //           .withArgs(wallet.address, other.address, TEST_AMOUNT);
    //         expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT);
    //         expect(await token.nonces(wallet.address)).to.eq(BigNumber.from(1));
    //     });
    // });

    function expectStrategyParamsEqual(strategyParams: any, expectedStrategyParams: {
        performanceFee: number,
        activation: number,
        debtRatio: number,
        minDebtPerHarvest: number,
        maxDebtPerHarvest: number,
        lastReport: number,
        totalGain: BigNumber,
        totalLoss: BigNumber,
        totalDebt: BigNumber,
    }) {
        expect(strategyParams.performanceFee).to.eq(expectedStrategyParams.performanceFee);
        expect(strategyParams.activation).to.eq(expectedStrategyParams.activation);
        expect(strategyParams.debtRatio).to.eq(expectedStrategyParams.debtRatio);
        expect(strategyParams.minDebtPerHarvest).to.eq(expectedStrategyParams.minDebtPerHarvest);
        expect(strategyParams.maxDebtPerHarvest).to.eq(expectedStrategyParams.maxDebtPerHarvest);
        expect(strategyParams.lastReport).to.eq(expectedStrategyParams.lastReport);
        expect(strategyParams.totalDebt).to.eq(expectedStrategyParams.totalDebt);
        expect(strategyParams.totalGain).to.eq(expectedStrategyParams.totalGain);
        expect(strategyParams.totalLoss).to.eq(expectedStrategyParams.totalLoss);
    }

});
