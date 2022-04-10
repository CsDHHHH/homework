//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ETH Call Opt
contract MyOPTToken is ERC20, Ownable {
  using SafeERC20 for IERC20;

  uint public price;
  address public udstToken;
  uint public settlementTime;
  uint public constant during = 1 days; // 1 day

  constructor(address usdt) ERC20("MyOPTToken", "MOPT") {
    udstToken = usdt;
    price = 10;
    settlementTime = 100 days;
  }

  function mint() external payable onlyOwner {
    _mint(msg.sender, msg.value);
  }

  function settlement(uint amount) external {
    require(block.timestamp >= settlementTime && block.timestamp < settlementTime + during, "invalid time");

    _burn(msg.sender, amount);

    uint needUsdtAmount = price * amount;

    IERC20(udstToken).safeTransferFrom(msg.sender, address(this), needUsdtAmount);
    safeTransferETH(msg.sender, amount);
  }

  function safeTransferETH(address to, uint256 value) internal {
    (bool success, ) = to.call{value: value}(new bytes(0));
    require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');
  }

  function burnAll() external onlyOwner {
    require(block.timestamp >= settlementTime + during, "not end");
    uint usdcAmount = IERC20(udstToken).balanceOf(address(this));
    IERC20(udstToken).safeTransfer(msg.sender, usdtAmount);


    selfdestruct(payable(msg.sender));
    // uint ethAmount = address(this).balance;
    // safeTransferETH(msg.sender, ethAmount);
  }


}