import { expect } from "chai"
import "dotenv/config"
import hre, { ethers } from "hardhat"
import { ContractInfo, signSimpleEther } from "../lib/sign"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const chainId = 31337

const big = (value: string | number) => {
  return ethers.BigNumber.from(value)
}

describe("RedeemableNFT", () => {
  const ipfsURI = "ipfs://Qmad1jMvG1vHo9QoAcrAmFX5ZyoodL8Srk7vixAH9w8aNK/"
  const contractName = "RedeemableNFT"
  const PRIVATE_KEY: string =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  const redeemStart = 2524608000

  let accounts: SignerWithAddress[]
  before(async () => {
    accounts = await ethers.getSigners()
  })
  beforeEach(async function () {
    await hre.network.provider.send("hardhat_reset")
  })

  it("should deploy", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()

    await contract.deployed()

    const signer = accounts[0]
    await contract.airDrop([signer.address])
    expect(await contract.tokenURI(big("0"))).to.equal(ipfsURI + "0.json")
    const balance = await contract.balanceOf(signer.address)
    expect(balance).equal(1)

    await contract.setApprovalForAll(accounts[1].address, true)
  })

  it("airDrop NFT", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()

    await contract.deployed()

    let totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(0))

    let signersAddress = accounts.map((signer) => signer.address)
    signersAddress = signersAddress.slice(0, 4)
    expect(signersAddress.length).equal(4)
    await contract.airDrop(signersAddress)

    let tokenOwner = await contract.ownerOf(big(0))
    expect(tokenOwner).equal(signersAddress[0])

    tokenOwner = await contract.ownerOf(big(1))
    expect(tokenOwner).equal(signersAddress[1])
  })

  it("airDrop over maxSupplly", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()

    await contract.deployed()

    let signersAddress = accounts.map((signer) => signer.address)
    // air drop 1
    let receivers = Array(1).fill(signersAddress[0])
    await contract.airDrop(receivers)
    expect(await contract.totalSupply()).to.equal(big(1))
    receivers = Array(21).fill(signersAddress[0])
    await expect(contract.airDrop(receivers)).to.be.revertedWith("High Quntity")
    expect(await contract.totalSupply()).to.equal(big(1))
    // air drop 50
    receivers = Array(20).fill(signersAddress[0])

    await contract.airDrop(receivers)
    expect(await contract.totalSupply()).to.equal(big(21))
    await contract.airDrop(receivers)
    expect(await contract.totalSupply()).to.equal(big(41))
    await contract.airDrop(receivers)
    expect(await contract.totalSupply()).to.equal(big(61))
    await contract.airDrop(receivers)
    expect(await contract.totalSupply()).to.equal(big(81))
    await expect(contract.airDrop(receivers)).to.be.revertedWith("Out of Stock")
  })

  it("can privateMint only if privateSale is true", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }

    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // disable private sale
    await contract.toggleSaleStatus()

    await expect(
      contract.connect(accounts[1]).privateMint(big(5), signature, {
        value: ethers.utils.parseEther("0.05"),
      })
    ).to.be.revertedWith("Private Sale Not Allowed")

    // enable private sale
    await contract.toggleSaleStatus()

    await contract.connect(accounts[1]).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    expect(await contract.totalSupply()).to.equal(big(5))
  })

  it("can't privateMint after max", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()

    await contract.deployed()

    const contractAdress = contract.address

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }

    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    await contract.privateMint(big(20), signature, {
      value: ethers.utils.parseEther("2"),
    })

    await contract.privateMint(big(20), signature, {
      value: ethers.utils.parseEther("2"),
    })
    await contract.privateMint(big(20), signature, {
      value: ethers.utils.parseEther("2"),
    })
    await contract.privateMint(big(20), signature, {
      value: ethers.utils.parseEther("2"),
    })
    expect(await contract.totalSupply()).to.equal(big(80))

    await contract.privateMint(big(10), signature, {
      value: ethers.utils.parseEther("1"),
    })
    expect(await contract.totalSupply()).to.equal(big(90))

    await expect(
      contract.privateMint(big(11), signature, {
        value: ethers.utils.parseEther("1.1"),
      })
    ).to.be.revertedWith("Out of Stock")
  })

  it("can't privateMint with invalid ammount", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }

    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    await expect(
      contract.privateMint(big(20), signature, {
        value: ethers.utils.parseEther("0.01"),
      })
    ).to.be.revertedWith("INSUFFICIENT_ETH")

    expect(await contract.totalSupply()).to.equal(big(0))
  })

  it("can burn", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // check init state
    let totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(0))
    await expect(contract.tokenURI(0)).to.be.revertedWith(
      "ERC721Metadata: URI query for nonexistent token"
    )

    // mint 5 tokens
    await contract.privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.5"),
    })

    totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(5))
    expect(await contract.tokenURI(big("0"))).to.equal(ipfsURI + "0.json")
    // burn token #0
    await contract.burn(big(0))
    totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(4))
    await expect(contract.tokenURI(0)).to.be.revertedWith(
      "ERC721Metadata: URI query for nonexistent token"
    )
    // mint 5 tokens
    await contract.privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.5"),
    })
    totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(9))
    expect(await contract.tokenURI(big("9"))).to.equal(ipfsURI + "9.json")
  })

  it("can redeem tokenId 0", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    // mint 5 tokens
    await contract.connect(buyerAccount).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    let totalRedemption
    let redeemedBy
    let tokenOfRedemptionByIndex

    // check tokenId 0 is not redeemed
    const tokenId = big(0)
    redeemedBy = await contract.redeemedBy(tokenId)
    expect(redeemedBy).to.equal(ethers.constants.AddressZero)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(0))

    await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
      "global index out of bounds"
    )

    // redeem tokenId 0
    await contract.connect(buyerAccount).redeem(tokenId)
    expect(await contract.redeemedBy(tokenId)).to.be.equal(buyerAccount.address)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(1))
    tokenOfRedemptionByIndex = await contract.tokenOfRedemptionByIndex(big(0))
    expect(tokenOfRedemptionByIndex).to.equal(tokenId)

    // check total supply after redeem
    let totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(4))
    await expect(contract.tokenURI(0)).to.be.revertedWith(
      "ERC721Metadata: URI query for nonexistent token"
    )
    // mint 5 tokens
    await contract.privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.5"),
    })
    totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(9))
    expect(await contract.tokenURI(big("9"))).to.equal(ipfsURI + "9.json")
  })

  it("can redeem tokenId 4", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // mint 5 tokens
    await contract.connect(buyerAccount).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    let totalRedemption
    let redeemedBy
    let tokenOfRedemptionByIndex

    // check tokenId 4 is not redeemed
    const tokenId = big(4)
    redeemedBy = await contract.redeemedBy(tokenId)
    expect(redeemedBy).to.equal(ethers.constants.AddressZero)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(0))

    await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
      "global index out of bounds"
    )

    // redeem tokenId 4
    await contract.connect(buyerAccount).redeem(tokenId)
    expect(await contract.redeemedBy(tokenId)).to.be.equal(buyerAccount.address)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(1))
    tokenOfRedemptionByIndex = await contract.tokenOfRedemptionByIndex(big(0))
    expect(tokenOfRedemptionByIndex).to.equal(tokenId)
  })

  it("burns token when redeem", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // mint 5 tokens
    await contract.connect(buyerAccount).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    let totalSupply = await contract.totalSupply()
    expect(totalSupply).to.equal(big(5))

    const tokenId = big(0)

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    // redeem tokenId 0
    await contract.connect(buyerAccount).redeem(tokenId)

    // check total supply after redeem
    totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(4))

    await expect(contract.tokenURI(tokenId)).to.be.revertedWith(
      "ERC721Metadata: URI query for nonexistent token"
    )

    // mint 5 tokens
    await contract.privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })
    totalSupply = await contract.totalSupply()
    expect(totalSupply).equal(big(9))
    expect(await contract.tokenURI(big("9"))).to.equal(ipfsURI + "9.json")
  })

  it("cannot redeem before REDEEM_STARTAT", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]
    const nonBuyerAccount = accounts[2]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // mint 5 tokens
    await contract.connect(buyerAccount).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    let totalRedemption
    let redeemedBy

    // check tokenId 4 is not redeemed
    const tokenId = big(4)
    redeemedBy = await contract.redeemedBy(tokenId)
    expect(redeemedBy).to.equal(ethers.constants.AddressZero)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(0))

    await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
      "global index out of bounds"
    )

    // change the timestamp before Jan 01 2023
    await ethers.provider.send("evm_mine", [redeemStart - 1000])

    // cannot redeem tokenId 4
    await expect(
      contract.connect(nonBuyerAccount).redeem(tokenId)
    ).to.be.revertedWith("Redemption has not started")

    expect(await contract.redeemedBy(tokenId)).to.be.equal(
      ethers.constants.AddressZero
    )
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(0))
    await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
      "global index out of bounds"
    )
  })

  it("cannot redeem without owning", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]
    const nonBuyerAccount = accounts[2]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // mint 5 tokens
    await contract.connect(buyerAccount).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    let totalRedemption
    let redeemedBy

    // check tokenId 4 is not redeemed
    const tokenId = big(4)
    redeemedBy = await contract.redeemedBy(tokenId)
    expect(redeemedBy).to.equal(ethers.constants.AddressZero)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(0))

    await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
      "global index out of bounds"
    )

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    // cannot redeem tokenId 4
    await expect(
      contract.connect(nonBuyerAccount).redeem(tokenId)
    ).to.be.revertedWith("Unauthorized")

    expect(await contract.redeemedBy(tokenId)).to.be.equal(
      ethers.constants.AddressZero
    )
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(0))
    await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
      "global index out of bounds"
    )
  })

  it("can redeem after transfer", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]
    const newOwnerAccount = accounts[2]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // buyer mints 5 tokens
    await contract.connect(buyerAccount).privateMint(big(5), signature, {
      value: ethers.utils.parseEther("0.05"),
    })

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    let totalRedemption
    let tokenOfRedemptionByIndex

    // check tokenId 4 is not redeemed
    const tokenId = big(4)
    // redeemedBy = await contract.redeemedBy(tokenId)
    // expect(redeemedBy).to.equal(ethers.constants.AddressZero)
    // totalRedemption = await contract.totalRedemption()
    // expect(totalRedemption).to.equal(big(0))

    // await expect(contract.tokenOfRedemptionByIndex(0)).to.revertedWith(
    //   "global index out of bounds"
    // )

    // check account cannot redeem before owning the token
    await expect(
      contract.connect(newOwnerAccount).redeem(tokenId)
    ).to.be.revertedWith("Unauthorized")

    // transfer token to newOwnerAccount
    await contract
      .connect(buyerAccount)
      ["safeTransferFrom(address,address,uint256)"](
        buyerAccount.address,
        newOwnerAccount.address,
        tokenId
      )

    // redeem

    await contract.connect(newOwnerAccount).redeem(tokenId)
    expect(await contract.redeemedBy(tokenId)).to.be.equal(
      newOwnerAccount.address
    )
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(1))
    tokenOfRedemptionByIndex = await contract.tokenOfRedemptionByIndex(big(0))
    expect(tokenOfRedemptionByIndex).to.equal(tokenId)
  })

  it("can get all redeemed tokens", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    // 60 tokens
    await contract.connect(accounts[0]).privateMint(big(20), signature, {
      value: ethers.utils.parseEther("0.2"),
    })
    await contract.connect(accounts[1]).privateMint(big(20), signature, {
      value: ethers.utils.parseEther("0.2"),
    })
    await contract.connect(accounts[2]).privateMint(big(20), signature, {
      value: ethers.utils.parseEther("0.2"),
    })

    // redeem
    const redeemIdsByAccount = [
      [2, 4, 19],
      [24, 37, 26],
      [42, 55],
    ]
    let expectedRedeemIds: any[] = redeemIdsByAccount.reduce(
      (previousValue, currentValue) => previousValue.concat(currentValue),
      []
    )
    expectedRedeemIds = expectedRedeemIds.map((tokenId) => big(tokenId))

    for (let index = 0; index < redeemIdsByAccount.length; index++) {
      const tokens = redeemIdsByAccount[index]
      for (let tokenId of tokens) {
        await contract.connect(accounts[index]).redeem(big(tokenId))
      }
    }

    // get all redeem tokenId
    const totalRedemption = (await contract.totalRedemption()).toNumber()
    let redeemedIds = []
    for (let index = 0; index < totalRedemption; index++) {
      const tokenId = await contract.tokenOfRedemptionByIndex(index)
      redeemedIds.push(tokenId)
    }
    expect(redeemedIds).to.be.eql(expectedRedeemIds)
  })

  it("event is emitted", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()
    const contractAdress = contract.address
    const buyerAccount = accounts[1]

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contractAdress,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    // 60 tokens
    await contract.connect(buyerAccount).privateMint(big(20), signature, {
      value: ethers.utils.parseEther("0.2"),
    })

    // change the timestamp
    await ethers.provider.send("evm_mine", [redeemStart])

    // redeem
    const tokenId = big(0)
    let totalRedemption

    await expect(contract.connect(buyerAccount).redeem(tokenId))
      .to.emit(contract, "Redeem")
      .withArgs(buyerAccount.address, tokenId)

    expect(await contract.redeemedBy(tokenId)).to.be.equal(buyerAccount.address)
    totalRedemption = await contract.totalRedemption()
    expect(totalRedemption).to.equal(big(1))
  })

  it("can withdraw all", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contract.address,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    await contract.connect(accounts[4]).privateMint(big(10), signature, {
      value: ethers.utils.parseEther("0.1"),
    })

    expect(await contract.totalSupply()).to.equal(big(10))

    const baseBalance = ethers.utils.parseEther("10000")
    expect(await accounts[1].getBalance()).to.equal(baseBalance)
    expect(await accounts[2].getBalance()).to.equal(baseBalance)
    expect(await accounts[3].getBalance()).to.equal(baseBalance)

    await contract.connect(accounts[5])["release(address)"](accounts[1].address)
    await contract.connect(accounts[5])["release(address)"](accounts[2].address)
    await contract.connect(accounts[5])["release(address)"](accounts[3].address)

    // should be 0.1 * .205 = 0.0205
    expect(await accounts[1].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.0205"))
    )
    // should be 0.1 * .205 = 0.0205
    expect(await accounts[2].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.0205"))
    )

    // should be 0.1 * .59 = 0.059
    expect(await accounts[3].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.059"))
    )
  })

  it("can withdraw each", async () => {
    const Contract = await ethers.getContractFactory(contractName)
    const contract = await Contract.deploy()
    await contract.deployed()

    // create signature
    const contractInfo: ContractInfo = {
      name: contractName,
      version: "1",
      address: contract.address,
    }
    const signature = await signSimpleEther(PRIVATE_KEY, chainId, contractInfo)

    await contract.connect(accounts[4]).privateMint(big(10), signature, {
      value: ethers.utils.parseEther("0.1"),
    })

    const baseBalance = ethers.utils.parseEther("10000")

    await contract.connect(accounts[5])["release(address)"](accounts[1].address)

    // should be 0.1 * .205 = 0.0205
    expect(await accounts[1].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.0205"))
    )
    expect(await accounts[2].getBalance()).to.equal(baseBalance)
    expect(await accounts[3].getBalance()).to.equal(baseBalance)

    await contract.connect(accounts[4]).privateMint(big(10), signature, {
      value: ethers.utils.parseEther("0.1"),
    })

    await contract.connect(accounts[5])["release(address)"](accounts[1].address)
    await contract.connect(accounts[5])["release(address)"](accounts[2].address)
    await contract.connect(accounts[5])["release(address)"](accounts[3].address)

    // should be 0.1 * .205 * 2 = 0.041
    expect(await accounts[1].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.041"))
    )
    // should be 0.1 * .205 * 2 = 0.041
    expect(await accounts[2].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.041"))
    )
    // should be 0.1 * .59 * 2 = 0.118
    expect(await accounts[3].getBalance()).to.equal(
      baseBalance.add(ethers.utils.parseEther("0.118"))
    )
  })
})
