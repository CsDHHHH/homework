const { hexStripZeros } = require("ethers/lib/utils");
const { ethers,network,artifacts } = require("hardhat");

const { writeAbiAddr } = require('./artifact_save.js');

async function main() {
    await hre.run('compile');
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy(10);

    await counter.deployed();
    console.log("Counter deployed to:",counter.address);

    let Artifact = await artifacts.readArtifact("Counter");
    await writeAbiAddr(Artifact,counter.address,"Counter",network.name);
    console.log(`Please verify: npx hardhat verify ${counter.address}`);
}