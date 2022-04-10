pragma solidity ^0.8.0;

interface IScore {
    function score(uint256 studentId) external;
    function setStudentScore(uint256 studentId,uint256 studentScore) external;
    function updateScore(uint256 studentId,uint256 studentScore) external;
    
}