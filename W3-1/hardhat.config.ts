import "@nomiclabs/hardhat-waffle";


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  defaultNetwork: 'hardhat',

  networks: {
    hardhat: {
      forking: {
        url: "https://speedy-nodes-nyc.moralis.io/6dfb49a39fd0647f779013ca/bsc/mainnet/archive"
      }
    },
    rinkby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 4,
      accounts: [process.env.PRIVATEKEY],
      gasPrice: 5e9,
      gas: 8000000
    }
    
  },
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        // runs: 200,
        runs: 1,
      },
    },
  },
};

