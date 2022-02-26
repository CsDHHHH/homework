pragma solidity ^0.8.0;

import "hardhat/console.sol";
// SPDX-Lincense-Identifier:MIT

contract Counter {
    uint public counter;

    constructor(uint x) {
        counter = x;
    }

    function count() public {
        counter = counter + 1; 
        console.log("counter:", counter);
    }
    function add(uint x) public {
        counter = counter + x;
    }
}