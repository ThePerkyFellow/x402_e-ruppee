/**
 * Generate a fresh wallet for testnet use
 *
 * 🧒 ELI5: Creates a brand new "bank account" on the blockchain.
 *   Gives you a public address (account number) and private key (password).
 *   This wallet starts with ZERO money — you'll get fake ETH from a faucet.
 *
 * Run with: npx hardhat run scripts/generate-wallet.ts
 */

import { ethers } from "hardhat";

async function main() {
  // Create a random wallet
  const wallet = ethers.Wallet.createRandom();

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🔑 New Wallet Generated (for TESTNET use only!)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("  📋 Address (public — safe to share):");
  console.log(`     ${wallet.address}`);
  console.log("");
  console.log("  🔐 Private Key (secret — NEVER share!):");
  console.log(`     ${wallet.privateKey}`);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("  Next steps:");
  console.log("  1. Copy the PRIVATE KEY into your .env file:");
  console.log(`     DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`);
  console.log(`     FACILITATOR_PRIVATE_KEY=${wallet.privateKey}`);
  console.log("");
  console.log("  2. Get free test ETH by going to a faucet:");
  console.log("     https://portal.cdp.coinbase.com/products/faucet");
  console.log(`     Paste this address: ${wallet.address}`);
  console.log("     Select: Base Sepolia");
  console.log("");
  console.log("  3. Once you have test ETH, deploy:");
  console.log("     npx hardhat run scripts/deploy-testnet.ts --network baseTestnet");
  console.log("");
  console.log("  ⚠️  This wallet has ZERO money right now.");
  console.log("     You MUST get test ETH from a faucet before deploying.");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
