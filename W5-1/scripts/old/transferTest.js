const hre = require("hardhat");
const { ethers } = hre;
require("@nomiclabs/hardhat-ethers");
const transTemp = require('../artifacts/contracts/mainnet/mdxFlashSwap/main.sol/TransferTest.json')

async function transferTest1() {
    const [deployer] = await ethers.getSigners()
    const deployerAddress = deployer.address
    console.log(`\n\n\n Deployer Address: ${deployerAddress} \n\n\n`)

    // const TransferTestContract = await ethers.getContractFactory('TransferTest')
    // const transferTestContract = await TransferTestContract.deploy();
    // await transferTestContract.deployed();
    // console.log(`|  transferTestContract  |  ${transferTestContract.address}  |`);
    const transferTestContract  =  await ethers.getContractAt('TransferTest','0x7DbFB6154D0714DA517917F8d7F5D826beb2d75b')

    await deployer.sendTransaction({
        to: transferTestContract.address,
        value: ethers.utils.parseEther("0.001")
    })
    console.log(1)

    const addr = '0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33'
    await transferTestContract.transferTest(addr, ethers.utils.parseEther("0.0005"))
    console.log(2)

    await transferTestContract.callTest(addr, ethers.utils.parseEther("0.0005"))
}


transferTest1()