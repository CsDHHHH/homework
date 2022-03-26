const abis = require("./constant/abis");
const addresses = require("./constant/addresses");
// const hre = require("hardhat");
// const { web3 } = hre;
const Web3 = require('web3')
const web3 = new Web3()

const encodeSpells = require("./encodeSpells")

module.exports = function(spells) {
    const encodeSpellsData = encodeSpells(spells)
    return web3.eth.abi.encodeParameters(
        ["string[]","bytes[]"],
        [encodeSpellsData[0],encodeSpellsData[1]]
    )
}