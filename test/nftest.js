const whitelist = require("../whitelist");
const fakelist = require("../fakelist");

const keccak256 = require("keccak256");
const {MerkleTree} = require("merkletreejs");
const Dappad = artifacts.require("Dappad");

function wei(n) {
    return web3.utils.toWei(`${n}`, 'wei');
}

function ether(n) {
    return web3.utils.toWei(`${n}`, 'ether');
}

function getList(data) {
    const leafNodes = data.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    return merkleTree;
}

function getFakelistRoot() {
    const leafNodes = fakelist.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    return merkleTree.getRoot();
}

function getWhitelistRoot() {
    const leafNodes = whitelist.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    return merkleTree.getRoot();
}

contract("Dappad", (accounts) => {
    let instance;

    let owner = accounts[0];
    let user1 = accounts[1];
    let user2 = accounts[2];
    let user3 = accounts[3];
    let user4 = accounts[4];

    console.log(owner.toString());

    let addressList = [
        user1,
        user2,
        user3
    ];

    before(async () => {
        let unknownProxy = '0x0000000000000000000000000000000000000000';
        let BASE_URI = 'ipfs://QmdhvphKgxjuDPJQeHNNRMj7xebjDRJ77JAQGk7jJDruTk/';
        instance = await Dappad.new(BASE_URI, getWhitelistRoot(), unknownProxy);
    });

    it("deployment", () => {
        assert(instance, "contract deploy edilmedi");
    });

    it("paused()", async () => {
        const paused = await instance.paused.call();
        assert.equal(paused, false, "paused() şu anda false değil");
    });

    it("setMintPrice()", async () => {
        let price = ether(0.1);

        //owner
        await instance.setMintPrice(0, price, {from: owner});
        const mintPrice = await instance.getTierPrice(0, {from: user1});

        //other
        let err = null;
        try {
            await instance.setMintPrice(0, ether(0.06), {from: user2});
        } catch (e) {
            err = e;
        }

        assert.equal(mintPrice, price);
        assert.ok(err instanceof Error);
    });
    it("setMerkleRoot()", async () => {
        const fakelistRoot = getList(addressList);
        const rootHash = fakelistRoot.getRoot();

        //owner
        await instance.setMerkleRoot(rootHash, {from: owner});

        //other
        let err = null;
        try {
            await instance.setMerkleRoot(rootHash, {from: user2});
        } catch (e) {
            err = e;
        }

        assert.ok(err instanceof Error);
    });
    it("setBaseURI()", async () => {
        let uri = 'ipfs://someipfs/';

        //owner
        await instance.setBaseURI(uri, {from: owner});
        const instanceURI = await instance.baseTokenURI({from: user1});

        //other
        let err = null;
        try {
            await instance.setMintPrice('ipfs://randomipfs/', {from: user2});
        } catch (e) {
            err = e;
        }

        assert.equal(instanceURI, uri);
        assert.ok(err instanceof Error);
    });

    it("setBaseExtension()", async () => {
        let extension = '.dat';

        //owner
        await instance.setBaseExtension(extension, {from: owner});
        const instanceExtension = await instance.baseExtension({from: user1});

        //other
        let err = null;
        try {
            await instance.setBaseExtension('.tiff', {from: user2});
        } catch (e) {
            err = e;
        }

        assert.equal(instanceExtension, extension);
        assert.ok(err instanceof Error);
    });

    it("togglePause()", async () => {
        const old = await instance.paused({from: user1});

        //owner
        await instance.togglePause({from: owner});
        const instancePaused = await instance.paused({from: user1});

        //other
        let err = null;
        try {
            await instance.togglePause({from: user2});
        } catch (e) {
            err = e;
        }

        assert.notEqual(instancePaused, old);
        assert.ok(err instanceof Error);
    });

    it("togglePresale()", async () => {
        const old = await instance.preMint({from: user1});

        //owner
        await instance.togglePresale({from: owner});
        const instancePresale = await instance.preMint({from: user1});

        //other
        let err = null;
        try {
            await instance.togglePresale({from: user2});
        } catch (e) {
            err = e;
        }

        assert.notEqual(instancePresale, old);
        assert.ok(err instanceof Error);
    });

    it("toggleCommunitySale()", async () => {
        const old = await instance.communityMint({from: user1});

        //owner
        await instance.toggleCommunitySale({from: owner});
        const instanceCommunityMint = await instance.communityMint({from: user1});

        //other
        let err = null;
        try {
            await instance.toggleCommunitySale({from: user2});
        } catch (e) {
            err = e;
        }

        assert.notEqual(instanceCommunityMint, old);
        assert.ok(err instanceof Error);
    });
    it("addMaxSupply()", async () => {
        const old = await instance.getSupply(0, {from: user1});

        //owner
        await instance.addMaxSupply(0, 30, {from: owner});
        const nw = await instance.getSupply(0, {from: user1});

        //other
        let err = null;
        try {
            await instance.addMaxSupply(0, 30, {from: user2});
        } catch (e) {
            err = e;
        }

        assert.notEqual(nw, old);
        assert.ok(err instanceof Error);
    });
    it("presaleMint()", async () => {
        let list = getList(addressList);
        const leaf = keccak256(user1);
        const proof = list.getHexProof(leaf);

        //pre mint
        let zeroError = null;
        try {
            await instance.presaleMint(user1, 0, 0, proof, {from: user1, value: ether(0.1 * 3)});
        } catch (e) {
            zeroError = e;
        }

        //false presale
        await instance.togglePresale({from: owner});

        //pre mint
        let preMintError = null;
        try {
            await instance.presaleMint(user1, 0, 3, proof, {from: user1, value: ether(0.1 * 3)});
        } catch (e) {
            preMintError = e;
        }

        //true presale
        await instance.togglePresale({from: owner});

        let pauseError = null;
        //paused
        try {
            await instance.presaleMint(user1, 0, 3, proof, {from: user1, value: ether(0.1 * 3)});
        } catch (error) {
            pauseError = error;
        }

        //open pause
        await instance.togglePause({from: owner});

        //whitelisted
        await instance.presaleMint(user1, 0, 2, proof, {from: user1, value: ether(0.1 * 3)});

        let mintNumber = await instance.balanceOf(user1);

        //mint limit
        let maxMintError = null;
        try {
            await instance.presaleMint(user1, 0, 1, proof, {from: user1, value: ether(0.1)});
        } catch (e) {
            maxMintError = e;
        }

        //minimum ether
        let currencyError = null;
        try {
            await instance.presaleMint(user1, 0, 1, proof, {from: user1, value: ether(0.000001)});
        } catch (error) {
            currencyError = error;
        }

        //not whitelisted
        let whitelistError = null;
        try {
            await instance.presaleMint(user4, 0, 1, proof, {from: user1, value: ether(0.000001)});
        } catch (error) {
            whitelistError = error;
        }

        assert.equal(mintNumber, 2);
        assert.ok(currencyError instanceof Error);
        assert.ok(maxMintError instanceof Error);
        assert.ok(pauseError instanceof Error);
        assert.ok(preMintError instanceof Error);
        assert.ok(whitelistError instanceof Error);
        assert.ok(zeroError instanceof Error);
    });

    it("communitySaleMint()", async () => {
        await instance.communitySaleMint(0, 4, {value: ether(10 * 0.1), from: user4});

        const x = await instance.balanceOf(user4);

        assert.equal(x, 4);
    });

    it("tokensOfOwner()", async () => {
        let list = await instance.tokensOfOwner(user1);

        assert.equal(list.length, 2);
    });

    it("mintByOwner()", async () => {
        await instance.mintByOwner(0, 2, {from: owner});

        let list = await instance.tokensOfOwner(owner);

        assert.equal(list.length, 2);

        const amount = await instance.totalSupply({from: user1});

        assert.equal(`${amount}`, `${8}`);
    });

    it("withdrawAll()", async () => {
        let fetchError = null;
        await instance.withdrawAll({from: owner});
        try {
            await instance.withdrawAll({from: user1});
        } catch (error) {
            fetchError = error;
        }
        assert.ok(fetchError instanceof Error);
    });
    it("test by @can", async () => {

        await instance.setIndex(0, 1, 60, {from: owner});

        await instance.setMaxSupply(0, 10, {from: owner});

        const tier = await instance.getTier(0, {from: owner});

        console.log(tier);

        await instance.communitySaleMint(0, 3, {value: ether(10), from: user3});

        const list = await instance.tokensOfOwner(user3);

        console.log(list);
    });
});