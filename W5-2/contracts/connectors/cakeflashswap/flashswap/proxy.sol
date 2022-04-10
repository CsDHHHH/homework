// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";

contract CakeFlashSwapProxy is TransparentUpgradeableProxy {
    constructor(address _logic, address admin_, bytes memory _data) public TransparentUpgradeableProxy(_logic, admin_, _data) {}
}