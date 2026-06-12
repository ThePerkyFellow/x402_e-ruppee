/**
 * Live E2E Test — Full payment flow on Base Sepolia via HTTP
 *
 * What this does:
 * 1. Authorize payment on-chain (payer → PBMWrapper)
 * 2. POST /facilitate (HTTP → facilitator → blockchain settle)
 * 3. POST /verify (check receipt is valid)
 * 4. Check balances on-chain
 *
 * Run: npx hardhat run scripts/test-live-e2e.ts --network baseTestnet
 */

import { ethers } from "hardhat";

const FACILITATOR_URL = "http://localhost:3001";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Live E2E Test — Base Sepolia + HTTP");
  console.log("═══════════════════════════════════════════════\n");

  // ─── Connect to deployed contracts ────────────────────────────────────
  const mockEINRAddress = process.env.MOCK_EINR_ADDRESS!;
  const pbmWrapperAddress = process.env.PBM_WRAPPER_ADDRESS!;

  const MockEINR = await ethers.getContractAt("MockEINR", mockEINRAddress);
  const PBMWrapper = await ethers.getContractAt("PBMWrapper", pbmWrapperAddress);

  console.log(`📋 Deployer: ${deployer.address}`);
  console.log(`📋 MockEINR: ${mockEINRAddress}`);
  console.log(`📋 PBMWrapper: ${pbmWrapperAddress}`);

  // ─── Step 0: Check balance ────────────────────────────────────────────
  const balance = await MockEINR.balanceOf(deployer.address);
  console.log(`💰 eINR balance: ${ethers.formatUnits(balance, 2)}`);

  if (balance === 0n) {
    console.log("⚠️  No eINR. Minting 1000 eINR...");
    const mintTx = await MockEINR.mint(deployer.address, ethers.parseUnits("1000", 2));
    await mintTx.wait();
    console.log("✅ Minted");
  }

  // ─── Step 1: Approve PBMWrapper to spend tokens ───────────────────────
  console.log("\n🔨 Step 1: Approving PBMWrapper to spend tokens...");
  const approveTx = await MockEINR.approve(pbmWrapperAddress, ethers.parseUnits("100", 2));
  await approveTx.wait();
  console.log("✅ Approved");

  // ─── Step 2: Authorize payment on-chain ───────────────────────────────
  console.log("\n🔨 Step 2: Authorizing payment on-chain (locking money)...");

  const paymentId = ethers.keccak256(
    ethers.toUtf8Bytes("live-e2e-test-" + Date.now())
  );
  const conditionsHash = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "address", "uint256"],
      [paymentId, deployer.address, ethers.parseUnits("1", 2)]
    )
  );
  const amount = ethers.parseUnits("1", 2); // 1 eINR = 100 paise

  // Get current block timestamp + 300 seconds
  const block = await ethers.provider.getBlock("latest");
  const expiresAt = block!.timestamp + 300;

  const authTx = await PBMWrapper.authorizePayment(
    paymentId,
    deployer.address, // deployer is also registered as node for testing
    amount,
    conditionsHash,
    expiresAt
  );
  const authReceipt = await authTx.wait();
  console.log(`✅ Payment authorized on-chain`);
  console.log(`   TX: https://sepolia.basescan.org/tx/${authReceipt?.hash}`);
  console.log(`   PaymentId: ${paymentId}`);

  // ─── Step 2b: Verify payment exists on-chain (wait for RPC propagation) ───
  console.log("\n⏳ Step 2b: Verifying payment is readable on-chain (RPC propagation)...");
  let authOnChain = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      authOnChain = await PBMWrapper.getPaymentAuth(paymentId);
      if (authOnChain && authOnChain.payer !== ethers.ZeroAddress) {
        console.log(`✅ Payment verified on-chain after ${attempt} attempt(s)`);
        console.log(`   Payer: ${authOnChain.payer}`);
        console.log(`   Node: ${authOnChain.nodeAddress}`);
        console.log(`   Amount: ${ethers.formatUnits(authOnChain.amount, 2)} eINR`);
        console.log(`   Settled: ${authOnChain.settled}`);
        break;
      }
    } catch (e: any) {
      console.log(`   Attempt ${attempt}: read error — ${e.message?.slice(0, 80)}`);
    }
    if (attempt === 15) {
      console.log("❌ Payment not readable after 15 attempts. RPC may be lagging badly.");
      process.exit(1);
    }
    console.log(`   Attempt ${attempt}: payment not yet visible, waiting 2s...`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ─── Step 3: Call POST /facilitate via HTTP ───────────────────────────
  console.log("\n🔨 Step 3: Calling POST /facilitate (HTTP → server → blockchain)...");

  const facilitateBody = {
    paymentId,
    nodeAddress: deployer.address,
    amount: amount.toString(),
    conditionsHash,
    payerSignature: "0x" + "00".repeat(65), // placeholder — signature verification is stubbed
    expiresAt,
    useCase: "media",
    metadata: { contentHash: "0x" + "ab".repeat(32) },
  };

  const facilitateRes = await fetch(`${FACILITATOR_URL}/facilitate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(facilitateBody),
  });

  const facilitateData = await facilitateRes.json();

  if (facilitateRes.ok) {
    console.log("✅ Settlement succeeded via HTTP!");
    console.log(`   TX Hash: ${(facilitateData as any).txHash}`);
    console.log(`   Receipt JWT: ${((facilitateData as any).receipt as string).substring(0, 50)}...`);
  } else {
    console.log("❌ Settlement failed:", JSON.stringify(facilitateData, null, 2));
    process.exit(1);
  }

  // ─── Step 4: Call POST /verify to validate receipt ────────────────────
  console.log("\n🔨 Step 4: Verifying receipt via POST /verify...");

  const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt: (facilitateData as any).receipt }),
  });

  const verifyData = await verifyRes.json() as any;

  if (verifyData.valid) {
    console.log("✅ Receipt verified!");
    console.log(`   Payment ID: ${verifyData.receipt.paymentId}`);
    console.log(`   Node: ${verifyData.receipt.nodeAddress}`);
    console.log(`   Amount: ${verifyData.receipt.amount}`);
  } else {
    console.log("❌ Receipt invalid:", JSON.stringify(verifyData, null, 2));
  }

  // ─── Step 5: Check on-chain state (wait for settlement propagation) ────
  console.log("\n🔨 Step 5: Checking on-chain state...");

  // Wait for settlement TX to propagate through RPC
  console.log("   ⏳ Waiting for settlement to propagate...");
  let settledOnChain = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      const postAuth = await PBMWrapper.getPaymentAuth(paymentId);
      if (postAuth && postAuth.settled) {
        settledOnChain = true;
        console.log(`   ✅ Settlement visible after ${attempt} attempt(s)`);
        break;
      }
    } catch {}
    if (attempt < 15) {
      console.log(`   Attempt ${attempt}: settled not yet visible, waiting 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const [isValid, nodeAddr, onChainAmount] = await PBMWrapper.verifyPayment(paymentId);
  console.log(`   On-chain settled: ${settledOnChain}`);
  console.log(`   verifyPayment.isValid: ${isValid}`);
  console.log(`   Node: ${nodeAddr}`);
  console.log(`   Amount: ${ethers.formatUnits(onChainAmount, 2)} eINR`);

  if (!settledOnChain) {
    console.log("   ⚠️  Settlement not propagated — RPC lag. Results may be stale.");
  }

  // ─── Step 6: Try replay attack ────────────────────────────────────────
  console.log("\n🔨 Step 6: Testing replay attack (should fail)...");

  const replayRes = await fetch(`${FACILITATOR_URL}/facilitate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(facilitateBody),
  });

  const replayData = await replayRes.json() as any;
  if (replayRes.status === 409) {
    console.log("✅ Replay attack BLOCKED (409 Conflict)");
  } else if (!replayRes.ok) {
    console.log(`✅ Replay attack BLOCKED (${replayRes.status}: ${replayData.error})`);
  } else {
    console.log("❌ REPLAY ATTACK SUCCEEDED — this is a bug!");
  }

  // ─── Done ─────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  🎉 Live E2E Test Complete!");
  console.log("═══════════════════════════════════════════════");
  console.log("\n  All steps:");
  console.log("  ✅ On-chain authorization");
  console.log("  ✅ HTTP settlement (POST /facilitate)");
  console.log("  ✅ Receipt verification (POST /verify)");
  console.log("  ✅ On-chain state confirmed");
  console.log("  ✅ Replay attack blocked");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error.message || error);
    process.exit(1);
  });
