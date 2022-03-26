// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity =0.6.12;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';


contract TestToken is ERC20 {
        
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) public {
        _mint(msg.sender, 300000000 * 10**uint256(decimals()));
    }
    
    function mintTokens(uint256 value) public {
        // Mints the defined amount of tokens for the caller
        _mint(msg.sender, value);
    }
    
}
