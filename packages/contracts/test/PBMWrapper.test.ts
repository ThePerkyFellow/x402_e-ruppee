import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MockEINR, PBMWrapper } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * PBMWrapper Contract Tests
 *
 * 🧒 ELI5: We're testing our lockbox with fake money to make sure:
 *   1. ✅ Normal use works (put money in, get money out)
 *   2. ❌ Cheaters get caught (same ticket used twice)
 *   3. ❌ Late payments rejected (clock ran out)
 *   4. ✅ Refunds work (get money back if nobody claimed)
 *   5. ❌ Wrong password rejected (conditions don't match)
 *   6. ❌ Strangers can't unlock the box (unauthorized facilitator)
 *
 * These 6 scenarios cover ALL the ways someone could try to use (or abuse) the system.
 */
describe("PBMWrapper", function () {
  // ─── Test Setup ───────────────────────────────────────────────────────────
  // Think of this as "setting up the board game before playing"

  let mockToken: MockEINR;
  let pbmWrapper: PBMWrapper;
  let owner: SignerWithAddress;        // The "principal" — deploys and manages
  let payer: SignerWithAddress;        // The one paying (AI agent / app)
  let node: SignerWithAddress;         // The one getting paid (seeder / compute node)
  let facilitator: SignerWithAddress;  // The "referee" — settles payments
  let stranger: SignerWithAddress;     // Random person trying to mess with things

  // Test constants
  const INITIAL_SUPPLY = ethers.parseUnits("10000", 2); // 10,000 eINR (2 decimals = paise)
  const PAYMENT_AMOUNT = ethers.parseUnits("100", 2);   // 100 eINR
  const PAYMENT_ID = ethers.keccak256(ethers.toUtf8Bytes("payment-001"));
  const CONDITIONS_HASH = ethers.keccak256(ethers.toUtf8Bytes("conditions-v1"));
  const WRONG_HASH = ethers.keccak256(ethers.toUtf8Bytes("wrong-conditions"));

  /**
   * beforeEach runs before EVERY test.
   * Like resetting the board game to a fresh state each time.
   *
   * Steps:
   * 1. Get 5 different "players" (wallet addresses)
   * 2. Deploy the mock eINR token
   * 3. Deploy the PBMWrapper with the mock token as collateral
   * 4. Register the node (allowed to receive payments)
   * 5. Authorize the facilitator (allowed to settle payments)
   * 6. Mint tokens to the payer (give them money to work with)
   * 7. Payer approves PBMWrapper to spend their tokens (required for ERC-20)
   */
  beforeEach(async function () {
    [owner, payer, node, facilitator, stranger] = await ethers.getSigners();

    // Deploy mock token (2 decimals like INR paise)
    const MockEINRFactory = await ethers.getContractFactory("MockEINR");
    mockToken = await MockEINRFactory.deploy(2);
    await mockToken.waitForDeployment();

    // Deploy PBM wrapper with mock token as collateral
    const PBMWrapperFactory = await ethers.getContractFactory("PBMWrapper");
    pbmWrapper = await PBMWrapperFactory.deploy(await mockToken.getAddress());
    await pbmWrapper.waitForDeployment();

    // Admin setup: register node and authorize facilitator
    await pbmWrapper.registerNode(node.address);
    await pbmWrapper.authorizeFacilitator(facilitator.address);

    // Give payer some tokens and approve PBMWrapper to spend them
    await mockToken.mint(payer.address, INITIAL_SUPPLY);
    await mockToken.connect(payer).approve(
      await pbmWrapper.getAddress(),
      INITIAL_SUPPLY // Approve the full amount for convenience in tests
    );
  });

  // ─── Test Scenario 1: Happy Path ────────────────────────────────────────
  // 🧒 "Everything works perfectly. Money goes in, job done, money goes out."

  describe("Scenario 1: Happy Path — Authorize → Settle → Node Receives Funds", function () {
    it("should complete full payment cycle", async function () {
      const expiresAt = (await time.latest()) + 3600; // 1 hour from now

      // Step 1: Payer authorizes payment (locks money in the lockbox)
      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID,
        node.address,
        PAYMENT_AMOUNT,
        CONDITIONS_HASH,
        expiresAt
      );

      // Verify: payer's balance decreased, wrapper holds the money
      expect(await mockToken.balanceOf(payer.address)).to.equal(
        INITIAL_SUPPLY - PAYMENT_AMOUNT
      );
      expect(await mockToken.balanceOf(await pbmWrapper.getAddress())).to.equal(
        PAYMENT_AMOUNT
      );

      // Step 2: Facilitator settles the payment (releases money to node)
      await pbmWrapper.connect(facilitator).settlePayment(
        PAYMENT_ID,
        CONDITIONS_HASH
      );

      // Verify: node received the money, wrapper is empty
      expect(await mockToken.balanceOf(node.address)).to.equal(PAYMENT_AMOUNT);
      expect(await mockToken.balanceOf(await pbmWrapper.getAddress())).to.equal(0);
    });

    it("should emit correct events", async function () {
      const expiresAt = (await time.latest()) + 3600;

      // Check PaymentAuthorized event
      await expect(
        pbmWrapper.connect(payer).authorizePayment(
          PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
        )
      ).to.emit(pbmWrapper, "PaymentAuthorized")
        .withArgs(PAYMENT_ID, payer.address, node.address, PAYMENT_AMOUNT, expiresAt);

      // Check PaymentSettled event
      await expect(
        pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, CONDITIONS_HASH)
      ).to.emit(pbmWrapper, "PaymentSettled")
        .withArgs(PAYMENT_ID, node.address, PAYMENT_AMOUNT);
    });
  });

  // ─── Test Scenario 2: Replay Attack Prevention ──────────────────────────
  // 🧒 "Cheater tries to use the same bus ticket twice. System says NO."

  describe("Scenario 2: Replay Attack — Same Payment ID Used Twice", function () {
    it("should reject authorization with already-used payment ID", async function () {
      const expiresAt = (await time.latest()) + 3600;

      // First use: works fine
      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );
      await pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, CONDITIONS_HASH);

      // Second use: REJECTED ❌
      await expect(
        pbmWrapper.connect(payer).authorizePayment(
          PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
        )
      ).to.be.revertedWith("Payment ID already used");
    });

    it("should reject settling an already-settled payment", async function () {
      const expiresAt = (await time.latest()) + 3600;

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      // First settle: works
      await pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, CONDITIONS_HASH);

      // Second settle: REJECTED ❌
      await expect(
        pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, CONDITIONS_HASH)
      ).to.be.revertedWith("Already settled");
    });
  });

  // ─── Test Scenario 3: Expired Payment ───────────────────────────────────
  // 🧒 "Clock ran out. Too late to claim the money."

  describe("Scenario 3: Expired Payment — Settle After Expiry Reverts", function () {
    it("should reject settlement after expiry", async function () {
      const expiresAt = (await time.latest()) + 60; // Expires in 60 seconds

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      // Fast-forward time past expiry
      // 🧒 ELI5: We have a time machine in tests! We jump forward 61 seconds.
      await time.increase(61);

      // Try to settle: REJECTED ❌ — too late!
      await expect(
        pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, CONDITIONS_HASH)
      ).to.be.revertedWith("Payment authorization expired");
    });

    it("should reject authorization with past expiry", async function () {
      const pastTime = (await time.latest()) - 10; // 10 seconds ago

      await expect(
        pbmWrapper.connect(payer).authorizePayment(
          PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, pastTime
        )
      ).to.be.revertedWith("Expiry must be in future");
    });
  });

  // ─── Test Scenario 4: Reclaim After Expiry ──────────────────────────────
  // 🧒 "Nobody claimed the money by Friday, so the kid gets their $5 back."

  describe("Scenario 4: Reclaim — Payer Gets Money Back After Expiry", function () {
    it("should return collateral to payer after expiry", async function () {
      const expiresAt = (await time.latest()) + 60;

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      // Payer balance decreased
      const balanceAfterAuth = await mockToken.balanceOf(payer.address);
      expect(balanceAfterAuth).to.equal(INITIAL_SUPPLY - PAYMENT_AMOUNT);

      // Fast-forward past expiry
      await time.increase(61);

      // Reclaim
      await pbmWrapper.connect(payer).reclaimExpired(PAYMENT_ID);

      // Payer got their money back
      expect(await mockToken.balanceOf(payer.address)).to.equal(INITIAL_SUPPLY);
      // Wrapper is empty
      expect(await mockToken.balanceOf(await pbmWrapper.getAddress())).to.equal(0);
    });

    it("should emit PaymentExpired event", async function () {
      const expiresAt = (await time.latest()) + 60;

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      await time.increase(61);

      await expect(
        pbmWrapper.connect(payer).reclaimExpired(PAYMENT_ID)
      ).to.emit(pbmWrapper, "PaymentExpired")
        .withArgs(PAYMENT_ID);
    });

    it("should reject reclaim before expiry", async function () {
      const expiresAt = (await time.latest()) + 3600; // 1 hour

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      // Try to reclaim immediately: REJECTED ❌ — not expired yet!
      await expect(
        pbmWrapper.connect(payer).reclaimExpired(PAYMENT_ID)
      ).to.be.revertedWith("Not yet expired");
    });

    it("should reject reclaim by non-payer", async function () {
      const expiresAt = (await time.latest()) + 60;

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      await time.increase(61);

      // Stranger tries to steal the refund: REJECTED ❌
      await expect(
        pbmWrapper.connect(stranger).reclaimExpired(PAYMENT_ID)
      ).to.be.revertedWith("Not payer");
    });
  });

  // ─── Test Scenario 5: Wrong Conditions Hash ────────────────────────────
  // 🧒 "The password doesn't match. Lockbox stays locked."

  describe("Scenario 5: Wrong Conditions Hash — Settlement Reverts", function () {
    it("should reject settlement with wrong conditions hash", async function () {
      const expiresAt = (await time.latest()) + 3600;

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      // Try to settle with wrong hash: REJECTED ❌
      await expect(
        pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, WRONG_HASH)
      ).to.be.revertedWith("Conditions hash mismatch");
    });
  });

  // ─── Test Scenario 6: Unauthorized Facilitator ──────────────────────────
  // 🧒 "Random person walks up and tries to open the lockbox. System says 'who are you?!'"

  describe("Scenario 6: Unauthorized Facilitator — Settlement Reverts", function () {
    it("should reject settlement from unauthorized address", async function () {
      const expiresAt = (await time.latest()) + 3600;

      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );

      // Stranger tries to settle: REJECTED ❌
      await expect(
        pbmWrapper.connect(stranger).settlePayment(PAYMENT_ID, CONDITIONS_HASH)
      ).to.be.revertedWith("Not authorized facilitator");
    });
  });

  // ─── Additional Edge Cases ──────────────────────────────────────────────

  describe("Edge Cases", function () {
    it("should reject authorization for unregistered node", async function () {
      const expiresAt = (await time.latest()) + 3600;

      await expect(
        pbmWrapper.connect(payer).authorizePayment(
          PAYMENT_ID, stranger.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
        )
      ).to.be.revertedWith("Node not registered");
    });

    it("should reject authorization with zero amount", async function () {
      const expiresAt = (await time.latest()) + 3600;

      await expect(
        pbmWrapper.connect(payer).authorizePayment(
          PAYMENT_ID, node.address, 0, CONDITIONS_HASH, expiresAt
        )
      ).to.be.revertedWith("Amount must be positive");
    });

    it("should allow verifyPayment to return correct data", async function () {
      const expiresAt = (await time.latest()) + 3600;

      // Before settlement: not valid
      let [isValid] = await pbmWrapper.verifyPayment(PAYMENT_ID);
      expect(isValid).to.be.false;

      // Authorize and settle
      await pbmWrapper.connect(payer).authorizePayment(
        PAYMENT_ID, node.address, PAYMENT_AMOUNT, CONDITIONS_HASH, expiresAt
      );
      await pbmWrapper.connect(facilitator).settlePayment(PAYMENT_ID, CONDITIONS_HASH);

      // After settlement: valid
      [isValid] = await pbmWrapper.verifyPayment(PAYMENT_ID);
      expect(isValid).to.be.true;
    });
  });

  // ─── Admin Function Tests ──────────────────────────────────────────────

  describe("Admin Functions", function () {
    it("should only allow owner to register/deregister nodes", async function () {
      await expect(
        pbmWrapper.connect(stranger).registerNode(stranger.address)
      ).to.be.revertedWithCustomError(pbmWrapper, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to authorize/revoke facilitators", async function () {
      await expect(
        pbmWrapper.connect(stranger).authorizeFacilitator(stranger.address)
      ).to.be.revertedWithCustomError(pbmWrapper, "OwnableUnauthorizedAccount");
    });

    it("should correctly deregister a node", async function () {
      expect(await pbmWrapper.registeredNodes(node.address)).to.be.true;
      await pbmWrapper.deregisterNode(node.address);
      expect(await pbmWrapper.registeredNodes(node.address)).to.be.false;
    });

    it("should correctly revoke a facilitator", async function () {
      expect(await pbmWrapper.authorizedFacilitators(facilitator.address)).to.be.true;
      await pbmWrapper.revokeFacilitator(facilitator.address);
      expect(await pbmWrapper.authorizedFacilitators(facilitator.address)).to.be.false;
    });
  });
});
