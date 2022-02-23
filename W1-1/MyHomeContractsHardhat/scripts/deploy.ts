// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, network } from "hardhat";
import { Signer, BigNumber, utils } from "ethers";

const MaxUint256 = BigNumber.from(2).pow(256).sub(1);

async function main() {
  let gov: Signer;
  [gov] = await ethers.getSigners();
  console.log(`gov address: ${await gov.getAddress()}`);
  
  if (network.name == 'bsc_mainnet' || network.name == 'rinkby' || network.name == "OECT") {
    
    const myHomeWork = await ethers.getContractFactory("Greeter");
    
    // deploy USDT
    const greeterDe = await myHomeWork.deploy("Hello World!!");
    const greeterAddr = greeterDe.address;
    console.log(`|  Greeter       |  ${greeterAddr}  |`);

  } else if (network.name == 'heco_testnet') {
    
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
