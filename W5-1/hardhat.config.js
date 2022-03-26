const { utils } = require("ethers");

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/Noue4x7jPeTVS7g8Q6B1jakO1DewHGzK",
        blockNumber: 13005785
      },
      // chainId: 1,
      blockGasLimit:12000000,
      // gasPrice: parseInt(utils.parseUnits("90", "gwei"))
    },
    heco_mainnet: {
      url: 'https://http-mainnet-node.huobichain.com',
      chainId: 128,
      // accounts: [''],
      gasPrice: 2.25e9, // 2 GWEI
      gas: 10000000
    },
    bsc_mainnet: {
       url: 'https://bsc-dataseed.binance.org/',
       chainId: 56,
      //  accounts: [''],
       gasPrice: 5000000000,
       gas: 10000000
     }
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.0",
      },
      {
        version: "0.6.2",
      },
      {
        version: "0.6.5",
      },
    ],
  },
};
