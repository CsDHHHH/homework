const { hexStripZeros } = require("ethers/lib/utils");
const { ethers,network,artifacts } = require("hardhat");

const { writeAbiAddr } = require('./artifact_save.js');

async function main() {
    await hre.run('compile');
    const Score = await ethers.getContractFactory("Score");
    const scoreAddr = await Score.deploy();
    await Score.deployed();

    console.log("Score address:",scoreAddr.address);

    const Teacher = await ethers.getContractFactory("Teacher");
    const teacherAddr = await Teacher.deploy(scoreAddr);
    await Teacher.deployed();

    
    console.log("Teacher address:",teacherAddr.address);
}