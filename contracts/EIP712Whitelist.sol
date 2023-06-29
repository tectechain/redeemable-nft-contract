// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract EIP712Whitelist is EIP712 {
    address private constant SIGNER_ADDRESS =
        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    constructor() EIP712("RedeemableNFT", "1") {}

    /**
        @notice verify signature for privateMint
    */
    function simpleVerify(bytes memory signature) public view returns (bool) {
        //hash the plain text message
        bytes32 hashStruct = keccak256(
            abi.encode(
                keccak256("TicketSigner(address signer)"),
                SIGNER_ADDRESS
            )
        );
        bytes32 digest = _hashTypedDataV4(hashStruct);

        // verify typed signature
        address signer = ECDSA.recover(digest, signature);
        bool isSigner = signer == SIGNER_ADDRESS;
        return isSigner;
    }
}
