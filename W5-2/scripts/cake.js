const hre = require("hardhat");
const { ethers } = hre;
require("@nomiclabs/hardhat-ethers");
const instaImplementations_m1 = require("../deployements/mainnet/Implementation_m1.sol/InstaImplementationM1.json")
const encodeSpells = require('./insta/encodeSpells')
const Web3 = require('web3')
const web3 = new Web3('https://bsc-dataseed.binance.org/')

async function deploy() {
    const [deployer] = await ethers.getSigners()
    const deployerAddress = deployer.address
    console.log(`\n\n\n Deployer Address: ${deployerAddress} \n\n\n`)
    const deployerBalance = await ethers.provider.getBalance(deployer.address)
    console.log("deployer -> ", deployer.address, ethers.utils.formatEther(deployerBalance))

    const MdexFlashSwapImplementation = await ethers.getContractFactory("CakeFlashSwapImplementation");
    const mdexFlashSwapImplementation = await MdexFlashSwapImplementation.deploy();
    await mdexFlashSwapImplementation.deployed();
    console.log(`|  CakeFlashSwapImplementation  |  ${mdexFlashSwapImplementation.address}  |`);

    const MdexFlashSwapProxy = await ethers.getContractFactory("CakeFlashSwapProxy");
    const mdexFlashSwapProxy = await MdexFlashSwapProxy.deploy(mdexFlashSwapImplementation.address, deployerAddress, "0x");
    await mdexFlashSwapProxy.deployed();
    console.log(`|  CakeFlashSwapProxy  |  ${mdexFlashSwapProxy.address}  |`);

    const ConnectV2MdexFlashSwap = await ethers.getContractFactory("ConnectV2CakeFlashSwap");
    const connectV2MdexFlashSwap = await ConnectV2MdexFlashSwap.deploy(mdexFlashSwapProxy.address);
    await connectV2MdexFlashSwap.deployed();
    console.log(`|  ConnectV2CakeFlashSwap  |  ${connectV2MdexFlashSwap.address}  |`);
}
async function reDeploy() {
    const [deployer] = await ethers.getSigners()
    const deployerAddress = deployer.address
    console.log(`\n\n\n Deployer Address: ${deployerAddress} \n\n\n`)
    const deployerBalance = await ethers.provider.getBalance(deployer.address)
    console.log("deployer -> ", deployer.address, ethers.utils.formatEther(deployerBalance))

    const MdexFlashSwapImplementation = await ethers.getContractFactory("CakeFlashSwapImplementation");
    const mdexFlashSwapImplementation = await MdexFlashSwapImplementation.deploy();
    await mdexFlashSwapImplementation.deployed();
    console.log(`|  CakeFlashSwapImplementation  |  ${mdexFlashSwapImplementation.address}  |`);

    // const MdexFlashSwapProxy = await ethers.getContractFactory("CakeFlashSwapProxy");
    // const mdexFlashSwapProxy = await MdexFlashSwapProxy.deploy(mdexFlashSwapImplementation.address, deployerAddress, "0x");
    // await mdexFlashSwapProxy.deployed();
    // console.log(`|  CakeFlashSwapProxy  |  ${mdexFlashSwapProxy.address}  |`);
    const proxy = await ethers.getContractAt('CakeFlashSwapProxy', '0x95FEC9cbD832EF00a442cb4F4Ab860A04Cf6863D')
    const tx = await proxy.upgradeTo(mdexFlashSwapImplementation.address)
    console.log(tx)
    const receipt = await tx.wait()
    console.log(receipt)
}
async function deployConnect() {
    const [deployer] = await ethers.getSigners()
    const deployerAddress = deployer.address
    console.log(`\n\n\n Deployer Address: ${deployerAddress} \n\n\n`)
  
    const ConnectV2MdexFlashSwap = await ethers.getContractFactory("ConnectV2CakeFlashSwap");
    const connectV2MdexFlashSwap = await ConnectV2MdexFlashSwap.deploy('0x95FEC9cbD832EF00a442cb4F4Ab860A04Cf6863D');
    await connectV2MdexFlashSwap.deployed();
    console.log(`|  ConnectV2CakeFlashSwap  |  ${connectV2MdexFlashSwap.address}  |`);
  }


async function caller() {
    // const mdxFlashSwapContract = await ethers.getContractAt(mdxFlashSwap.abi,'0x00D916327b19b588A8007684d966cAF95Aef90f2')
    // const res = await mdxFlashSwapContract.swapCalc(ethAddress,usdtAddress,amount)
    // console.log(res.toString())

    const [caller] = await ethers.getSigners()
    const callerBalance = await ethers.provider.getBalance(caller.address)
    console.log("caller -> ", caller.address, ethers.utils.formatEther(callerBalance))

    const dsaWallet = await ethers.getContractAt(instaImplementations_m1.abi, "0x80378Bb88E16329Cd45Ca20604FA6d95becD2BAB")
    const amount = ethers.utils.parseEther("0.001")
    // await caller.sendTransaction({
    //   to: dsaWallet.address,
    //   value: amount
    // })
    const dsaWalletBalance = await ethers.provider.getBalance(dsaWallet.address)
    console.log("dsaWallet -> ", dsaWallet.address, ethers.utils.formatEther(dsaWalletBalance))

    const usdtAddr = '0x55d398326f99059fF775485246999027B3197955'
    const busdAddr = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    const LHBConnectorName = 'VENUS'
    const flashswapConnectorName = 'CAKEFS'
    const IdOne = 12345462
    const spells = [
        {
            connector: LHBConnectorName,
            method: 'deposit',
            args: ["USDT", amount, 0, 0]
        },
        {
            connector: LHBConnectorName,
            method: "borrow",
            args: ["BUSD", 0, IdOne, IdOne]
        },
        {
            connector: flashswapConnectorName,
            method: "flashPayback",
            args: [busdAddr, 0, IdOne, 0],
        }
    ]

    const spellCalldata = encodeSpells(spells)
    const abi = instaImplementations_m1.abi.find(b => {
        return b.name == "cast"
    })
    // console.log('cast abi -> ',abi)
    const castCalldata = web3.eth.abi.encodeFunctionCall(abi, [spellCalldata[0], spellCalldata[1], caller.address])
    const spells2 = [
        //   {
        //     connector: LHBConnectorName,
        //     method: 'deposit',
        //     args: ["USDT", amount, 0, 0]
        //   },
        {
            connector: flashswapConnectorName,
            method: "flashBorrowAndCast",
            args: [
                usdtAddr,
                busdAddr,
                amount,
                0, // route
                castCalldata,
                IdOne
            ]
        }
    ]
    const tx = await dsaWallet.connect(caller).cast(...encodeSpells(spells2), caller.address)
    console.log('tx -> ', tx)
    const receipt = await tx.wait()
    console.log('receipt -> ', receipt)
}

async function main() {
    // await deploy()
    // await caller()
    // await reDeploy()
    await deployConnect()
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });