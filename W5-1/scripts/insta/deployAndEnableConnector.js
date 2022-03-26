const abis = require("./constant/abis");
const addresses = require("./constant/addresses");

const hre = require("hardhat");
const { ethers, waffle } = hre;
const { deployContract } = waffle;
const fs = require("fs")


module.exports = async function ({connectorName, contractArtifact, signer, connectors}) {
    const [_,__,___,wallet3] = await ethers.getSigners();
    const connectorInstanace = await deployContract(wallet3, contractArtifact, [],{gasPrice:await ethers.provider.getGasPrice()});
    await connectors.connect(signer).addConnectors([connectorName], [connectorInstanace.address])

    addresses.connectors[connectorName] = connectorInstanace.address
    abis.connectors[connectorName] = contractArtifact.abi;

    return connectorInstanace;
};
