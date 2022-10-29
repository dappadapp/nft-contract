/*
  You can use this script to quickly manually mintNFTs. To do so:
  Run `truffle exec ./scripts/mint.js`
  If you want to mint more than one NFT, just pass in the number
 */
var Dappad = artifacts.require("./Dappad.sol");

function getErrorMessage(error) {
    if (error instanceof Error) return error.message
    return String(error)
}

const main = async (cb) => {
    try {
        const args = process.argv.slice(4);
        const numNfts = args.length != 0 ? parseInt(args[0]) : 1;
        const nftCollection = await Dappad.deployed();
        //const txn = await nftCollection.mintNFTs(numNfts, {value: numNfts * parseInt(PRICE.toString())});

        const address = '0x792e219860df5e8417297B6d01E2a0Bc9A4632dC';

        //const txn = await nftCollection.tierMint(address, 1, {value: 0});

        //const tis = await nftCollection.getTier(1,{value:0});

        const tis = await nftCollection.mintOwner(0, 8, {value: 0});
        const sp = await nftCollection.maxSupply();

        const bl = await nftCollection.tokensOfOwner('0x1D89ec4F37cFDE89ECb216822042Fc4c0d19CDe3', {value: 0});

        bl.forEach(v => {
            console.log(v.words[0]);
        });
    } catch (err) {
        console.log('Doh! ', getErrorMessage(err));
    }
    cb();
}

module.exports = main;