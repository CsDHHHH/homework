pragma solidity 0.6.12;

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);

    function createPair(address tokenA, address tokenB) external returns (address pair);
}


contract MyTokenMarket {


    IUniswapV2Router02 internal constant router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    function getExpectedBuyAmt(
        address[] memory paths,
        uint sellAmt
    ) internal view returns(uint buyAmt) {
        uint[] memory amts = router.getAmountsOut(
            sellAmt,
            paths
        );
        buyAmt = amts[1];
    }

    function getExpectedSellAmt(
        address[] memory paths,
        uint buyAmt
    ) internal view returns(uint sellAmt) {
        uint[] memory amts = router.getAmountsIn(
            buyAmt,
            paths
        );
        sellAmt = amts[0];
    }

    function checkPair(
        address[] memory paths
    ) internal view {
        address pair = IUniswapV2Factory(router.factory()).getPair(paths[0], paths[1]);
        require(pair != address(0), "No-exchange-address");
    }

    function getPaths(
        address buyAddr,
        address sellAddr
    ) internal pure returns(address[] memory paths) {
        paths = new address[](2);
        paths[0] = address(sellAddr);
        paths[1] = address(buyAddr);
    }

    function getMinAmount(
        TokenInterface token,
        uint amt,
        uint slippage
    ) internal view returns(uint minAmt) {
        uint _amt18 = convertTo18(token.decimals(), amt);
        minAmt = wmul(_amt18, sub(WAD, slippage));
        minAmt = convert18ToDec(token.decimals(), minAmt);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint _amt,
        uint unitAmt,
        uint slippage
    ) internal returns (uint _amtA, uint _amtB, uint _liquidity) {
        (TokenInterface _tokenA, TokenInterface _tokenB) = changeEthAddress(tokenA, tokenB);

        _amtA = _amt == uint(-1) ? getTokenBal(TokenInterface(tokenA)) : _amt;
        _amtB = convert18ToDec(_tokenB.decimals(), wmul(unitAmt, convertTo18(_tokenA.decimals(), _amtA)));

        bool isEth = address(_tokenA) == wethAddr;
        convertEthToWeth(isEth, _tokenA, _amtA);

        isEth = address(_tokenB) == wethAddr;
        convertEthToWeth(isEth, _tokenB, _amtB);

        approve(_tokenA, address(router), _amtA);
        approve(_tokenB, address(router), _amtB);

       uint minAmtA = getMinAmount(_tokenA, _amtA, slippage);
        uint minAmtB = getMinAmount(_tokenB, _amtB, slippage);
       (_amtA, _amtB, _liquidity) = router.addLiquidity(
            address(_tokenA),
            address(_tokenB),
            _amtA,
            _amtB,
            minAmtA,
            minAmtB,
            address(this),
            block.timestamp + 1
        );
    }

    function _removeLiquidity(
        address tokenA,
        address tokenB,
        uint _amt,
        uint unitAmtA,
        uint unitAmtB
    ) internal returns (uint _amtA, uint _amtB, uint _uniAmt) {
        TokenInterface _tokenA;
        TokenInterface _tokenB;
        (_tokenA, _tokenB, _uniAmt) = _getRemoveLiquidityData(
            tokenA,
            tokenB,
            _amt
        );
        {
        uint minAmtA = convert18ToDec(_tokenA.decimals(), wmul(unitAmtA, _uniAmt));
        uint minAmtB = convert18ToDec(_tokenB.decimals(), wmul(unitAmtB, _uniAmt));
        (_amtA, _amtB) = router.removeLiquidity(
            address(_tokenA),
            address(_tokenB),
            _uniAmt,
            minAmtA,
            minAmtB,
            address(this),
            block.timestamp + 1
        );
        }

        bool isEth = address(_tokenA) == wethAddr;
        convertWethToEth(isEth, _tokenA, _amtA);

        isEth = address(_tokenB) == wethAddr;
        convertWethToEth(isEth, _tokenB, _amtB);
    }

    function _getRemoveLiquidityData(
        address tokenA,
        address tokenB,
        uint _amt
    ) internal returns (TokenInterface _tokenA, TokenInterface _tokenB, uint _uniAmt) {
        (_tokenA, _tokenB) = changeEthAddress(tokenA, tokenB);
        address exchangeAddr = IUniswapV2Factory(router.factory()).getPair(address(_tokenA), address(_tokenB));
        require(exchangeAddr != address(0), "pair-not-found.");

        TokenInterface uniToken = TokenInterface(exchangeAddr);
        _uniAmt = _amt == uint(-1) ? uniToken.balanceOf(address(this)) : _amt;
        approve(uniToken, address(router), _uniAmt);
    }
    
    function deposit(
        address tokenA,
        address tokenB,
        uint256 amtA,
        uint256 unitAmt,
        uint256 slippage,
        uint256 getId,
        uint256 setId
    ) external payable  {
        uint _amt = getUint(getId, amtA);

        (uint _amtA, uint _amtB, uint _uniAmt) = _addLiquidity(
                                            tokenA,
                                            tokenB,
                                            _amt,
                                            unitAmt,
                                            slippage
                                        );
    }

    function buy(
        address buyAddr,
        address sellAddr,
        uint256 buyAmt,
        uint256 unitAmt,
        uint256 getId,
        uint256 setId
    ) external payable  {
        uint _buyAmt = getUint(getId, buyAmt);
        (TokenInterface _buyAddr, TokenInterface _sellAddr) = changeEthAddress(buyAddr, sellAddr);
        address[] memory paths = getPaths(address(_buyAddr), address(_sellAddr));

        uint _slippageAmt = convert18ToDec(_sellAddr.decimals(),
            wmul(unitAmt, convertTo18(_buyAddr.decimals(), _buyAmt))
        );

        checkPair(paths);
        uint _expectedAmt = getExpectedSellAmt(paths, _buyAmt);
        require(_slippageAmt >= _expectedAmt, "Too much slippage");

        bool isEth = address(_sellAddr) == wethAddr;
        convertEthToWeth(isEth, _sellAddr, _expectedAmt);
        approve(_sellAddr, address(router), _expectedAmt);

        uint _sellAmt = router.swapTokensForExactTokens(
            _buyAmt,
            _expectedAmt,
            paths,
            address(this),
            block.timestamp + 1
        )[0];

        isEth = address(_buyAddr) == wethAddr;
        convertWethToEth(isEth, _buyAddr, _buyAmt)；
    }



}