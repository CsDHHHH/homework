const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Counter", function () {
  it("Should return the new counter once it's changed", async function () {
    const counter = await ethers.getContractFactory("Counter");
    const getCounter = await counter.deploy(10);
    await getCounter.deployed();

    expect(await getCounter.counter()).to.equal(10);

    const setCounter = await getCounter.add(6);

    // wait until the transaction is mined
    await setCounter.wait();

    expect(await getCounter.counter()).to.equal(16);
  });
});
