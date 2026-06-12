import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root (two levels up from packages/contracts)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Hardhat Configuration
 *
 * 🧒 ELI5: This file tells Hardhat (our smart contract toolbox):
 *   - Which version of Solidity to use (like which LEGO instruction version)
 *   - Where to find our contracts (the src/ folder)
 *   - Which blockchains to deploy to (local for testing, Base Testnet for real testing)
 *
 * "hardhat" network: A fake blockchain that runs on your computer. Free, instant, perfect for testing.
 * "baseTestnet": Base Sepolia — a real blockchain but with fake money. Good for testing with friends.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Optimize for ~200 calls (good balance between deploy cost and call cost)
      },
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      // Local network — runs in memory, free, instant
      chainId: 31337,
    },
    baseTestnet: {
      url: process.env.BASE_TESTNET_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 84532,
    },
  },
};

export default config;
