const { ethers, network } = require("hardhat");

//const Addr = "require(`../deployments/${network.name}/Counter.json`)"

async function main(){
    let { owner } = await ethers.getSigners();

    //let counter = await ethers.getContractAt("Counter",Addr.address,owner);
    const counter ='0xa935ca50681016CBeb23fC49641C47AC299aB9Ba'
    //await counter.add(3);
    await counter.count();
    let newValue = await counter.counter();

    console.log("newValue:" + newValue);
}