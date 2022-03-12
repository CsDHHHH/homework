pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interface/IERC2981.sol";
import "./common/Governance.sol";
import "./utils/UnionDeFiUtil.sol";

// SPDX-License-Identifier: MIT

contract MintMNFT is ERC721, Governance, IERC2981 {

    string public constant version = "1.0.0";
    using Counters for Counters.Counter;

    /// bytes4(keccak256("royaltyInfo(uint256)")) == 0xcef6d368
    /// bytes4(keccak256("onRoyaltiesReceived(address,address,uint256,address,uint256,bytes32)")) == 0xe8cb9d99
    /// bytes4(0xcef6d368) ^ bytes4(0xe8cb9d99) == 0x263d4ef1
    bytes4 private constant _INTERFACE_ID_ERC721ROYALTIES = 0x263d4ef1;

    /// @notice Called to return both the creator's address and the royalty percentage
    /// @param _tokenId - the NFT asset queried for royalty information
    /// @return receiver - address of who should be sent the royalty payment
    /// @return amount - a percentage calculated as a fixed point
    ///         with a scaling factor of 100000 (5 decimals), such that
    ///         100% would be the value 10000000, as 10000000/100000 = 100.
    ///         1% would be the value 100000, as 100000/100000 = 1
    struct RoyaltyInfo {
        address creator;
        uint256 amount;
    }

    Counters.Counter private _tokenIds;

    uint256 public _defultRoyalty = 1000000; // 10%
    mapping(uint256 => RoyaltyInfo) private _royaltyInfos;

    event CreatorChanged(uint256 indexed _id, address indexed _creator);
    event DefultRoyaltyChanged(uint256 _royalty);
    
    constructor() public ERC721("MyTest", "MNFT") {
        _setBaseURI("ipfs://");
        
        // Royalties interface 
        _registerInterface(_INTERFACE_ID_ERC721ROYALTIES);
    }
    
    function setURIPrefix(string memory baseURI) public onlyGovernance{
        _setBaseURI(baseURI);
    }

    function setDefultRoyalty(uint256 _royalty) public onlyGovernance{
        _defultRoyalty = _royalty;
        emit DefultRoyaltyChanged(_royalty);
    }

    modifier checkMint (address author, uint256 _tokenId) {
        if (_exists(_tokenId) == false) {
            _mint(author, _tokenId);
            _setTokenURI(_tokenId, UnionDeFiUtil.uintToString(_tokenId));
            _royaltyInfos[_tokenId].creator = author;
            _royaltyInfos[_tokenId].amount = _defultRoyalty;
        }
        _;
    }

    modifier creatorOnly(uint256 _tokenId) {
        require(
            _royaltyInfos[_tokenId].creator == msg.sender, 
            "MintTLToken: ONLY_CREATOR_ALLOWED"
        );    
        _;
    }

    function transferFrom (
        address _from,
        address _to,
        uint256 _tokenId) 
        public 
        checkMint(_from, _tokenId)
        virtual 
        override {
            super.transferFrom(_from, _to, _tokenId);
    }

    function safeTransferFrom(
        address _from, 
        address _to, 
        uint256 _tokenId) 
        public 
        checkMint(_from, _tokenId)
        virtual 
        override {
            super.safeTransferFrom(_from, _to, _tokenId);
    }

    function safeTransferFrom(
        address _from, 
        address _to, 
        uint256 _tokenId, 
        bytes memory _data)
        public 
        checkMint(_from, _tokenId)
        virtual 
        override {
            super.safeTransferFrom(_from, _to, _tokenId, _data);
    }

    function modifyRoyalty(uint256 _tokenId ,uint256 amount) external creatorOnly(_tokenId) {
        _royaltyInfos[_tokenId].amount = amount;
    }

    function setCreator(uint256 _tokenId, address _to) public creatorOnly(_tokenId) {
        require(
            _to != address(0),
            "MintTLToken: INVALID_ADDRESS."
        );
        _royaltyInfos[_tokenId].creator = _to;
        emit CreatorChanged(_tokenId, _to);
    }

    function royaltyInfo(uint256 _tokenId) external view override returns (address receiver, uint256 amount) {
        receiver = _royaltyInfos[_tokenId].creator;
        amount = _royaltyInfos[_tokenId].amount;
    }

    function onRoyaltiesReceived(address _royaltyRecipient, address _buyer, uint256 _tokenId, address _tokenPaid, uint256 _amount, bytes32 _metadata) external override returns (bytes4) {
        emit RoyaltiesReceived(_royaltyRecipient, _buyer, _tokenId, _tokenPaid, _amount, _metadata);    
        return bytes4(keccak256("onRoyaltiesReceived(address,address,uint256,address,uint256,bytes32)"));
    }
}


