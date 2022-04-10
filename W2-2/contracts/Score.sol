//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";


contract Score {
    
    address public owner;
    uint public amount;
    mapping(uint256 => uint256) public score;
    
    modifier onlyTeacher {
        require(msg.sender == owner);
        _;
    }

    constructor() public{
        owner = msg.sender;
    }

    function setStudentScore(uint256 studentId, uint256 studentScore) public {
        require(studentScoreNew <= 100,"error");
        score[studentId] = studentScore;
    }

    function updateScore(uint256 studentId,uint256 studentScoreNew) public onlyTeacher {
        require(studentScoreNew <= 100,"error");
        score[studentId] = studentScoreNew;
    }

}
