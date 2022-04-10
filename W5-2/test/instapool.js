const { expect } = require("chai");
const hre = require("hardhat");
const { waffle, ethers } = hre 
const { provider } = waffle

const getMasterSigner = require('../scripts/insta/getMasterSigner')

const connectV2CompoundArtifacts = require("../artifacts/contracts/mainnet/connectors/compound/main.sol/ConnectV2Compound.json");
const abis = require("../scripts/insta/constant/abis");
const addresses = require("../scripts/insta/constant/addresses");
const deployAndEnableConnector = require("../scripts/insta/deployAndEnableConnector");
const buildDSAv2 = require("../scripts/insta/buildDSAv2");
const encodeFlashcastData = require("../scripts/insta/encodeFlashcastData");
const encodeSpells = require("../scripts/insta/encodeSpells");

describe("Instapool",function () {
    const connectorName = "COMPOUND-TEST-A"

    let dsaWallet0
    let masterSigner;
    let instaConnectorsV2;
    let connector;

    const wallets = provider.getWallets()
    const [wallet0, wallet1, wallet2, wallet3] = wallets
    before(async ()=>{
        // console.log('before get master')
        masterSigner = await getMasterSigner(wallet3)
        // console.log('after get master',await masterSigner.getAddress())
        instaConnectorsV2 = await ethers.getContractAt(abis.core.connectorsV2,addresses.core.connectorsV2)
        connector = await deployAndEnableConnector({
            connectorName,
            contractArtifact:connectV2CompoundArtifacts,
            signer:masterSigner,
            connectors: instaConnectorsV2
        })
        console.log("Connector address", connector.address)
    })

    it('Should have contracts deployed.', async function(){
        expect(!!instaConnectorsV2.address).to.be.true;
        expect(!!connector.address).to.be.true;
        expect(!!await masterSigner.getAddress()).to.be.true;
    })

    describe('DSA wallet setup', function () {
        it("Should build DSA v2", async function(){
            dsaWallet0 = await buildDSAv2(wallet0.address)
            expect(!!dsaWallet0.address).to.be.true;
        })
        it("Deposit ETH into DSA wallet", async function(){
            await wallet0.sendTransaction({
                to: dsaWallet0.address,
                value: ethers.utils.parseEther("10")
            });
            expect(await ethers.provider.getBalance(dsaWallet0.address)).to.be.gte(ethers.utils.parseEther("10"));
        })
    })

    describe("Main", function(){
        it("Should take 100 ETH flashloan from Instapool", async function () {
            const amount = ethers.utils.parseEther("1")
            const flashloanAmount = ethers.utils.parseEther("100")
            const ethAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

            const IdOne = "2878734423"
            const IdTwo = "783243246"

            const spells = [
                {
                    connector: connectorName,
                    method: 'deposit',
                    args: ["ETH-A", flashloanAmount, 0, IdOne]
                },
                {
                    connector: connectorName,
                    method: "withdraw",
                    args: ["ETH-A", amount, IdOne, IdTwo]
                },
                {
                    connector: "INSTAPOOL-A",
                    method: "flashPayback",
                    args: [ethAddress, flashloanAmount, IdTwo, 0],
                }
            ]
            const calldata = encodeFlashcastData(spells)
            const spells2 = [
                {
                  connector: "INSTAPOOL-A",
                  method: "flashBorrowAndCast",
                  args: [
                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                    flashloanAmount,
                    0, // route
                    calldata,
                  ],
                }
            ]
            console.log('calldata -> ',calldata)
            const tx = await dsaWallet0.connect(wallet0).cast(...encodeSpells(spells2), wallet1.address)
            console.log('tx -> ',tx)
            const receipt = await tx.wait()
            // console.log('receipt -> ',receipt)
        })
    })
})