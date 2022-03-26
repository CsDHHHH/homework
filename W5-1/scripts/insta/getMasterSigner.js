const hre = require('hardhat');
const { ethers } = hre;
const addresses = require('./constant/addresses')
const abis = require("./constant/abis");

module.exports = async function() {
    const [_,__,___,wallet3] = await ethers.getSigners();
    const instaIndex = new ethers.Contract(
        addresses.core.instaIndex,
        abis.core.instaIndex,
        wallet3
    );
    const masterAddress = await instaIndex.master();
    await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [masterAddress]
    })
    await wallet3.sendTransaction({
        to:masterAddress,
        value: ethers.utils.parseEther('10')
    });

    return ethers.provider.getSigner(masterAddress);
}