/**
 * Deploy Script — Deploys MockEINR + PBMWrapper to local Hardhat network
 *
 * 🧒 ELI5: This script puts our contracts onto the blockchain.
 *   Like installing an app on your phone — it wasn't there before,
 *   now it's there and anyone can use it.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   (make sure `npx hardhat node` is running first!)
 *
 * Or for testing (auto uses in-memory network):
 *   npx hardhat run scripts/deploy.ts
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer, facilitator, node1] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════════");
  console.log("  x402-rupee Contract Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📋 Deployer address:", deployer.address);
  console.log("📋 Facilitator address:", facilitator.address);
  console.log("📋 Node 1 address:", node1.address);
  console.log("");

  // ─── Step 1: Deploy MockEINR ────────────────────────────────────────────
  console.log("🔨 Step 1: Deploying MockEINR (fake e-Rupee token)...");
  const MockEINR = await ethers.getContractFactory("MockEINR");
  const mockEINR = await MockEINR.deploy(2); // 2 decimals = paise
  await mockEINR.waitForDeployment();
  const mockEINRAddress = await mockEINR.getAddress();
  console.log("   ✅ MockEINR deployed at:", mockEINRAddress);
  console.log("");

  // ─── Step 2: Deploy PBMWrapper ──────────────────────────────────────────
  console.log("🔨 Step 2: Deploying PBMWrapper (the lockbox)...");
  const PBMWrapper = await ethers.getContractFactory("PBMWrapper");
  const pbmWrapper = await PBMWrapper.deploy(mockEINRAddress);
  await pbmWrapper.waitForDeployment();
  const pbmWrapperAddress = await pbmWrapper.getAddress();
  console.log("   ✅ PBMWrapper deployed at:", pbmWrapperAddress);
  console.log("");

  // ─── Step 3: Configure the system ───────────────────────────────────────
  console.log("⚙️  Step 3: Configuring the system...");

  // Register node1 as an approved payment receiver
  await pbmWrapper.registerNode(node1.address);
  console.log("   ✅ Node registered:", node1.address);

  // Authorize facilitator to settle payments
  await pbmWrapper.authorizeFacilitator(facilitator.address);
  console.log("   ✅ Facilitator authorized:", facilitator.address);

  // Mint some test tokens to deployer (acting as payer too)
  const mintAmount = ethers.parseUnits("10000", 2); // 10,000 eINR
  await mockEINR.mint(deployer.address, mintAmount);
  console.log("   ✅ Minted 10,000 eINR to deployer");

  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  Deployment Complete! 🎉");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📝 Add these to your .env file:");
  console.log("");
  console.log(`   MOCK_EINR_ADDRESS=${mockEINRAddress}`);
  console.log(`   PBM_WRAPPER_ADDRESS=${pbmWrapperAddress}`);
  console.log("");
  console.log("📝 Hardhat test accounts (NEVER use these on mainnet!):");
  console.log(`   DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`   FACILITATOR_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
