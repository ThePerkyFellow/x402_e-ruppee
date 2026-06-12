/**
 * Deploy to Base Sepolia Testnet
 *
 * 🧒 ELI5: This script puts our contracts onto a REAL blockchain
 *   (Base Sepolia testnet). Unlike local Hardhat, this blockchain
 *   runs 24/7 on computers worldwide. Your contracts will live there
 *   permanently. But the money is still fake — it's a practice blockchain.
 *
 * Prerequisites:
 *   1. .env file with DEPLOYER_PRIVATE_KEY set
 *   2. Test ETH in your wallet (from a faucet)
 *
 * Run with:
 *   npx hardhat run scripts/deploy-testnet.ts --network baseTestnet
 */

import { ethers, network } from "hardhat";

async function main() {
  // ─── Verify we're on the right network ──────────────────────────────────
  const chainId = (await ethers.provider.getNetwork()).chainId;

  if (chainId !== 84532n) {
    console.error("❌ Wrong network! Expected Base Sepolia (chainId: 84532)");
    console.error(`   Got chainId: ${chainId}`);
    console.error("   Run with: --network baseTestnet");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  x402-rupee Contract Deployment (Base Sepolia)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  📋 Deployer: ${deployer.address}`);
  console.log(`  ⛓️  Network: Base Sepolia (chainId: ${chainId})`);
  console.log(`  💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");

  // Check if deployer has enough ETH for gas
  if (balance === 0n) {
    console.error("❌ Your wallet has ZERO ETH!");
    console.error("   Get free test ETH from: https://portal.cdp.coinbase.com/products/faucet");
    console.error(`   Paste this address: ${deployer.address}`);
    process.exit(1);
  }

  // ─── Step 1: Deploy MockEINR ──────────────────────────────────────────
  console.log("🔨 Step 1: Deploying MockEINR (fake e-Rupee token)...");
  const MockEINR = await ethers.getContractFactory("MockEINR");
  const mockEINR = await MockEINR.deploy(2); // 2 decimals = paise
  await mockEINR.waitForDeployment();
  const mockEINRAddress = await mockEINR.getAddress();
  const deployTx1 = mockEINR.deploymentTransaction();
  console.log(`   ✅ MockEINR deployed at: ${mockEINRAddress}`);
  console.log(`   📝 TX: https://sepolia.basescan.org/tx/${deployTx1?.hash}`);
  console.log("");

  // ─── Step 2: Deploy PBMWrapper ────────────────────────────────────────
  console.log("🔨 Step 2: Deploying PBMWrapper (the lockbox)...");
  const PBMWrapper = await ethers.getContractFactory("PBMWrapper");
  const pbmWrapper = await PBMWrapper.deploy(mockEINRAddress);
  await pbmWrapper.waitForDeployment();
  const pbmWrapperAddress = await pbmWrapper.getAddress();
  const deployTx2 = pbmWrapper.deploymentTransaction();
  console.log(`   ✅ PBMWrapper deployed at: ${pbmWrapperAddress}`);
  console.log(`   📝 TX: https://sepolia.basescan.org/tx/${deployTx2?.hash}`);
  console.log("");

  // ─── Step 3: Configure ────────────────────────────────────────────────
  console.log("⚙️  Step 3: Configuring system...");

  // Register the deployer as a node (for testing — you'll register real nodes later)
  console.log("   Registering deployer as a test node...");
  const regTx = await pbmWrapper.registerNode(deployer.address);
  await regTx.wait();
  console.log(`   ✅ Node registered: ${deployer.address}`);

  // Authorize the deployer as a facilitator (for testing)
  console.log("   Authorizing deployer as facilitator...");
  const authTx = await pbmWrapper.authorizeFacilitator(deployer.address);
  await authTx.wait();
  console.log(`   ✅ Facilitator authorized: ${deployer.address}`);

  // Mint some test tokens to deployer
  console.log("   Minting 10,000 eINR to deployer...");
  const mintAmount = ethers.parseUnits("10000", 2);
  const mintTx = await mockEINR.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log(`   ✅ Minted 10,000 eINR`);

  // ─── Done! ────────────────────────────────────────────────────────────
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  🎉 Deployment Complete!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("  📝 Add these to your .env file:");
  console.log(`     MOCK_EINR_ADDRESS=${mockEINRAddress}`);
  console.log(`     PBM_WRAPPER_ADDRESS=${pbmWrapperAddress}`);
  console.log("");
  console.log("  🔍 View on BaseScan:");
  console.log(`     MockEINR:   https://sepolia.basescan.org/address/${mockEINRAddress}`);
  console.log(`     PBMWrapper: https://sepolia.basescan.org/address/${pbmWrapperAddress}`);
  console.log("");
  console.log(`  ⛽ Gas used: ${ethers.formatEther(gasUsed)} ETH`);
  console.log(`  💰 Remaining balance: ${ethers.formatEther(finalBalance)} ETH`);
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  // ─── Save deployment info ─────────────────────────────────────────────
  // Write to a file so we don't lose the addresses
  const fs = await import("fs");
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: Number(chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockEINR: {
        address: mockEINRAddress,
        txHash: deployTx1?.hash,
      },
      PBMWrapper: {
        address: pbmWrapperAddress,
        txHash: deployTx2?.hash,
      },
    },
  };

  const docsDir = "../../docs";
  fs.writeFileSync(
    `${docsDir}/deployments.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("  📄 Deployment info saved to docs/deployments.json");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error.message || error);
    process.exit(1);
  });
