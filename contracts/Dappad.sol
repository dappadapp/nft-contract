// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract Dappad is ERC721Enumerable, Ownable, ReentrancyGuard {

    using Strings for uint256;
    using Counters for Counters.Counter;

    struct Tier {
        uint256 price;
        uint256 startIndex;
        uint256 totalSupply;
        Counters.Counter counter;
        bool enabled;
    }

    bytes32 public root;
    address proxyAddress;
    string public baseTokenURI;
    string public baseExtension = ".json";
    bool public paused = false;
    bool public preMint = false;
    bool public communityMint = false;
    mapping(address => uint256) presaleClaims;
    uint256 presaleMintLimit = 2;
    Tier[] private tiers;
    uint256 private max = 1200;

    constructor(string memory uri,
        bytes32 merkleroot,
        address _proxyRegistryAddress)
    ERC721("Dappad", "DAPPAD")
    ReentrancyGuard() {
        root = merkleroot;
        proxyAddress = _proxyRegistryAddress;

        tiers.push(Tier(0.04 ether, 1, 0, Counters.Counter(0), true));
        tiers.push(Tier(0.05 ether, 50, 0, Counters.Counter(0), true));
        tiers.push(Tier(0.06 ether, 90, 0, Counters.Counter(0), true));

        setBaseURI(uri);
    }

    modifier onlyAccounts () {
        require(msg.sender == tx.origin, "Not allowed origin");
        _;
    }

    modifier isValidMerkleProof(bytes32[] calldata _proof) {
        require(MerkleProof.verify(
            _proof,
            root,
            keccak256(abi.encodePacked(msg.sender))
        ) == true, "Not allowed origin");
        _;
    }

    function getTierPrice(uint256 _tier) public view returns (uint256) {
        Tier memory tier = tiers[_tier];
        return tier.price;
    }

    function maxSupply() public view returns (uint256) {
        return max;
    }

    function getTier(uint256 _tier) public view returns (Tier memory) {
        Tier memory tier = tiers[_tier];
        return tier;
    }

    function getSupply(uint256 _index) public view returns (uint256) {
        Tier memory tier = tiers[_index];
        return tier.totalSupply;
    }

    function setTotalSupply(uint256 _index, uint256 _amount) public onlyOwner {
        Tier storage tier = tiers[_index];
        tier.totalSupply = _amount;
    }

    function addTotalSupply(uint256 _index, uint256 _amount) public onlyOwner {
        Tier storage tier = tiers[_index];
        tier.totalSupply = tier.totalSupply + _amount;
    }

    function enableTier(uint256 _index) external onlyOwner {
        Tier storage tier = tiers[_index];
        tier.enabled = true;
    }

    function disableTier(uint256 _index) external onlyOwner {
        Tier storage tier = tiers[_index];
        tier.enabled = false;
    }

    function setMintPrice(uint256 _index, uint256 _amount) external onlyOwner {
        Tier storage tier = tiers[_index];
        tier.price = _amount;
    }

    function mintByOwner(uint256 _index, uint256 _amount) external onlyOwner onlyAccounts {
        for (uint256 i = 0; i < _amount; i++) {
            _safeTierMint(owner(), _index);
        }
    }

    function presaleMint(address account, uint256 _index, uint256 _amount, bytes32[] calldata _proof) external payable isValidMerkleProof(_proof) onlyAccounts {
        require(msg.sender == account, "Not allowed");
        require(preMint, "Presale is OFF");
        require(!paused, "Contract is paused");
        require(_amount > 0, "zero amount");
        require(_amount <= presaleMintLimit, "You can't mint so much tokens");
        require(presaleClaims[msg.sender] + _amount <= presaleMintLimit, "You can't mint so much tokens");
        Tier storage tier = tiers[_index];
        require(tier.enabled, "Tier is disabled");
        require(
            tier.price * _amount <= msg.value,
            "Not enough ethers sent"
        );
        presaleClaims[msg.sender] += _amount;
        for (uint256 i = 0; i < _amount; i++) {
            _safeTierMint(msg.sender, _index);
        }
    }

    function withdrawAll() external onlyOwner {
        Address.sendValue(payable(owner()), address(this).balance);
    }

    function communitySaleMint(uint256 _index, uint256 _amount) external payable onlyAccounts {
        require(!paused, "Sale paused");
        require(communityMint, "CommunitySale is OFF");
        require(_amount > 0, "zero amount");
        require(_index < tiers.length, "Invalid tier");
        Tier storage tier = tiers[_index];
        require(tier.enabled, "Tier is disabled");
        require(
            tier.price * _amount <= msg.value,
            "Not enough ethers sent"
        );
        for (uint256 i = 0; i < _amount; i++) {
            _safeTierMint(msg.sender, _index);
        }
    }

    function _safeTierMint(address account, uint _index) private nonReentrant {
        require(_index < tiers.length, "Invalid tier");
        Tier storage tier = tiers[_index];
        uint256 total = tier.startIndex + tier.counter.current();
        require(total <= tier.totalSupply, "Tier limit reached");
        _safeMint(account, total);
        tier.counter.increment();
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    function setBaseExtension(string memory _newBaseExtension) external onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function setMerkleRoot(bytes32 merkleroot) external onlyOwner {
        root = merkleroot;
    }

    function togglePause() external onlyOwner {
        paused = !paused;
    }

    function togglePresale() external onlyOwner {
        preMint = !preMint;
    }

    function toggleCommunitySale() external onlyOwner {
        communityMint = !communityMint;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory){
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        string memory currentBaseURI = _baseURI();
        return
        bytes(currentBaseURI).length > 0
        ? string(
            abi.encodePacked(
                currentBaseURI,
                tokenId.toString(),
                baseExtension
            )
        )
        : "";
    }

    function isApprovedForAll(address owner, address operator) override(ERC721, IERC721) public view returns (bool) {
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }
        return super.isApprovedForAll(owner, operator);
    }

    function tokensOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 tokenCount = ERC721.balanceOf(_owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 totalSupplied = maxSupply();
            uint256 inx = 0;
            uint256 id;
            for (id = 1; id <= totalSupplied; id++) {
                if (!ERC721._exists(id)) {
                    continue;
                }
                if (ERC721.ownerOf(id) == _owner) {
                    result[inx] = id;
                    inx++;
                }
            }
            return result;
        }
    }
}

contract OwnableDelegateProxy {

}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}