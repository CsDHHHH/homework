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

  if (network.name == 'rinkby') {
    const Vault = await ethers.getContractFactory("Vault");
    const usdtTest = await ethers.getContractFactory("Token");
    const rewards = await gov.getAddress();
    const keeper = '0xceCbc30623D907f788763BB9530547770a7c1382';

    // deploy usdtTest
    const UsdtAdd = await usdtTest.deploy(18);
    console.log(`|  USDT Address  |  ${UsdtAdd.address}  |`);


    const UsdtVault = await Vault.deploy();
    await UsdtVault.initialize(UsdtAdd.address, await gov.getAddress(), rewards, await gov.getAddress(), await gov.getAddress());
    await UsdtVault.connect(gov).setDepositLimit(MaxUint256);

    console.log(`|  USDT Vault  |  ${UsdtVault.address}  |`);
    
  } else if (network.name == 'bsc_testnet') {
    
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
