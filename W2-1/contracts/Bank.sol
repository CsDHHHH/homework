//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";


contract Bank {
    
    address public owner;
    uint public amount;
    
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    constructor() public{
        owner = msg.sender;
    }

    function deposit() public payable { 
        amount += msg.value;
    }

    function getBalance() public view returns(uint256) {
        return address(this).balance;
    }

    function getAmount() public view returns(uint256) {
        return amount;
    }

    function withdraw() onlyOwner public {
        payable(msg.sender).transfer(amount);
        amount = 0;
    }

}
