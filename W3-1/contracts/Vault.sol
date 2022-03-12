// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IVault.sol";
import "./MyVaultERC20.sol";

interface DetailedERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

interface Strategy {
    function want() external view returns (address);
    function vault() external view returns (address);
    function isActive() external view returns (bool);
    function delegatedAssets() external view returns (uint256);
    function estimatedTotalAssets() external view returns (uint256);
    function withdraw(uint256 _amount) external returns (uint256);
    function migrate(address newStrategy) external;
}

contract Vault is IVault, MyVaultERC20, ReentrancyGuard {

    string public constant API_VERSION = "0.4.2";

    address public token;
    address public governance;
    address public management;
    address public guardian;
    address public pendingGovernance;
    address public multiSigWallet;

    struct StrategyParams {
        uint256 performanceFee; // Strategist's fee (basis points)
        uint256 activation; // Activation block.timestamp
        uint256 debtRatio; // Maximum borrow amount (in BPS of total assets)
        uint256 minDebtPerHarvest; // Lower limit on the increase of debt since last harvest
        uint256 maxDebtPerHarvest; // Upper limit on the increase of debt since last harvest
        uint256 lastReport; // block.timestamp of the last time a report occured
        uint256 totalDebt; // Total outstanding debt that Strategy has
        uint256 totalGain; // Total returns that Strategy has realized for Vault
        uint256 totalLoss; // Total losses that Strategy has realized for Vault
    }

    event UpdateWithdrawalQueue(
        address[MAXIMUM_STRATEGIES] queue // New active withdrawal queue
    );

    // NOTE: Track the total for overhead targeting purposes
    mapping(address => StrategyParams) public strategies;
    uint256 constant public MAXIMUM_STRATEGIES = 20;
    uint256 constant public DEGRADATION_COEFFICIENT = 10 ** 18;

    // Ordering that `withdraw` uses to determine which strategies to pull funds from
    // NOTE: Does *NOT* have to match the ordering of all the current strategies that
    //       exist, but it is recommended that it does or else withdrawal depth is
    //       limited to only those inside the queue.
    // NOTE: Ordering is determined by governance, and should be balanced according
    //       to risk, slippage, and/or volatility. Can also be ordered to increase the
    //       withdrawal speed of a particular Strategy.
    // NOTE: The first time a ZERO_ADDRESS is encountered, it stops withdrawing
    address[MAXIMUM_STRATEGIES] public withdrawalQueue;

    bool public emergencyShutdown;

    uint256 public depositLimit;  // Limit for totalAssets the Vault can hold
    uint256 public debtRatio;  // Debt ratio for the Vault across all strategies (in BPS, <= 10k)
    uint256 public totalDebt;  // Amount of tokens that all strategies have borrowed
    uint256 public lastReport;  // block.timestamp of last report
    uint256 public activation;  // block.timestamp of contract deployment
    uint256 public lockedProfit; // how much profit is locked and cant be withdrawn
    uint256 public lockedProfitDegradation; // rate per block of degradation. DEGRADATION_COEFFICIENT is 100% per block
    address public rewards;  // Rewards contract where Governance fees are sent to
    // Governance Fee for management of Vault (given to `rewards`)
    uint256 public managementFee;
    // Governance Fee for performance of Vault (given to `rewards`)
    uint256 public performanceFee;
    uint256 public constant MAX_BPS = 10_000;  // 100%, or 10k basis points
    // NOTE: A four-century period will be missing 3 of its 100 Julian leap years, leaving 97.
    //       So the average year has 365 + 97/400 = 365.2425 days
    //       ERROR(Julian): -0.0078
    //       ERROR(Gregorian): -0.0003
    //       A day = 24 * 60 * 60 sec = 86400 sec
    //       365.2425 * 86400 = 31556952.0
    uint256 public constant SECS_PER_YEAR = 31_556_952;  // 365.2425 days
    

    modifier onlyGovernance() {
        require(msg.sender == governance, 'Vault: not governance');
        _;
    }

    modifier onlyMultiSigWallet(){
        require(msg.sender == multiSigWallet, 'Vault: not multiSigWallet');
        _;
    }

    function initialize(address _token, address _governance, address _rewards, address _guardian, address _management, address _multiSigWallet) 
        external 
    {
        require(activation == 0, 'Vault: already initialized');

        token = _token;
        
        name = append(DetailedERC20(token).symbol(), " vVault");
        symbol = append("v", DetailedERC20(token).symbol());
        decimals = DetailedERC20(token).decimals();

        governance = _governance;
        emit UpdateGovernance(governance);
        management = _management;
        emit UpdateManagement(_management);
        rewards = _rewards;
        emit UpdateRewards(_rewards);
        guardian = _guardian;
        emit UpdateGuardian(_guardian);
        performanceFee = 1000;  // 10% of yield (per Strategy)
        emit UpdatePerformanceFee(1000);
        managementFee = 0;  // 0% per year
        emit UpdateManagementFee(0);
        multiSigWallet = _multiSigWallet;
        emit UpdateMultiSigWallet(_multiSigWallet);

        lastReport = block.timestamp;
        activation = block.timestamp;
        lockedProfitDegradation = DEGRADATION_COEFFICIENT * 46 / 10 ** 6; // 6 hours in blocks
        // EIP-712
        uint chainId;
        assembly {
            chainId := chainid()}
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPE_HASH,
                keccak256(bytes(name)),
                keccak256(bytes(API_VERSION)),
                chainId,
                address(this)
            )
        );
    }

    function apiVersion() external pure returns (string memory) {
        return API_VERSION;
    }

    function setName(string memory _name) external onlyGovernance {
        name = _name;
    }

    function setSymbol(string memory _symbol) external onlyGovernance {
        symbol = _symbol;
    }

    function setGovernance(address _governance) external onlyMultiSigWallet {
        pendingGovernance = _governance;
        emit PendingGovernance(_governance);
    }

    function acceptGovernance() external {
        require(msg.sender == pendingGovernance, 'Vault: not pendingGovernance');
        governance = msg.sender;
        emit UpdateGovernance(msg.sender);
    }

    function setManagement(address _management) external onlyGovernance {
        require(_management != address(0), 'Vault: zero address');
        management = _management;
        emit UpdateManagement(_management);
    }

    function setMultiSigWallet(address _multiSigWallet) external onlyGovernance {
        require(_multiSigWallet != address(0), 'Vault: zero address');
        multiSigWallet = _multiSigWallet;
        emit UpdateMultiSigWallet(_multiSigWallet);
    }

    function setRewards(address _rewards) external onlyGovernance {
        require(_rewards != address(0), 'Vault: zero address');
        require(_rewards != address(this), 'Vault: cant be self');

        rewards = _rewards;
        emit UpdateRewards(rewards);
    }

    function setLockedProfitDegradation(uint256 _degradation) external onlyGovernance {
        require(_degradation <= DEGRADATION_COEFFICIENT, 'Vault：over maxAvail');

        lockedProfitDegradation = _degradation;
        emit UpdateDegradation(_degradation);
    }

    function setDepositLimit(uint256 limit) external onlyGovernance {
        depositLimit = limit;
        emit UpdateDepositLimit(limit);
    }

    function setPerformanceFee(uint256 fee) external onlyGovernance {
        require(fee <= MAX_BPS / 2, 'Vault：over maxAvail');

        performanceFee = fee;
        emit UpdatePerformanceFee(fee);
    }

    function setManagementFee(uint256 fee) external onlyGovernance {
        require(fee <= MAX_BPS / 2, 'Vault：over maxAvail');

        managementFee = fee;
        emit UpdateManagementFee(fee);
    }

    function setGuardian(address _guardian) external {
        require(msg.sender == governance || msg.sender == guardian, 'Vault：not governance or guardian');
        require(_guardian != address(0), 'Vault: zero address');
        
        guardian = _guardian;
        emit UpdateGuardian(_guardian);
    }

    function setEmergencyShutdown(bool active) external {
        if (active) {
            require(msg.sender == governance || msg.sender == guardian, 'Vault：not governance or guardian');
        } else {
           require(msg.sender == governance, 'Vault：not governance'); 
        }

        emergencyShutdown = active;
        emit EmergencyShutdown(active);
    }

    function setWithdrawalQueue(address[MAXIMUM_STRATEGIES] memory queue) external {
        require(msg.sender == governance || msg.sender == management, 'Vault：not governance or management');
        
        address[] memory oldQueue = new address[](MAXIMUM_STRATEGIES);
        for (uint i; i < MAXIMUM_STRATEGIES; i++) {
            oldQueue[i] = withdrawalQueue[i];
            if (queue[i] == address(0)) {
                assert(oldQueue[i] == address(0));
                break;
            }
            assert(oldQueue[i] != address(0));
            require(strategies[queue[i]].activation > 0, 'Vault: not activated');

            bool existsInOldQueue = false;
            for (uint j; j < MAXIMUM_STRATEGIES; j++) {
                if (queue[j] == address(0)) {
                    existsInOldQueue = true;
                    break;
                } 
                if (queue[i] == oldQueue[j]) {
                    existsInOldQueue = true;
                } 

                if (j <= i) {
                    continue;
                }
                    
                assert(queue[i] != queue[j]);
            }

            assert(existsInOldQueue); 
            withdrawalQueue[i] = queue[i];
        }
        
        emit UpdateWithdrawalQueue(queue);
    }

    function _totalAssets() internal view returns (uint256 totalAssets) {
        totalAssets = IERC20(token).balanceOf(address(this)) + totalDebt;
    }

    function getTotalAssets() external override view returns (uint256 totalAssets) {
        return _totalAssets();
    }

    function _calculateLockedProfit() public view returns (uint256 _lockedProfit) {
        uint256 lockedFundsRatio = (block.timestamp - lastReport) * lockedProfitDegradation;
        if(lockedFundsRatio < DEGRADATION_COEFFICIENT) {
            _lockedProfit = lockedProfit;
            _lockedProfit = _lockedProfit - (
                    lockedFundsRatio
                    .mul(_lockedProfit)
                    / DEGRADATION_COEFFICIENT
            );
        }
    }

    function _issueSharesForAmount(address to, uint256 amount) internal returns (uint256 shares) {
        uint256 _totalSupply = totalSupply;
        if (_totalSupply > 0) {
            uint256 freeFunds = _totalAssets() - _calculateLockedProfit();
            shares = amount.mul(_totalSupply) / freeFunds;
        } else {
            shares = amount;
        }

        require(shares != 0, 'Vault: zero shares'); // dev: division rounding resulted in zero
        _mint(to, shares);
    }

    function deposit(uint256 amount, address recipient) external override returns (uint256 shares) {
        require(!emergencyShutdown, 'Vault: in emergency');
        require(recipient != address(0), 'Vault: zero address');
        require(recipient != address(this), 'Vault: cant be self');
        require(amount > 0, 'Vault: illegal amount');
        require(_totalAssets() + amount <= depositLimit, 'Vault: over depositLimit');

        shares = _issueSharesForAmount(recipient, amount);

        TransferHelper.safeTransferFrom(token, msg.sender, address(this), amount);
    }

    function _shareValue(uint256 shares) internal view returns (uint256 value) {
        if (totalSupply == 0) {
            return shares;
        }

        uint256 freeFunds = _totalAssets() - _calculateLockedProfit();

        value = shares.mul(freeFunds) / totalSupply;
    }

    function _sharesForAmount(uint256 amount) internal view returns(uint256 shares) {
        uint256 freeFunds = _totalAssets() - _calculateLockedProfit();
        if (freeFunds > 0) {
            shares =  amount.mul(totalSupply) / freeFunds;
        }
    }

    function maxAvailableShares() external override view returns (uint256 shares) {
        shares = _sharesForAmount(IERC20(token).balanceOf(address(this)));

        for (uint i; i < withdrawalQueue.length; i++) {
            address strategy = withdrawalQueue[i];
            if (strategy == address(0)) {
                break;
            }
            shares = shares + _sharesForAmount(strategies[strategy].totalDebt);
        }
    }

    function _reportLoss(address strategy, uint256 loss) internal {
        uint256 _totalDebt = strategies[strategy].totalDebt;
        require(_totalDebt >= loss, 'Vault: invalid loss');
        
        if (debtRatio != 0) {
            uint256 ratioChange = Math.min(
                loss * debtRatio / totalDebt, 
                strategies[strategy].debtRatio
            );

            strategies[strategy].debtRatio -= ratioChange;
            debtRatio -= ratioChange;
        }

        strategies[strategy].totalLoss += loss;
        strategies[strategy].totalDebt = _totalDebt - loss;
        totalDebt -= loss;
    }

    function withdraw(uint256 shares, address recipient, uint256 maxLoss) external override nonReentrant returns (uint256 value) {
        require(maxLoss <= MAX_BPS, 'Vault: invalid maxLoss');
        require(shares <= balanceOf[msg.sender], 'Vault: insufficient balance');
        require(shares > 0, 'Vault: invalid shares');

        value = _shareValue(shares);

        if (value > IERC20(token).balanceOf(address(this))) {
            uint256 totalLoss;
            for (uint i; i < withdrawalQueue.length; i++) {
                address strategy = withdrawalQueue[i];
                if (strategy == address(0)) {
                    break;
                }

                uint256 vaultBalance = IERC20(token).balanceOf(address(this));
                if (value <= vaultBalance) {
                    break;
                }

                uint256 amountNeeded = value - vaultBalance;
                amountNeeded = Math.min(amountNeeded, strategies[strategy].totalDebt);
                if (amountNeeded == 0) {
                    continue;
                }

                uint256 loss = Strategy(strategy).withdraw(amountNeeded);
                uint256 withdrawn = IERC20(token).balanceOf(address(this)) - vaultBalance;

                if (loss > 0) {
                    value -= loss;
                    totalLoss += loss;
                    _reportLoss(strategy, loss);
                }

                strategies[strategy].totalDebt -= withdrawn;
                totalDebt -= withdrawn;
            }

            uint256 vaultBalance = IERC20(token).balanceOf(address(this));
            if (value > vaultBalance) {
                value = vaultBalance;
                shares = _sharesForAmount(value + totalLoss);
            }

            require(totalLoss <= maxLoss * (value + totalLoss) / MAX_BPS, 'Vault: over acceptable loss');
        }

        _burn(msg.sender, shares);
        TransferHelper.safeTransfer(token, recipient, value);
    }

    function getPricePerShare() external override view returns (uint256 pricePerShare) {
        pricePerShare = _shareValue(10 ** uint256(decimals));
    }

    function _organizeWithdrawalQueue() internal {
        uint256 offset;
        for (uint i; i < MAXIMUM_STRATEGIES; i++) {
            address strategy = withdrawalQueue[i];
            if (strategy == address(0)) {
                offset += 1;
            } else if (offset > 0) {
                withdrawalQueue[i - offset] = strategy;
                withdrawalQueue[i] = address(0);
            }
        }
    }

    function addStrategy(address strategy, uint256 _debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 _performanceFee) external {
        require(withdrawalQueue[MAXIMUM_STRATEGIES - 1] == address(0), 'Vault: queue is full');

        require(!emergencyShutdown, 'Vault: in emergency');
        require(msg.sender == governance, 'Vault: not governance');

        require(strategy != address(0), 'Vault: zero address');
        require(strategies[strategy].activation == 0, 'Vault: activated');
        require(Strategy(strategy).vault() == address(this), 'Vault: invalid vault');
        require(token == Strategy(strategy).want(), 'Vault: invalid want');

        require(debtRatio + _debtRatio <= MAX_BPS, 'Vault: over maxAvail');
        require(minDebtPerHarvest <= maxDebtPerHarvest, 'Vault: min > max');
        require(_performanceFee <= MAX_BPS / 2, 'Vault: over maxAvail');

        strategies[strategy] = StrategyParams({
            performanceFee: _performanceFee,
            activation: block.timestamp,
            debtRatio: _debtRatio,
            minDebtPerHarvest: minDebtPerHarvest,
            maxDebtPerHarvest: maxDebtPerHarvest,
            lastReport: block.timestamp,
            totalDebt: 0,
            totalGain: 0,
            totalLoss: 0
        });

        emit StrategyAdded(strategy, _debtRatio, minDebtPerHarvest, maxDebtPerHarvest, _performanceFee);

        debtRatio += _debtRatio;

        withdrawalQueue[MAXIMUM_STRATEGIES - 1] = strategy;
        _organizeWithdrawalQueue();
    }

    function updateStrategyDebtRatio(address strategy, uint256 _debtRatio) external {
        require(msg.sender == management || msg.sender == governance, 'Vault: not governance or management');
        require(strategies[strategy].activation > 0, 'Vault: not activated');

        debtRatio -= strategies[strategy].debtRatio;
        strategies[strategy].debtRatio = _debtRatio;
        debtRatio += _debtRatio;

        require(debtRatio <= MAX_BPS, 'Vault: over maxAvail');
        emit StrategyUpdateDebtRatio(strategy, _debtRatio);
    }

    function updateStrategyMinDebtPerHarvest(address strategy, uint256 minDebtPerHarvest) external {
        require(msg.sender == management || msg.sender == governance, 'Vault: not governance or management');
        require(strategies[strategy].activation > 0, 'Vault: not activated');
        require(strategies[strategy].maxDebtPerHarvest >= minDebtPerHarvest, 'Vault: min > max');

        strategies[strategy].minDebtPerHarvest = minDebtPerHarvest;
        emit StrategyUpdateMinDebtPerHarvest(strategy, minDebtPerHarvest);
    }

    function updateStrategyMaxDebtPerHarvest(address strategy, uint256 maxDebtPerHarvest) external {
        require(msg.sender == management || msg.sender == governance, 'Vault: not governance or management');
        require(strategies[strategy].activation > 0, 'Vault: not activated');
        require(strategies[strategy].minDebtPerHarvest <= maxDebtPerHarvest, 'Vault: min > max');

        strategies[strategy].maxDebtPerHarvest = maxDebtPerHarvest;
        emit StrategyUpdateMaxDebtPerHarvest(strategy, maxDebtPerHarvest);
    }

    function updateStrategyPerformanceFee(address strategy, uint256 _performanceFee) external {
        require(msg.sender == governance, 'Vault: not governance');
        require(strategies[strategy].activation > 0, 'Vault: not activated');
        require(_performanceFee <= MAX_BPS / 2, 'Vault: over maxAvail');

        strategies[strategy].performanceFee = _performanceFee;
        emit StrategyUpdatePerformanceFee(strategy, _performanceFee);
    }

    function _revokeStrategy(address strategy) internal {
        debtRatio -= strategies[strategy].debtRatio;
        strategies[strategy].debtRatio = 0;
        emit StrategyRevoked(strategy);
    }

    function migrateStrategy(address oldVersion, address newVersion) external {
        require(msg.sender == governance, 'Vault: not governance');
        require(newVersion != address(0), 'Vault: zero address');
        require(strategies[oldVersion].activation > 0, 'Vault: old not activated');
        require(strategies[newVersion].activation == 0, 'Vault: new activated');

        StrategyParams memory strategy = strategies[oldVersion];

        _revokeStrategy(oldVersion);
        debtRatio += strategy.debtRatio;
        strategies[oldVersion].totalDebt = 0;

        strategies[newVersion] = StrategyParams({
            performanceFee: strategy.performanceFee,
            activation: strategy.lastReport,
            debtRatio: strategy.debtRatio,
            minDebtPerHarvest: strategy.minDebtPerHarvest,
            maxDebtPerHarvest: strategy.maxDebtPerHarvest,
            lastReport: strategy.lastReport,
            totalDebt: strategy.totalDebt,
            totalGain: 0,
            totalLoss: 0
        });

        Strategy(oldVersion).migrate(newVersion);
        emit StrategyMigrated(oldVersion, newVersion);

        for (uint i; i < MAXIMUM_STRATEGIES; i++) {
            if (withdrawalQueue[i] == oldVersion) {
                withdrawalQueue[i] = newVersion;
                return;
            }
        }
    }

    function revokeStrategy(address strategy) external {
        require(msg.sender == strategy || msg.sender == governance || msg.sender == guardian, 'Vault: not governance or guardian or strategy self');
        // require(strategies[strategy].debtRatio != 0, 'Vault: already zero');
        if (strategies[strategy].debtRatio == 0) {
            return;
        }  

        _revokeStrategy(strategy);
    }

    function addStrategyToQueue(address strategy) external {
        require(msg.sender == management || msg.sender == governance, 'Vault: not governance or management');
        require(strategies[strategy].activation > 0, 'Vault: not activated');

        uint256 lastIdx;
        for (uint i; i < MAXIMUM_STRATEGIES; i++) {
            address s = withdrawalQueue[i];
            if (s == address(0)) {
                break;
            }
            require(s != strategy, 'Vault: already in');
            lastIdx += 1;
        }
        require(lastIdx < MAXIMUM_STRATEGIES, 'Vault: full');

        withdrawalQueue[MAXIMUM_STRATEGIES - 1] = strategy;
        _organizeWithdrawalQueue();
        emit StrategyAddedToQueue(strategy);
    }

    function removeStrategyFromQueue(address strategy) external {
        require(msg.sender == management || msg.sender == governance, 'Vault: not governance or management');

        for (uint idx; idx < MAXIMUM_STRATEGIES; idx++) {
            if (withdrawalQueue[idx] == strategy) {
                withdrawalQueue[idx] = address(0);
                _organizeWithdrawalQueue();
                emit StrategyRemovedFromQueue(strategy);
                return;
            }
        }
    }

    function _debtOutstanding(address strategy) internal view returns (uint256 debt) {
        if (debtRatio == 0) {
            return strategies[strategy].totalDebt;
        }

        uint256 strategyDebtLimit = strategies[strategy].debtRatio * _totalAssets() / MAX_BPS;
        uint256 strategyTotalDebt = strategies[strategy].totalDebt;

        if (emergencyShutdown) {
            debt = strategyTotalDebt;
        } else if (strategyTotalDebt <= strategyDebtLimit) {
            debt = 0;
        } else {
            debt = strategyTotalDebt - strategyDebtLimit;
        }
    }

    function getDebtOutstanding(address strategy) external override view returns (uint256 debt) {
        return _debtOutstanding(strategy);
    }

    function _creditAvailable(address strategy) internal view returns (uint256 credit) {
        if (emergencyShutdown) {
            return 0;
        }

        uint256 vaultTotalAssets = _totalAssets();
        uint256 vaultDebtLimit =  debtRatio * vaultTotalAssets / MAX_BPS ;
        uint256 vaultTotalDebt = totalDebt;
        uint256 strategyDebtLimit = strategies[strategy].debtRatio * vaultTotalAssets / MAX_BPS;
        uint256 strategyTotalDebt = strategies[strategy].totalDebt;
        uint256 strategyMinDebtPerHarvest = strategies[strategy].minDebtPerHarvest;
        uint256 strategyMaxDebtPerHarvest = strategies[strategy].maxDebtPerHarvest;

        if (strategyDebtLimit <= strategyTotalDebt || vaultDebtLimit <= vaultTotalDebt) {
            return 0;
        }

        uint256 available = strategyDebtLimit - strategyTotalDebt;
        available = Math.min(available, vaultDebtLimit - vaultTotalDebt);
        available = Math.min(available, IERC20(token).balanceOf(address(this)));

        if (available < strategyMinDebtPerHarvest) {
            credit = 0;
        } else {
            credit = Math.min(available, strategyMaxDebtPerHarvest);
        }   
    }

    function getCreditAvailable(address strategy) external override view returns (uint256 credit) {
        return _creditAvailable(strategy);
    }

    function expectedReturn(address strategy) public view returns (uint256 _expectedReturn) {
        uint256 strategyLastReport = strategies[strategy].lastReport;
        uint256 timeSinceLastHarvest = block.timestamp - strategyLastReport;
        uint256 totalHarvestTime = strategyLastReport - strategies[strategy].activation;

        if (timeSinceLastHarvest > 0 && totalHarvestTime > 0 && Strategy(strategy).isActive()) {
            _expectedReturn =  strategies[strategy].totalGain.mul(timeSinceLastHarvest) / totalHarvestTime;
        }
    }

    function getAvailableDepositLimit() external override view returns (uint256 availableDeposit) {
        uint256 totalAssets = _totalAssets();
        uint256 _depositLimit = depositLimit;

        if (_depositLimit > totalAssets) {
            availableDeposit = _depositLimit - totalAssets;
        }
    }

    function _assessFees(address strategy, uint256 gain) internal returns (uint256 totalFee) {
        uint256 duration = block.timestamp - strategies[strategy].lastReport;
        require(duration != 0, 'Vault: !duration');

        if (gain == 0) {
            return 0;
        }

        uint256 _managementFee = (
            strategies[strategy].totalDebt - Strategy(strategy).delegatedAssets())
            * duration 
            * managementFee
            / MAX_BPS
            / SECS_PER_YEAR;

        uint256 _strategistFee = gain * strategies[strategy].performanceFee / MAX_BPS;
        uint256 _performanceFee = gain * performanceFee / MAX_BPS;

        totalFee = _performanceFee + _strategistFee + _managementFee;
        if (totalFee > gain) {
            totalFee = gain;
        }
        if (totalFee > 0) {
            uint256 reward = _issueSharesForAmount(address(this), totalFee);

            if (_strategistFee > 0) {
                uint256 strategistReward = _strategistFee * reward / totalFee;

                _transfer(address(this), strategy, strategistReward);
            }

            if (balanceOf[address(this)] > 0)  {
                _transfer(address(this), rewards, balanceOf[address(this)]);
            }
        }
    }

    function report(uint256 gain, uint256 loss, uint256 _debtPayment) external override returns (uint256 debt) {
        require(strategies[msg.sender].activation > 0, 'Vault: not activated');
        require(IERC20(token).balanceOf(msg.sender) >= gain + _debtPayment, 'Vault: insufficient balance');

        if (loss > 0) {
            _reportLoss(msg.sender, loss);
        }

        uint256 totalFees = _assessFees(msg.sender, gain);

        strategies[msg.sender].totalGain += gain;

        uint256 credit = _creditAvailable(msg.sender);

        debt = _debtOutstanding(msg.sender);
        uint256 debtPayment = Math.min(_debtPayment, debt);

        if (debtPayment > 0) {
            strategies[msg.sender].totalDebt -= debtPayment;
            totalDebt -= debtPayment;
            debt -= debtPayment;
        }

        if (credit > 0) {
            strategies[msg.sender].totalDebt += credit;
            totalDebt = totalDebt + credit;
        }

        uint256 totalAvail = gain + _debtPayment;
        if (totalAvail < credit) {
            TransferHelper.safeTransfer(token, msg.sender, credit - totalAvail);
        } else if (totalAvail > credit) {
            TransferHelper.safeTransferFrom(token, msg.sender, address(this), totalAvail - credit);
        }

        uint256 lockedProfitBeforeLoss = _calculateLockedProfit() + gain - totalFees;
        if (lockedProfitBeforeLoss > loss) {
            lockedProfit = lockedProfitBeforeLoss - loss;
        } else {
            lockedProfit = 0;
        }

        strategies[msg.sender].lastReport = block.timestamp;
        lastReport = block.timestamp;
            
        emit StrategyReported(
            msg.sender,
            gain,
            loss,
            debtPayment,
            strategies[msg.sender].totalGain,
            strategies[msg.sender].totalLoss,
            strategies[msg.sender].totalDebt,
            credit,
            strategies[msg.sender].debtRatio
        );

        if (strategies[msg.sender].debtRatio == 0 || emergencyShutdown) {
            debt = Strategy(msg.sender).estimatedTotalAssets();
        }
    }

    function sweep(address _token, uint256 amount) external override onlyMultiSigWallet {
        // require(msg.sender == governance, 'Vault: not governance');
        require(_token != token, 'Vault: invalid token');
        
        TransferHelper.safeTransfer(_token, governance, amount);
    }

    function append(string memory a, string memory b) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }

}