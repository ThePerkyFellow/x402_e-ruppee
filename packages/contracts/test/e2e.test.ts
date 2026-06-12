/**
 * End-to-End Test — Full Payment Flow
 *
 * 🧒 ELI5: This test does EVERYTHING the real system would do:
 *   1. Creates fake money
 *   2. Deploys the lockbox
 *   3. A robot puts money in the lockbox
 *   4. The facilitator opens the lockbox
 *   5. Checks: did the right person get paid?
 *   6. Tries to cheat — makes sure cheating fails
 *
 * This runs entirely on a local fake blockchain. No real money involved.
 *
 * Run with: npx hardhat test test/e2e.test.ts
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockEINR, PBMWrapper } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("End-to-End: Full Payment Flow", function () {
  // ─── Cast of Characters ─────────────────────────────────────────────────
  // 🧒 Like a play — each "signer" is a different person in the story

  let mockToken: MockEINR;
  let pbmWrapper: PBMWrapper;
  let owner: SignerWithAddress;        // System admin (deploys contracts)
  let payer: SignerWithAddress;        // AI agent that wants to buy something
  let seeder: SignerWithAddress;       // Node that serves video chunks
  let facilitator: SignerWithAddress;  // The referee that settles payments

  // Addresses (filled after deployment)
  let mockTokenAddress: string;
  let pbmWrapperAddress: string;

  // ─── Act 1: Set the Stage ──────────────────────────────────────────────
  before(async function () {
    console.log("\n🎬 Setting the stage...\n");

    [owner, payer, seeder, facilitator] = await ethers.getSigners();

    console.log("👤 Owner (admin):", owner.address);
    console.log("🤖 Payer (AI agent):", payer.address);
    console.log("📡 Seeder (video node):", seeder.address);
    console.log("⚖️  Facilitator (referee):", facilitator.address);
    console.log("");

    // Deploy MockEINR
    const MockEINRFactory = await ethers.getContractFactory("MockEINR");
    mockToken = await MockEINRFactory.deploy(2); // 2 decimals = paise
    await mockToken.waitForDeployment();
    mockTokenAddress = await mockToken.getAddress();
    console.log("💰 MockEINR deployed at:", mockTokenAddress);

    // Deploy PBMWrapper
    const PBMWrapperFactory = await ethers.getContractFactory("PBMWrapper");
    pbmWrapper = await PBMWrapperFactory.deploy(mockTokenAddress);
    await pbmWrapper.waitForDeployment();
    pbmWrapperAddress = await pbmWrapper.getAddress();
    console.log("🔒 PBMWrapper deployed at:", pbmWrapperAddress);

    // Setup: register seeder node + authorize facilitator
    await pbmWrapper.registerNode(seeder.address);
    await pbmWrapper.authorizeFacilitator(facilitator.address);
    console.log("✅ Seeder registered, facilitator authorized");

    // Mint tokens to payer (like giving the AI agent a wallet with money)
    const payerBalance = ethers.parseUnits("1000", 2); // 1000 eINR
    await mockToken.mint(payer.address, payerBalance);
    console.log("✅ Minted 1000 eINR to payer");

    // Payer approves PBMWrapper to spend their tokens
    // (ERC-20 requires this — you must "allow" a contract to move your tokens)
    await mockToken.connect(payer).approve(pbmWrapperAddress, payerBalance);
    console.log("✅ Payer approved PBMWrapper to spend tokens");

    console.log("\n🎬 Stage is set! Let the show begin.\n");
  });

  // ─── Act 2: The Happy Path — Full Payment Cycle ────────────────────────
  describe("Act 2: Happy Path — Robot Pays for Video Chunk", function () {

    const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-video-chunk-42"));
    const conditionsHash = ethers.keccak256(
      ethers.solidityPacked(
        ["string", "string", "uint256"],
        ["video-chunk-42", "seeder-node-1", 200]
      )
    );
    const paymentAmount = ethers.parseUnits("2", 2); // 2 eINR = 200 paise

    it("Step 1: Payer checks their balance", async function () {
      const balance = await mockToken.balanceOf(payer.address);
      console.log(`   💰 Payer balance: ${ethers.formatUnits(balance, 2)} eINR`);
      expect(balance).to.equal(ethers.parseUnits("1000", 2));
    });

    it("Step 2: Payer authorizes payment (locks money in lockbox)", async function () {
      const expiresAt = (await time.latest()) + 300; // 5 minutes from now

      await pbmWrapper.connect(payer).authorizePayment(
        paymentId,
        seeder.address,
        paymentAmount,
        conditionsHash,
        expiresAt
      );

      // Check: money moved from payer to PBMWrapper
      const payerBalance = await mockToken.balanceOf(payer.address);
      const lockboxBalance = await mockToken.balanceOf(pbmWrapperAddress);

      console.log(`   💰 Payer balance after lock: ${ethers.formatUnits(payerBalance, 2)} eINR`);
      console.log(`   🔒 Lockbox balance: ${ethers.formatUnits(lockboxBalance, 2)} eINR`);

      expect(payerBalance).to.equal(ethers.parseUnits("998", 2)); // 1000 - 2
      expect(lockboxBalance).to.equal(paymentAmount);
    });

    it("Step 3: Check payment authorization on-chain", async function () {
      const auth = await pbmWrapper.getPaymentAuth(paymentId);

      console.log(`   📋 Payer: ${auth.payer}`);
      console.log(`   📋 Node: ${auth.nodeAddress}`);
      console.log(`   📋 Amount: ${ethers.formatUnits(auth.amount, 2)} eINR`);
      console.log(`   📋 Settled: ${auth.settled}`);

      expect(auth.payer).to.equal(payer.address);
      expect(auth.nodeAddress).to.equal(seeder.address);
      expect(auth.amount).to.equal(paymentAmount);
      expect(auth.settled).to.be.false; // Not settled yet!
    });

    it("Step 4: Facilitator settles payment (opens the lockbox)", async function () {
      // This is what our facilitator server does when it calls POST /facilitate
      await pbmWrapper.connect(facilitator).settlePayment(paymentId, conditionsHash);

      // Check: money moved from lockbox to seeder
      const seederBalance = await mockToken.balanceOf(seeder.address);
      const lockboxBalance = await mockToken.balanceOf(pbmWrapperAddress);

      console.log(`   📡 Seeder balance: ${ethers.formatUnits(seederBalance, 2)} eINR`);
      console.log(`   🔒 Lockbox balance: ${ethers.formatUnits(lockboxBalance, 2)} eINR (empty!)`);

      expect(seederBalance).to.equal(paymentAmount); // Seeder got 2 eINR!
      expect(lockboxBalance).to.equal(0); // Lockbox is empty
    });

    it("Step 5: Verify payment on-chain", async function () {
      const [isValid, nodeAddr, amount] = await pbmWrapper.verifyPayment(paymentId);

      console.log(`   ✅ Payment valid: ${isValid}`);
      console.log(`   📡 Paid to: ${nodeAddr}`);
      console.log(`   💰 Amount: ${ethers.formatUnits(amount, 2)} eINR`);

      expect(isValid).to.be.true;
      expect(nodeAddr).to.equal(seeder.address);
    });

    it("Step 6: Payment marked as settled on-chain", async function () {
      const auth = await pbmWrapper.getPaymentAuth(paymentId);
      console.log(`   📋 Settled: ${auth.settled} ← this means money was released`);
      expect(auth.settled).to.be.true;
    });
  });

  // ─── Act 3: Security Tests — Try to Cheat ──────────────────────────────
  describe("Act 3: Security — Can Anyone Cheat?", function () {

    it("Cheat attempt 1: Replay the same payment", async function () {
      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-video-chunk-42"));
      const conditionsHash = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "string", "uint256"],
          ["video-chunk-42", "seeder-node-1", 200]
        )
      );
      const expiresAt = (await time.latest()) + 300;

      // Try to reuse the same payment ID — should FAIL
      await expect(
        pbmWrapper.connect(payer).authorizePayment(
          paymentId, seeder.address, 200, conditionsHash, expiresAt
        )
      ).to.be.revertedWith("Payment ID already used");

      console.log("   ❌ Replay attack BLOCKED ✓");
    });

    it("Cheat attempt 2: Random person tries to settle", async function () {
      const freshPaymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-fresh-001"));
      const conditionsHash = ethers.keccak256(ethers.toUtf8Bytes("fresh-conditions"));
      const expiresAt = (await time.latest()) + 300;

      // Create a fresh payment
      await pbmWrapper.connect(payer).authorizePayment(
        freshPaymentId, seeder.address, 100, conditionsHash, expiresAt
      );

      // Random person (owner, not facilitator) tries to settle — should FAIL
      await expect(
        pbmWrapper.connect(owner).settlePayment(freshPaymentId, conditionsHash)
      ).to.be.revertedWith("Not authorized facilitator");

      console.log("   ❌ Unauthorized settlement BLOCKED ✓");

      // Clean up: let the real facilitator settle it
      await pbmWrapper.connect(facilitator).settlePayment(freshPaymentId, conditionsHash);
    });

    it("Cheat attempt 3: Settle with wrong conditions", async function () {
      const freshPaymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-fresh-002"));
      const realHash = ethers.keccak256(ethers.toUtf8Bytes("real-conditions"));
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake-conditions"));
      const expiresAt = (await time.latest()) + 300;

      await pbmWrapper.connect(payer).authorizePayment(
        freshPaymentId, seeder.address, 100, realHash, expiresAt
      );

      // Try settling with wrong hash — should FAIL
      await expect(
        pbmWrapper.connect(facilitator).settlePayment(freshPaymentId, fakeHash)
      ).to.be.revertedWith("Conditions hash mismatch");

      console.log("   ❌ Wrong conditions BLOCKED ✓");

      // Clean up
      await pbmWrapper.connect(facilitator).settlePayment(freshPaymentId, realHash);
    });

    it("Cheat attempt 4: Settle after expiry", async function () {
      const freshPaymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-fresh-003"));
      const conditionsHash = ethers.keccak256(ethers.toUtf8Bytes("expiry-test"));
      const expiresAt = (await time.latest()) + 30; // 30 seconds

      await pbmWrapper.connect(payer).authorizePayment(
        freshPaymentId, seeder.address, 100, conditionsHash, expiresAt
      );

      // Time travel: jump forward 31 seconds
      await time.increase(31);

      // Try to settle — should FAIL (expired)
      await expect(
        pbmWrapper.connect(facilitator).settlePayment(freshPaymentId, conditionsHash)
      ).to.be.revertedWith("Payment authorization expired");

      console.log("   ❌ Expired payment settlement BLOCKED ✓");
    });

    it("Safety net: Payer reclaims expired payment", async function () {
      // The payment from the previous test is expired. Payer should get money back.
      const freshPaymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-fresh-003"));

      const balanceBefore = await mockToken.balanceOf(payer.address);
      await pbmWrapper.connect(payer).reclaimExpired(freshPaymentId);
      const balanceAfter = await mockToken.balanceOf(payer.address);

      const refunded = balanceAfter - balanceBefore;
      console.log(`   💰 Refunded: ${ethers.formatUnits(refunded, 2)} eINR ✓`);
      expect(refunded).to.equal(100); // Got 100 paise back (1 eINR)
    });
  });

  // ─── Act 4: Final Tally ────────────────────────────────────────────────
  describe("Act 4: Final Balances", function () {
    it("Check everyone's final balance", async function () {
      const payerBal = await mockToken.balanceOf(payer.address);
      const seederBal = await mockToken.balanceOf(seeder.address);
      const lockboxBal = await mockToken.balanceOf(await pbmWrapper.getAddress());

      console.log("\n   ══════════════════════════════════");
      console.log("   📊 FINAL BALANCES");
      console.log("   ──────────────────────────────────");
      console.log(`   🤖 Payer:   ${ethers.formatUnits(payerBal, 2)} eINR`);
      console.log(`   📡 Seeder:  ${ethers.formatUnits(seederBal, 2)} eINR`);
      console.log(`   🔒 Lockbox: ${ethers.formatUnits(lockboxBal, 2)} eINR`);
      console.log("   ══════════════════════════════════\n");

      // Lockbox should be empty — all money either settled or refunded
      expect(lockboxBal).to.equal(0);
    });
  });
});
