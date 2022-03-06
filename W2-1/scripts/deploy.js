const { hexStripZeros } = require("ethers/lib/utils");
const { ethers,network,artifacts } = require("hardhat");

const { writeAbiAddr } = require('./artifact_save.js');

async function main() {
    await hre.run('compile');
    const Bank = await ethers.getContractFactory("Bank");
    const bankAddr = await Bank.deploy();

    await counter.deployed();
    console.log("Counter Bank to:",bankAddr.address);
}