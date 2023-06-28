import { ethers } from "hardhat"

export interface ContractInfo {
  name: string
  version: string
  address: string
}

export interface SignatureSigner {
  signer: string
}

export const signSimpleEther = async (
  privateKey: string,
  chainId: number,
  contractInfo: ContractInfo
) => {
  const domain = {
    name: contractInfo.name,
    version: contractInfo.version,
    chainId: chainId,
    verifyingContract: contractInfo.address,
  }
  const messageTypes = {
    TicketSigner: [{ name: "signer", type: "address" }],
  }

  const provider = ethers.getDefaultProvider()
  const wallet = new ethers.Wallet(privateKey, provider)
  const signerAdress = await wallet.getAddress()
  const signature = await wallet._signTypedData(domain, messageTypes, {
    signer: signerAdress,
  })
  return signature
}
