import { ethers } from "hardhat"

async function main() {
  const contractName = "RedeemableNFT"
  const Contract = await ethers.getContractFactory(contractName)
  console.log("Contract Name: ", contractName)

  const contract = await Contract.deploy()
  await contract.deployed()

  console.log("Contract Address:", contract.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
