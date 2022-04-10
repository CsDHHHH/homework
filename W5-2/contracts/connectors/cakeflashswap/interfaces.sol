pragma solidity >=0.7.0;
pragma experimental ABIEncoderV2;

interface IUniFlashSwapInterface {
    function swapCalc(address loanToken, address repayToken, uint loanAmount) 
            external view returns(address pair,bool loanTokenSortBefore, uint repayAmount);
    function initiateFlashSwap(address pair, address loanToken,address repayToken, uint256 loanAmount, uint256 repayAmount,bool loanTokenSortBefore, bytes calldata data) external;
}

interface AccountInterface {
    function enable(address) external;
    function disable(address) external;
}

interface CTokenInterface {
    function borrowBalanceCurrent(address account) external returns (uint);
}
