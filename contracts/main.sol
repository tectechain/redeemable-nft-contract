// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./EIP712Whitelist.sol";

contract RedeemableNFT is
    ERC721,
    ERC721Enumerable,
    Ownable,
    ERC721Burnable,
    ERC721Royalty,
    EIP712Whitelist,
    PaymentSplitter
{
    using Strings for uint256;
    using Counters for Counters.Counter;

    uint256 public constant PRICE = 0.01 ether;
    uint256 public constant MAX_SUPPLY = 100;
    uint256 private constant MAX_PER_MINT = 20;

    address[] private _payees = [
        0x70997970C51812dc3A010C7d01b50e0d17dc79C8, //account#0
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, //account#1
        0x90F79bf6EB2c4f870365E785982E1f101E93b906 //account#2
    ];
    uint256[] private _shares = [205, 205, 590];

    uint96 private constant SELLER_FEE = 1000; //10%
    uint256 private constant REDEEM_STARTAT = 2524608000; //2050-01-01

    bool public onSale = true;
    string private baseURI_ =
        "ipfs://Qmad1jMvG1vHo9QoAcrAmFX5ZyoodL8Srk7vixAH9w8aNK/";
    Counters.Counter private _tokenIdCounter;

    uint256[] private _redeemed;
    mapping(uint256 => address) public redeemedBy;

    event Redeem(address redeemedBy, uint256 tokenId);

    constructor()
        ERC721("RedeemableNFT", "Rune")
        PaymentSplitter(_payees, _shares)
    {
        _setDefaultRoyalty(address(this), SELLER_FEE);
    }

    function setURI(string calldata newURI) external {
        baseURI_ = newURI;
    }

    /**
        @notice get the total supply including burned token
    */
    function tokenIdCurrent() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function _safeMint(address to) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    /**
        @notice air drop tokens to recievers
        @param recievers each account will receive one token
    */
    function airDrop(address[] calldata recievers) external onlyOwner {
        require(recievers.length <= MAX_PER_MINT, "High Quntity");
        require(
            _tokenIdCounter.current() + recievers.length <= MAX_SUPPLY,
            "Out of Stock"
        );

        for (uint256 i = 0; i < recievers.length; i++) {
            _safeMint(recievers[i]);
        }
    }

    /**
        @notice  mint with valid signature 
        @param tokenQuantity number of token to be minted
        @param signature signature of typed data TicketSigner
    */
    function privateMint(
        uint256 tokenQuantity,
        bytes calldata signature
    ) external payable {
        require(onSale, "Private Sale Not Allowed");
        require(tokenQuantity <= MAX_PER_MINT, "High Quntity");
        require(tokenQuantity > 0, "Mint At Least One");
        require(
            _tokenIdCounter.current() + tokenQuantity <= MAX_SUPPLY,
            "Out of Stock"
        );
        require(PRICE * tokenQuantity <= msg.value, "INSUFFICIENT_ETH");
        require(simpleVerify(signature), "Invalid Signature");

        for (uint256 i = 0; i < tokenQuantity; i++) {
            _safeMint(msg.sender);
        }
    }

    /**
        @notice enable/disable privateMint 
    */
    function toggleSaleStatus() external onlyOwner {
        onSale = !onSale;
    }

    function redeem(uint256 tokenId) external {
        require(block.timestamp > REDEEM_STARTAT, "Redemption has not started");
        require(ownerOf(tokenId) == msg.sender, "Unauthorized");
        burn(tokenId);
        _redeemed.push(tokenId);
        redeemedBy[tokenId] = msg.sender;
        emit Redeem(msg.sender, tokenId);
    }

    function totalRedemption() public view returns (uint256) {
        return _redeemed.length;
    }

    function tokenOfRedemptionByIndex(
        uint256 index
    ) external view returns (uint256) {
        require(index < totalRedemption(), "global index out of bounds");
        return _redeemed[index];
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        return
            bytes(baseURI_).length > 0
                ? string(
                    abi.encodePacked(baseURI_, tokenId.toString(), ".json")
                )
                : "";
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721Royalty) {
        super._burn(tokenId);
    }
}
