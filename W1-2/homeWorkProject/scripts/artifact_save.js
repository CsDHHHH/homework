const fs = require('fs');
const { artifacts, network } = require('hardhat');
const path = require('path');
const { stringify } = require('querystring');
const util = require('util');

const writeFile = util.promisify(fs.writeFile);

async function writeAbiAddr(artifacts,addr,name,network){
    const deployments = {};
    deployments["address"] = addr;
    deployments["contractName"] = artifacts.contractName;
    await writeLog(deployments,name,network);

    const abis = {};
    abis["contractName"] = artifacts.contractName;
    abis["abi"] = artifacts.abi;

    const deploymentPath = path.resolve(__dirname,`../deployments/abi/${abis["contractName"]}.json`);
    await writeFile(deploymentPath.JSON,stringify(abis,null,2));

}