// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPBM.sol";
import "./interfaces/Ix402Facilitator.sol";

/**
 * @title PBMWrapper
 * @notice Implements Purpose Bound Money logic for x402 micropayments.
 *
 * 🧒 ELI5: Imagine a lockbox at school:
 *   1. Kid A puts $5 in the lockbox and says "give this to Kid B when they
 *      bring me my homework" (authorizePayment)
 *   2. The teacher checks: "Did Kid B bring the homework?" If yes, teacher
 *      opens lockbox and gives $5 to Kid B (settlePayment)
 *   3. If Kid B never shows up by Friday, Kid A gets their $5 back
 *      (reclaimExpired)
 *
 * Architecture (adapted from MAS Project Orchid — Singapore PBM):
 *   - Collateral: eINR/USDC locked in this contract (the money in the lockbox)
 *   - Wrapper: This contract, encoding x402 payment conditions (the lockbox rules)
 *   - Settlement: Triggered by x402 facilitator after verifying payment proof
 *
 * Key difference from Singapore PBM:
 *   - Singapore: wraps money for vouchers (human consumer use case)
 *   - Ours: wraps money for API micropayments (machine-to-machine use case)
 *   - Conditions: content hashes + task IDs, not merchant lists
 */
contract PBMWrapper is IPBM, Ix402Facilitator, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────
    // ELI5: These are the "memory" of our lockbox. It remembers everything.

    /// @notice The token used as collateral (eINR or USDC)
    IERC20 public immutable collateralToken;

    /// @notice Which nodes (robots) are allowed to receive payments
    mapping(address => bool) public registeredNodes;

    /// @notice Which facilitators (referees) are allowed to settle payments
    mapping(address => bool) public authorizedFacilitators;

    /// @notice All payment authorizations stored by their unique ID
    mapping(bytes32 => PaymentAuthorization) public paymentAuths;

    /// @notice Tracks used payment IDs to prevent replay attacks
    /// ELI5: Like a used bus ticket — can't ride twice with the same ticket
    mapping(bytes32 => bool) public usedPaymentIds;

    // ─── Events (from IPBM interface, re-declared for clarity) ────────────────

    event NodeRegistered(address indexed node);
    event NodeDeregistered(address indexed node);
    event FacilitatorAuthorized(address indexed facilitator);
    event FacilitatorRevoked(address indexed facilitator);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _collateralToken Address of the ERC-20 token to use as collateral.
     *        Phase 1: USDC on Base. Phase 2: e-Rupee.
     */
    constructor(address _collateralToken) Ownable(msg.sender) {
        require(_collateralToken != address(0), "Invalid collateral token");
        collateralToken = IERC20(_collateralToken);
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Authorize a micropayment. Locks collateral in this contract.
     *         This is the "wrap" step from Singapore PBM.
     *
     * 🧒 ELI5: "Put money in the lockbox with a note saying who gets it and when."
     *
     * What happens:
     * 1. Checks: payment ID is fresh, node is registered, expiry is future, amount > 0
     * 2. Moves tokens FROM the payer TO this contract (locked)
     * 3. Saves all the details in storage
     * 4. Emits event so off-chain systems (facilitator) know about it
     */
    function authorizePayment(
        bytes32 paymentId,
        address nodeAddress,
        uint256 amount,
        bytes32 conditionsHash,
        uint256 expiresAt
    ) external override nonReentrant {
        require(!usedPaymentIds[paymentId], "Payment ID already used");
        require(registeredNodes[nodeAddress], "Node not registered");
        require(expiresAt > block.timestamp, "Expiry must be in future");
        require(amount > 0, "Amount must be positive");

        // Lock collateral from payer into this contract
        // SafeERC20 handles tokens that don't return bool (safer than raw transfer)
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        // Store the authorization details
        paymentAuths[paymentId] = PaymentAuthorization({
            payer: msg.sender,
            nodeAddress: nodeAddress,
            amount: amount,
            conditionsHash: conditionsHash,
            expiresAt: expiresAt,
            settled: false
        });

        emit PaymentAuthorized(paymentId, msg.sender, nodeAddress, amount, expiresAt);
    }

    /**
     * @notice Settle a payment — release locked money to the node.
     *         Only authorized facilitators can call this.
     *         This is the "unwrap + release" step from Singapore PBM.
     *
     * 🧒 ELI5: "Teacher opens the lockbox and gives money to Kid B because
     *           they confirmed the homework was delivered."
     *
     * Security layers:
     * 1. Only authorized facilitators can call (not random people)
     * 2. Payment must not be already settled (no double-spending)
     * 3. Payment must not be expired (time check)
     * 4. Conditions hash must match (proof the conditions are the same ones agreed upon)
     */
    function settlePayment(
        bytes32 paymentId,
        bytes32 conditionsHash
    ) external override nonReentrant {
        require(authorizedFacilitators[msg.sender], "Not authorized facilitator");

        PaymentAuthorization storage auth = paymentAuths[paymentId];

        require(auth.amount > 0, "Payment authorization not found");
        require(!auth.settled, "Already settled");
        require(block.timestamp <= auth.expiresAt, "Payment authorization expired");
        require(auth.conditionsHash == conditionsHash, "Conditions hash mismatch");

        // Mark as settled BEFORE transfer (prevents reentrancy)
        auth.settled = true;
        usedPaymentIds[paymentId] = true;

        // Release collateral to the node
        collateralToken.safeTransfer(auth.nodeAddress, auth.amount);

        emit PaymentSettled(paymentId, auth.nodeAddress, auth.amount);
    }

    /**
     * @notice Reclaim expired payment authorization. Returns collateral to payer.
     *
     * 🧒 ELI5: "Kid B never showed up by Friday. Kid A gets their $5 back."
     */
    function reclaimExpired(bytes32 paymentId) external override nonReentrant {
        PaymentAuthorization storage auth = paymentAuths[paymentId];

        require(auth.payer == msg.sender, "Not payer");
        require(!auth.settled, "Already settled");
        require(block.timestamp > auth.expiresAt, "Not yet expired");

        // Mark as settled (really "reclaimed" but reusing the flag)
        auth.settled = true;
        usedPaymentIds[paymentId] = true;

        // Return collateral to payer
        collateralToken.safeTransfer(auth.payer, auth.amount);

        emit PaymentExpired(paymentId);
    }

    // ─── Ix402Facilitator Implementation ──────────────────────────────────────

    /**
     * @notice Check if a payment was settled. Used by nodes to verify receipts.
     *
     * 🧒 ELI5: "Kid B asks the teacher: 'Did I really get paid?' Teacher checks the book."
     */
    function verifyPayment(bytes32 paymentId)
        external
        view
        override
        returns (bool isValid, address nodeAddress, uint256 amount)
    {
        PaymentAuthorization storage auth = paymentAuths[paymentId];
        return (auth.settled && auth.amount > 0, auth.nodeAddress, auth.amount);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────
    // ELI5: Only the "principal" (contract owner) can do these things.

    function registerNode(address node) external onlyOwner {
        require(node != address(0), "Invalid node address");
        registeredNodes[node] = true;
        emit NodeRegistered(node);
    }

    function deregisterNode(address node) external onlyOwner {
        registeredNodes[node] = false;
        emit NodeDeregistered(node);
    }

    function authorizeFacilitator(address facilitator) external onlyOwner {
        require(facilitator != address(0), "Invalid facilitator address");
        authorizedFacilitators[facilitator] = true;
        emit FacilitatorAuthorized(facilitator);
    }

    function revokeFacilitator(address facilitator) external onlyOwner {
        authorizedFacilitators[facilitator] = false;
        emit FacilitatorRevoked(facilitator);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getPaymentAuth(bytes32 paymentId)
        external
        view
        returns (PaymentAuthorization memory)
    {
        return paymentAuths[paymentId];
    }
}
