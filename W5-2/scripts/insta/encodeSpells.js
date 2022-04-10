const abis = require("./constant/abis");
// const hre = require("hardhat");
// const { web3,ethers } = hre;
// require("@nomiclabs/hardhat-web3");
const Web3 = require('web3')
const web3 = new Web3()

module.exports = function (spells) {
    const targets = spells.map(a => a.connector)
    console.log('targets -> ',targets)
    const calldatas = spells.map(a => {
        const functionName = a.method;
        const abi = abis.connectors[a.connector].find(b => {
            return b.name == functionName
        })
        // console.log(functionName,abi)
        // return ethers.utils.defaultAbiCoder.encode(abi,a.args)
        return web3.eth.abi.encodeFunctionCall(abi,a.args)
    })
    return [targets, calldatas]
}