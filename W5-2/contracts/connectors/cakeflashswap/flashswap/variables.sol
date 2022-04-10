pragma solidity ^0.7.0;

contract Variables {
    address internal dsaAddr = address(0);
    address internal pair;
    address internal loanToken;
    address internal repayToken;
    uint internal loanAmount;
    uint internal repayAmount;
    bool internal loanTokenSortBefore;
}