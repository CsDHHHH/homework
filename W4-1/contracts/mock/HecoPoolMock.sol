// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract HecoPoolMock {
    using SafeMath for uint256;

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. MDXs to distribute per block.
        uint256 lastRewardBlock;  // Last block number that MDXs distribution occurs.
        uint256 accMdxPerShare; // Accumulated MDXs per share, times 1e12.
        uint256 accMultLpPerShare; //Accumulated multLp per share
        uint256 totalAmount;    // Total amount of current pool deposit.
    }
    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt.
        uint256 multLpRewardDebt; //multLp Reward debt.
    }

    IERC20 mdx;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // pid corresponding address
    mapping(address => uint256) public LpOfPid;

    mapping(address => uint256) lastWithdrawBlock; 

    constructor(IERC20 _mdx) public {
        mdx = _mdx;
    }

    function add(IERC20 _lpToken) public {
        uint256 lastRewardBlock = block.number;
        poolInfo.push(PoolInfo({
            lpToken : _lpToken,
            allocPoint : 0,
            lastRewardBlock : lastRewardBlock,
            accMdxPerShare : 0,
            accMultLpPerShare : 0,
            totalAmount : 0
        }));

        LpOfPid[address(_lpToken)] = poolInfo.length - 1;
    }

    function deposit(uint256 _pid, uint256 _amount) external {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        if (_amount > 0) {
            pool.lpToken.transferFrom(msg.sender, address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
    }

    function withdraw(uint256 _pid, uint256 _amount) external {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdrawMdx: not good");

        // Simulate distributing rewards, for testing convenience
        if (user.amount > 0 && lastWithdrawBlock[msg.sender] != block.number) {
            mdx.transfer(msg.sender, 100 * 1e18);
            lastWithdrawBlock[msg.sender] = block.number;
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.transfer(msg.sender, _amount);
        }
    }

}
    