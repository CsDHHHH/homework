// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;

import "./IERC20.sol";

interface IVault is IVERC20 {

    event StrategyAdded(
        address indexed strategy,
        uint256 debtRatio, // Maximum borrow amount (in BPS of total assets)
        uint256 minDebtPerHarvest, // Lower limit on the increase of debt since last harvest
        uint256 maxDebtPerHarvest, // Upper limit on the increase of debt since last harvest
        uint256 performanceFee // Strategist's fee (basis points)
    );

    event StrategyReported(
        address indexed strategy,
        uint256 gain,
        uint256 loss,
        uint256 debtPaid,
        uint256 totalGain,
        uint256 totalLoss,
        uint256 totalDebt,
        uint256 debtAdded,
        uint256 debtRatio
    );

    event PendingGovernance(
        address pendingGovernance
    );

    event UpdateGovernance(
        address governance // New active governance
    );

    event UpdateManagement(
        address management // New active manager
    );

    event UpdateMultiSigWallet(
        address multiSigWallet
    );
    
    event UpdateRewards(
        address rewards // New active rewards recipient
    );

    event UpdateDepositLimit(
        uint256 depositLimit // New active deposit limit
    );

    event UpdatePerformanceFee(
        uint256 performanceFee  // New active performance fee
    );

    event UpdateManagementFee(
        uint256 managementFee // New active management fee
    );

    event UpdateGuardian(
        address guardian // Address of the active guardian
    );

    event EmergencyShutdown(
        bool active // New emergency shutdown state (if false, normal operation enabled)
    );

    event UpdateDegradation(
        uint256 degradation // New active lockedProfitDegradation
    );

    // event UpdateWithdrawalQueue(
    //     address[MAXIMUM_STRATEGIES] queue // New active withdrawal queue
    // );

    event StrategyUpdateDebtRatio(
        address indexed strategy, // Address of the strategy for the debt ratio adjustment
        uint256 debtRatio // The new debt limit for the strategy (in BPS of total assets)
    );

    event StrategyUpdateMinDebtPerHarvest(
        address indexed strategy, // Address of the strategy for the rate limit adjustment
        uint256 minDebtPerHarvest // Lower limit on the increase of debt since last harvest
    );

    event StrategyUpdateMaxDebtPerHarvest(
        address indexed strategy, // Address of the strategy for the rate limit adjustment
        uint256 maxDebtPerHarvest // Upper limit on the increase of debt since last harvest
    );

    event StrategyUpdatePerformanceFee(
        address indexed strategy, // Address of the strategy for the performance fee adjustment
        uint256 performanceFee // The new performance fee for the strategy
    );

    event StrategyMigrated(
        address indexed oldVersion, // Old version of the strategy to be migrated
        address indexed newVersion // New version of the strategy
    );

    event StrategyRevoked(
        address indexed strategy // Address of the strategy that is revoked
    );

    event StrategyRemovedFromQueue(
        address indexed strategy // Address of the strategy that is removed from the withdrawal queue
    );

    event StrategyAddedToQueue(
        address indexed strategy // Address of the strategy that is added to the withdrawal queue
    );

    /// @dev Deposits `_amount` `token`, issuing shares to `recipient`
    /// @param amount The quantity of tokens to deposit
    /// @param recipient The address to issue the shares in this Vault to.
    function deposit(uint256 amount, address recipient) external returns (uint256 shares);

    /// @dev Withdraws the calling account's tokens from this Vault, redeeming amount `_shares` for an appropriate amount of tokens.
	/// @param shares How many shares to try and redeem for tokens, defaults to all.
    /// @param recipient The address to issue the shares in this Vault to
    /// @param maxLoss The maximum acceptable loss to sustain on withdrawal.
    /// @return value The quantity of tokens redeemed for `_shares`
    function withdraw(uint256 shares, address recipient, uint256 maxLoss) external returns (uint256 value);

    /// @dev Reports the amount of assets the calling Strategy has free (usually in terms of ROI).
	/// @param gain Amount Strategy has realized as a gain on it's investment since its last report, and is free to be given back to Vault as earnings
    /// @param loss Amount Strategy has realized as a loss on it's investment since its last report, and should be accounted for on the Vault's balance sheet.
    /// @param _debtPayment Amount Strategy has made available to cover outstanding debt
    /// @return debt Amount of debt outstanding (if totalDebt > debtLimit or emergency shutdown).
    function report(uint256 gain, uint256 loss, uint256 _debtPayment) external returns (uint256 debt);

    /// @dev Removes tokens from this Vault that are not the type of token managed by this Vault.
    /// @param _token token The token to transfer out of this vault.
    /// @param amount amount The quantity or tokenId to transfer out.
    function sweep(address _token, uint256 amount) external;

    function maxAvailableShares() external view returns (uint256 shares);

    /// @dev Returns the total quantity of all assets under control of this Vault, whether they're loaned out to a Strategy, or currently held in the Vault.
    /// @return totalAssets The total assets under control of this Vault.
    function getTotalAssets() external view returns (uint256 totalAssets);
    
    /// @dev Gives the price for a single Vault share.
    /// @return pricePerShare The value of a single share.
    function getPricePerShare() external view returns (uint256 pricePerShare);

    /// @dev Determines if `strategy` is past its debt limit and if any tokens should be withdrawn to the Vault.
    /// @return debt The quantity of tokens to withdraw
    function getDebtOutstanding(address strategy) external view returns (uint256 debt);

    /// @dev Amount of tokens in Vault a Strategy has access to as a credit line.
    /// @return credit The quantity of tokens available for the Strategy to draw on.
    function getCreditAvailable(address strategy) external view returns (uint256 credit);

    /// @return availableDeposit The quantity of tokens available to deposit.
    function getAvailableDepositLimit() external view returns (uint256 availableDeposit);

    // function apiVersion() external pure returns (string memory);
    
    // function token() external view returns (address);

    // function strategies(address _strategy) external view returns (StrategyParams memory);

    // function depositLimit() external view returns (uint256);

    // function expectedReturn(address _strategy) external view returns (uint256);

    // function revokeStrategy(address _strategy) external;

    // function governance() external view returns (address);

    // function management() external view returns (address);

    // function guardian() external view returns (address);
    
}