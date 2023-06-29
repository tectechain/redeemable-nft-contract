import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "dotenv/config"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts:
        process.env.DEVELOPMENT_PRIVATE_KEY !== undefined
          ? [process.env.DEVELOPMENT_PRIVATE_KEY]
          : [],
      chainId: 44787,
    },
  },
  gasReporter: {
    enabled: true,
  },
}

export default config
