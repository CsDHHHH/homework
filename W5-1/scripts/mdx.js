const hre = require("hardhat");
const { ethers } = hre;
require("@nomiclabs/hardhat-ethers");
// const addresses = require("./insta/constant/addresses")
// const abis = require("./insta/constant/abis")
const buildDSAv2 = require('./insta/buildDSAv2')
const encodeSpells = require('./insta/encodeSpells')
const instaImplementations_m1 = require("../deployements/mainnet/Implementation_m1.sol/InstaImplementationM1.json")
// const mdxFlashSwap = require('../artifacts/contracts/mainnet/mdxFlashSwap/main.sol/MdexFlashSwapImplementation.json')
const Web3 = require('web3')
const web3 = new Web3('https://http-mainnet-node.huobichain.com')
const routerCalc = require("./routerCalc2");
const abis = {
  'factory': require('./abis/factory.json'),
  'router': require('./abis/router.json')
}

async function deployer() {
  const [deployer] = await ethers.getSigners()
  const deployerAddress = deployer.address
  console.log(`\n\n\n Deployer Address: ${deployerAddress} \n\n\n`)

  // const MdexFlashSwapImplementation = await ethers.getContractFactory("MdexFlashSwapImplementation");
  // const mdexFlashSwapImplementation = await MdexFlashSwapImplementation.deploy();
  // await mdexFlashSwapImplementation.deployed();
  // console.log(`|  MdexFlashSwapImplementation  |  ${mdexFlashSwapImplementation.address}  |`);

  // const MdexFlashSwapProxy = await ethers.getContractFactory("MdexFlashSwapProxy");
  // const mdexFlashSwapProxy = await MdexFlashSwapProxy.deploy(mdexFlashSwapImplementation.address, deployerAddress, "0x");
  // await mdexFlashSwapProxy.deployed();
  // console.log(`|  MdexFlashSwapProxy  |  ${mdexFlashSwapProxy.address}  |`);
  const proxy = await ethers.getContractAt('MdexFlashSwapProxy', '0x5Ba062fae1Ff0a5847BdFcC130c2760062A5Ea5B')
  // const tx = await proxy.upgradeTo(mdexFlashSwapImplementation.address)
  // console.log(tx)
  // const receipt = await tx.wait()
  // console.log(receipt)
  const tx = await proxy.implementation()
  const re = await tx.wait()

  console.log(tx, re)


  // const ConnectV2MdexFlashSwap = await ethers.getContractFactory("ConnectV2MdexFlashSwap");
  // const connectV2MdexFlashSwap = await ConnectV2MdexFlashSwap.deploy(mdexFlashSwapProxy.address);
  // await connectV2MdexFlashSwap.deployed();
  // console.log(`|  ConnectV2MdexFlashSwap  |  ${connectV2MdexFlashSwap.address}  |`);
}

async function deployConnect() {
  const [deployer] = await ethers.getSigners()
  const deployerAddress = deployer.address
  console.log(`\n\n\n Deployer Address: ${deployerAddress} \n\n\n`)

  const ConnectV2MdexFlashSwap = await ethers.getContractFactory("ConnectV2MdexFlashSwap");
  const connectV2MdexFlashSwap = await ConnectV2MdexFlashSwap.deploy('0x5Ba062fae1Ff0a5847BdFcC130c2760062A5Ea5B');
  await connectV2MdexFlashSwap.deployed();
  console.log(`|  ConnectV2MdexFlashSwap  |  ${connectV2MdexFlashSwap.address}  |`);
}

const ethAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
// usdt heco : 0x3D760a45D0887DFD89A2F5385a236B29Cb46ED2a
// 可能会有pair中金额不够的问题
const usdtAddress = "0xa71edc38d189767582c38a3145b5873052c3e47a"
const husdAddress = "0x0298c2b32eae4da002a15f36fdf7615bea3da047"
const IdOne = "2878734423"
const LHBConnectorName = 'LENDHUB'
const MDEXConnectorName = 'MDEX'
const flashswapConnectorName = 'MDEXFS'


async function caller() {
  // const mdxFlashSwapContract = await ethers.getContractAt(mdxFlashSwap.abi,'0x00D916327b19b588A8007684d966cAF95Aef90f2')
  // const res = await mdxFlashSwapContract.swapCalc(ethAddress,usdtAddress,amount)
  // console.log(res.toString())

  const [caller] = await ethers.getSigners()
  const callerBalance = await ethers.provider.getBalance(caller.address)
  console.log("caller -> ", caller.address, ethers.utils.formatEther(callerBalance))
  // const dsaWallet = await buildDSAv2(callerAddress)
  // console.log('dsawallet address -> ',dsaWallet.address)
  // dsawallet address ->  0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33
  const dsaWallet = await ethers.getContractAt(instaImplementations_m1.abi, "0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33")
  const amount = ethers.utils.parseEther("0.001")
  await caller.sendTransaction({
    to: dsaWallet.address,
    value: amount
  })
  const dsaWalletBalance = await ethers.provider.getBalance(dsaWallet.address)
  console.log("dsaWallet -> ", dsaWallet.address, ethers.utils.formatEther(dsaWalletBalance))

  const spells = [
    {
      connector: LHBConnectorName,
      method: 'deposit',
      args: ["USDT", amount, 0, 0]
    },
    {
      connector: LHBConnectorName,
      method: "borrow",
      args: ["HUSD", 0, IdOne, IdOne]
    },
    {
      connector: flashswapConnectorName,
      method: "flashPayback",
      args: [husdAddress, 0, IdOne, 0],
    }
  ]

  // 减杠杠


  const spellCalldata = encodeSpells(spells)
  const abi = instaImplementations_m1.abi.find(b => {
    return b.name == "cast"
  })
  // console.log('cast abi -> ',abi)
  const castCalldata = web3.eth.abi.encodeFunctionCall(abi, [spellCalldata[0], spellCalldata[1], caller.address])
  const spells2 = [
    {
      connector: LHBConnectorName,
      method: 'deposit',
      args: ["HT", amount, 0, 0]
    },
    {
      connector: flashswapConnectorName,
      method: "flashBorrowAndCast",
      args: [
        pathFirst.address,
        path[1].address,
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

async function leverByPath() {
  // const mdxFlashSwapContract = await ethers.getContractAt(mdxFlashSwap.abi,'0x00D916327b19b588A8007684d966cAF95Aef90f2')
  // const res = await mdxFlashSwapContract.swapCalc(ethAddress,usdtAddress,amount)
  // console.log(res.toString())

  const [caller] = await ethers.getSigners()
  const callerBalance = await ethers.provider.getBalance(caller.address)
  console.log("caller -> ", caller.address, ethers.utils.formatEther(callerBalance))
  // const dsaWallet = await buildDSAv2(callerAddress)
  // console.log('dsawallet address -> ',dsaWallet.address)
  // dsawallet address ->  0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33
  const dsaWallet = await ethers.getContractAt(instaImplementations_m1.abi, "0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33")
  const amount = ethers.utils.parseEther("0.001")
  // await caller.sendTransaction({
  //   to: dsaWallet.address,
  //   value: amount
  // })
  const dsaWalletBalance = await ethers.provider.getBalance(dsaWallet.address)
  console.log("dsaWallet -> ", dsaWallet.address, ethers.utils.formatEther(dsaWalletBalance))

  const depositToken = {
    'name': 'MDX',
    'addr': '0x25d2e80cb6b86881fd7e07dd263fb79f4abe033c'
  }
  const borrowToken = {
    'name': 'DAI',
    'addr': '0x3D760a45D0887DFD89A2F5385a236B29Cb46ED2a'
  }
  // path
  const [path,_] = await routerCalc(web3, abis.factory, abis.router,
    borrowToken.addr, depositToken.addr, amount, 0)
  console.log(path)
  let spells;
  if (path.length == 2) {
    spells = [
      {
        connector: LHBConnectorName,
        method: 'deposit',
        args: [depositToken.name, amount, 0, 0]
      },
      {
        connector: LHBConnectorName,
        method: "borrow",
        args: [borrowToken.name, 0, IdOne, IdOne]
      },
      {
        connector: flashswapConnectorName,
        method: "flashPayback",
        args: [path[path.length-2], 0, IdOne, 0],
      }
    ]
  } else if (path.length > 2) {
    // const pathAddressSwap = path.slice(1, path.length).reverse()
    spells = [
      {
        connector: LHBConnectorName,
        method: 'deposit',
        args: [depositToken.name, amount, 0, 0]
      },
      {
        connector: MDEXConnectorName,
        method: "getAmountInsTrans",
        args: [path.slice(0,path.length-1), 0, IdOne, IdOne]
      },
      {
        connector: LHBConnectorName,
        method: "borrow",
        args: [borrowToken.name, 0, IdOne, IdOne]
      },
      {
        connector: MDEXConnectorName,
        method: "sellByPaths",
        args: [path.slice(0,path.length-1), 0, IdOne, IdOne]
      },
      {
        connector: flashswapConnectorName,
        method: "flashPayback",
        args: [path[path.length-2], 0, IdOne, 0],
      }
    ]    
  }
  const spellCalldata = encodeSpells(spells)
    const abi = instaImplementations_m1.abi.find(b => {
      return b.name == "cast"
    })
    // console.log('cast abi -> ',abi)
    const castCalldata = web3.eth.abi.encodeFunctionCall(abi, [spellCalldata[0], spellCalldata[1], caller.address])
    const spells2 = [
      {
        connector: flashswapConnectorName,
        method: "flashBorrowAndCast",
        args: [
          depositToken.addr,//需要填对应的cToken的地址
          depositToken.addr,
          path[path.length - 2],
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

async function deleverByPath() {
  // const mdxFlashSwapContract = await ethers.getContractAt(mdxFlashSwap.abi,'0x00D916327b19b588A8007684d966cAF95Aef90f2')
  // const res = await mdxFlashSwapContract.swapCalc(ethAddress,usdtAddress,amount)
  // console.log(res.toString())

  const [caller] = await ethers.getSigners()
  const callerBalance = await ethers.provider.getBalance(caller.address)
  console.log("caller -> ", caller.address, ethers.utils.formatEther(callerBalance))
  // const dsaWallet = await buildDSAv2(callerAddress)
  // console.log('dsawallet address -> ',dsaWallet.address)
  // dsawallet address ->  0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33
  const dsaWallet = await ethers.getContractAt(instaImplementations_m1.abi, "0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33")
  const amount = ethers.utils.parseEther("0.001")
  // await caller.sendTransaction({
  //   to: dsaWallet.address,
  //   value: amount
  // })
  const dsaWalletBalance = await ethers.provider.getBalance(dsaWallet.address)
  console.log("dsaWallet -> ", dsaWallet.address, ethers.utils.formatEther(dsaWalletBalance))

  const paybackToken = {
    'name': 'DAI',
    'addr': '0x3D760a45D0887DFD89A2F5385a236B29Cb46ED2a'
  }
  const withdrawToken = {
    'name': 'MDX',
    'addr': '0x25d2e80cb6b86881fd7e07dd263fb79f4abe033c'
  }
  // path
  const [path,_] = await routerCalc(web3, abis.factory, abis.router,
    withdrawToken.addr, paybackToken.addr, amount, 0)
  console.log(path)
  let spells;
  if (path.length == 2) {
    spells = [
      {
        connector: LHBConnectorName,
        method: 'payback',
        args: [paybackToken.name, amount, 0, 0]
      },
      {
        connector: LHBConnectorName,
        method: "withdraw",
        args: [withdrawToken.name, 0, IdOne, IdOne]
      },
      {
        connector: flashswapConnectorName,
        method: "flashPayback",
        args: [path[path.length-2], 0, IdOne, 0],
      }
    ]
  } else if (path.length > 2) {
    // const pathAddressSwap = path.slice(1, path.length).reverse()
    spells = [
      {
        connector: LHBConnectorName,
        method: 'payback',
        args: [paybackToken.name, amount, 0, 0]
      },
      {
        connector: MDEXConnectorName,
        method: "getAmountInsTrans",
        args: [path.slice(0,path.length-1), 0, IdOne, IdOne]
      },
      {
        connector: LHBConnectorName,
        method: "withdraw",
        args: [withdrawToken.name, 0, IdOne, IdOne]
      },
      {
        connector: MDEXConnectorName,
        method: "sellByPaths",
        args: [path.slice(0,path.length-1), 0, IdOne, IdOne]
      },
      {
        connector: flashswapConnectorName,
        method: "flashPayback",
        args: [path[path.length-2], 0, IdOne, 0],
      }
    ]    
  }
  const spellCalldata = encodeSpells(spells)
    const abi = instaImplementations_m1.abi.find(b => {
      return b.name == "cast"
    })
    // console.log('cast abi -> ',abi)
    const castCalldata = web3.eth.abi.encodeFunctionCall(abi, [spellCalldata[0], spellCalldata[1], caller.address])
    const spells2 = [
      {
        connector: flashswapConnectorName,
        method: "flashBorrowAndCast",
        args: [
          paybackToken.addr,//需要填对应的cToken的地址
          paybackToken.addr,
          path[path.length - 2],
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

async function aboutHt() {
  const [caller] = await ethers.getSigners()
  const callerBalance = await ethers.provider.getBalance(caller.address)
  console.log("caller -> ", caller.address, ethers.utils.formatEther(callerBalance))
  // const dsaWallet = await buildDSAv2(callerAddress)
  // console.log('dsawallet address -> ',dsaWallet.address)
  // dsawallet address ->  0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33
  const dsaWallet = await ethers.getContractAt(instaImplementations_m1.abi, "0x41428FA90eE5fFa3783ff1E21F12c193f7bc2B33")
  const amount = ethers.utils.parseEther("0.01")
  // await caller.sendTransaction({
  //   to: dsaWallet.address,
  //   value: amount
  // })
  const dsaWalletBalance = await ethers.provider.getBalance(dsaWallet.address)
  console.log("dsaWallet -> ", dsaWallet.address, ethers.utils.formatEther(dsaWalletBalance))

  const spells = [
    {
      connector: LHBConnectorName,
      method: 'deposit',
      args: ["HT", amount, 0, 0]
    },
    {
      connector: LHBConnectorName,
      method: "borrow",
      args: ["USDT", 0, IdOne, IdOne]
    }
  ]
  const tx = await dsaWallet.connect(caller).cast(...encodeSpells(spells), caller.address)
  console.log('tx -> ', tx)
  const receipt = await tx.wait()
  console.log('receipt -> ', receipt)
}

async function main() {

  // await deployConnect()
  // await deployer()
  // await deleverByPath()
  await deleverByPath()

  // await caller()
  // await aboutHt()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });