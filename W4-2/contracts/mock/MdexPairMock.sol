// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MdexPairMock is ERC20 {

    address public token0;
    address public token1;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;   

    constructor() public ERC20("Mdex Lp Token", "HMDX") {
        
    }

    function initialize(address _token0, address _token1) public {
        token0 = _token0;
        token1 = _token1;
    }

    function _update() private {
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
    }

    function mint(address to, uint256 amount) external returns (uint liquidity) {
        (uint112 _reserve0, ,) = getReserves(); // gas savings
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = amount;
        } else {
            liquidity = amount.mul(_totalSupply) / _reserve0;
        }
        _mint(to, liquidity);

        _update();
    }

    function swap(address to, address out, uint256 amountOut) external {
        IERC20(out).transfer(to, amountOut);

        _update();
    }
 
    function setReserves(uint112 _reserve0, uint112 _reserve1) external {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast;
    }

}