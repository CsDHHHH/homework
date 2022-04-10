pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

/**
 * @title Instapool.
 * @dev Inbuilt Flash Loan in DSA
 */

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { AccountInterface, IUniFlashSwapInterface, CTokenInterface} from "./interfaces.sol";
import { DSMath } from "../../common/math.sol";
import { Stores } from "../../common/stores.sol";

contract UinswapFlashSwapResolver is DSMath, Stores {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    address public immutable flashSwap;    
    constructor(address _flashSwap) {
        flashSwap = _flashSwap;
    }

    function flashBorrowAndCast(
        address loanCToken,
        address loanToken,
        address repayToken,
        uint loanAmount,
        uint route,
        bytes memory data,
        uint setId
    ) external payable {
        AccountInterface(address(this)).enable(flashSwap);
        // 将这里的编码工作放在链下，节省gas费
        // (string[] memory _targets, bytes[] memory callDatas) = abi.decode(data, (string[], bytes[]));
        // bytes memory callData = abi.encodeWithSignature("cast(string[],bytes[],address)", _targets, callDatas, address(instaPool));

        CTokenInterface cTokenContract = CTokenInterface(loanCToken);
        loanAmount = loanAmount == uint(-1) ? cTokenContract.borrowBalanceCurrent(address(this)) : loanAmount;

        // 计算repayAmunt，通过dsa传值
        (address pair, bool loanTokenSortBefore, uint repayAmount) = IUniFlashSwapInterface(flashSwap).swapCalc(loanToken, repayToken, loanAmount);
        setUint(setId, repayAmount);

        IUniFlashSwapInterface(flashSwap).initiateFlashSwap(pair,loanToken,repayToken, loanAmount,repayAmount,loanTokenSortBefore , data);

        AccountInterface(address(this)).disable(flashSwap);
    }

    /**
     * @dev Return token to InstaPool.
     * @param token Token Address.
     * @param amt Token Amount.
     * @param getId Get token amount at this ID from `InstaMemory` Contract.
     * @param setId Set token amount at this ID in `InstaMemory` Contract.
    */
    function flashPayback(
        address token,
        uint amt,
        uint getId,
        uint setId
    ) external payable {
        uint _amt = getUint(getId, amt);
        
        IERC20 tokenContract = IERC20(token);

        if (token == ethAddr) {
            Address.sendValue(payable(flashSwap), _amt);
        } else {
            tokenContract.safeTransfer(flashSwap, _amt);
        }

        setUint(setId, _amt);
    }

}

contract ConnectV2FlashSwap is UniFlashSwapResolver {
    string public name = "FlashSwap-v1.1";
    constructor(address _flashSwap) FlashSwapResolver(_flashSwap) {}
}
