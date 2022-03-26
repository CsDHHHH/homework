// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MdexPairMock.sol";

contract MdexRouterMock {
    
    mapping(address => mapping(address => address)) public pairs;

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);

        bytes memory bytecode = type(MdexPairMock).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        MdexPairMock(pair).initialize(token0, token1);
        
        pairs[token0][token1] = pair;
        pairs[token1][token0] = pair;
    }

    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'DtcswapLibrary: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DtcswapLibrary: ZERO_ADDRESS');
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        require(amountADesired > 0 && amountBDesired > 0, 'DtcswapLibrary: INSUFFICIENT_AMOUNT');
        // for testing convenience
        require(amountADesired == amountBDesired, '!equal');
        address pair = pairs[tokenA][tokenB];

        IERC20(tokenA).transferFrom(msg.sender, pair, amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountBDesired);
        
        liquidity = MdexPairMock(pair).mint(to, amountADesired);

        amountAMin;
        amountBMin;
        deadline;
        amountA;
        amountB;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address _to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        address pair = pairs[path[0]][path[1]];
        IERC20(path[0]).transferFrom(msg.sender, pair, amountIn);

        for (uint i; i < path.length - 1; i++) {
            pair = pairs[path[i]][path[i + 1]];
            address to = i < path.length - 2 ? pairs[path[i + 1]][path[i + 2]] : _to;

            MdexPairMock(pair).swap(to, path[i + 1], amountIn);
        }

        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = amountIn;
        amountOutMin;
        deadline;
    }

    function getAmountsOut(uint256 amountIn, address[] memory path) external pure returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[path.length - 1] = amountIn;
    }

}