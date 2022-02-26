const { ethers,network,artifacts} = require("hardhat");

const { writeAbiAddr } = require('./artifact_save.js');

const prams = process.argv
const value = prams[2]

console.log("Counter deploy with value:",value);

async function main() {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy(value);

    await counter.deployed();
    console.log("Counter deployed to:",counter.address);

    let Artifact = await artifacts.readArtifact("Counter");
    await writeAbiAddr(Artifact,counter.address,"Counter",network.name);
    console.log(`Please verify: npx hardhat verify ${counter.address}`);

}