const Dappad = artifacts.require("Dappad");

const whitelist = require('../whitelist.js');
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');

module.exports = function (deployer) {

    const leafNodes = whitelist.map((addr) => keccak256(addr))
    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true})
    const root = merkleTree.getRoot()

    let unknownProxy = '0x0000000000000000000000000000000000000000';

    let BASE_URI = 'ipfs://sfsfsf/';

    let proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317';

    deployer.deploy(Dappad, BASE_URI, root, unknownProxy);
};
