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
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 5e9,
      gas: 10000000
    },

    rinkby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 4,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 5e9,
      gas: 8000000
    },

    OECT: {
      url: 'https://exchaintestrpc.okex.org',
      chainId: 65,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 5e9,
      gas: 8000000
    }

    
    
  },
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        // runs: 200,
        runs: 1,
      },
    },
  },
};

