pragma solidity ^0.8.0;
import "./IScore.sol";

contract Teacher {
    address public scoreAddress;

    constructor(address score) {
        scoreAddress =score;
    }

    function teacherUpdateScore(uint256 studentId,uint256 studentScore) public {
        IScore(scoreAddress).updateScore(studentId,studentScore);
    }
}