// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { 
    IUniswapV2Callee,
    IUniswapV2Pair,
    IUniswapV2Factory,
    ListInterface,
    TokenInterface
} from "./interfaces.sol";
import "./variables.sol";

contract UniFlashSwap is IUniswapV2Callee,Variables{
    ListInterface public constant unionDefiList = ListInterface(0x7355E5386b486aa70a6697F9596eaC83E5993f0E); 
    modifier isDSA {
        uint64 id = unionDefiList.accountID(msg.sender);
        require(id != 0, "not-dsa-id");
        _;
    }

    address public constant ethAddr = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;  
    address public constant wethAddr = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; 
    TokenInterface constant whtContract = TokenInterface(whtAddr); 
    IUniswapV2Factory public constant uniFactory =  IUniswapV2Factory(0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73);

    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function swapCalc(address loanToken, address repayToken, uint loanAmount) 
            external view returns(address pair,bool loanTokenSortBefore, uint repayAmount){
        // 确定loanToken与repayToken的顺序
        address tokenA = loanToken == ethAddr? wethAddr: loanToken;
        address tokenB = repayToken == ethAddr? wethAddr: repayToken;
        require(tokenA != address(0), 'tokenA is zero');
        require(tokenB != address(0), 'tokenB is zero');
        loanTokenSortBefore = tokenA < tokenB;
        // 获取reserve
        pair = uniFactory.getPair(tokenA,tokenB);
        require(pair != address(0),"pair address is zero");
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        (uint reserveOut,uint reserveIn) = loanTokenSortBefore?(reserve0,reserve1):(reserve1,reserve0);
        // 计算repayAmount，参考uni
        require(loanAmount > 0, 'loanAmount <= 0');
        require(reserveIn > 0 && reserveOut > 0, 'INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn.mul(loanAmount).mul(10000);
        uint denominator = reserveOut.sub(loanAmount).mul(9975);
        repayAmount = (numerator / denominator).add(1);
    }
    
    // 不同的链，此处的接口不一样
    function pancakeCall(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        require(msg.sender == pair, "msg.sender != pair");
        require(dsaAddr != address(0), "dsaAddr == address(0)");
        require(amount0 == 0 || amount1 == 0, "no (amount0 == 0 || amount1 == 0)");

        if (loanToken == htAddr) {
            whtContract.withdraw(loanAmount);
            payable(dsaAddr).transfer(loanAmount);
            // (bool success,) = dsaAddr.call{value : loanAmount}(new bytes(0));
            // require(success, 'TransferHelper: ETH_TRANSFER_FAILED');
        } else {
            IERC20(loanToken).safeTransfer(dsaAddr, loanAmount);
        }

        Address.functionCall(dsaAddr, data, "DSA-flashloan-fallback-failed");

        if (repayToken == htAddr) {
            repayToken = whtAddr;
            whtContract.deposit{value: address(this).balance}();
        }

        IERC20 tokenContract = IERC20(repayToken); 
        require(tokenContract.balanceOf(address(this)) >= repayAmount, "DSA flashloan: Insufficient balance");   
        tokenContract.safeTransfer(msg.sender, repayAmount); 
    }

    function initiateFlashSwap(	
        address _pair,
        address _loanToken,
        address _repayToken,	
        uint256 _loanAmount,
        uint256 _repayAmount,
        bool _loanTokenSortBefore,
        // uint256 route,
        bytes calldata data
    ) external virtual isDSA {	
        pair = _pair;
        loanToken = _loanToken;
        repayToken = _repayToken;
        loanAmount = _loanAmount;
        repayAmount = _repayAmount;
        loanTokenSortBefore = _loanTokenSortBefore;

        dsaAddr = msg.sender;
        (uint amount0Out,uint amount1Out) = loanTokenSortBefore?(loanAmount,uint(0)):(uint(0),loanAmount);      
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), data);
        dsaAddr = address(0);
    }
}

contract CakeFlashSwapImplementation is CakeFlashSwap {
    receive() external payable {}
}