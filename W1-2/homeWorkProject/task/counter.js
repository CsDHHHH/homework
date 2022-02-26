// npx hardhat help counter
// npx hardhat counter --address --network

const { tasks, ethers } = require("hardhat");

tasks("counter","prints current counter value")
.addParam("address","the counter address")
.setAction(async (taskArgs) => {
    const contractAddr = taskArgs.address;
    let counter = await ethers.getContractAt("Counter",contractAddr);

    let currValue = await counter.counter();
    console.log("current counter value:" + currValue);
});