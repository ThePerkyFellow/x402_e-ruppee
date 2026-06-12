// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPBM
 * @notice Interface for the PBM (Purpose Bound Money) Wrapper contract.
 *
 * ELI5: This is the "rule book" that says what functions our lockbox MUST have.
 *       Any lockbox contract must follow these rules — it's a promise.
 *       Think of it like the shape of a puzzle piece: if you don't match the shape,
 *       you can't fit into the system.
 */
interface IPBM {
    // ─── Structs ──────────────────────────────────────────────────────────────

    struct PaymentAuthorization {
        address payer;          // Who locked the money
        address nodeAddress;    // Who should receive it (seeder/compute node)
        uint256 amount;         // How much (in smallest unit: paise or USDC wei)
        bytes32 conditionsHash; // Hash of all the rules that must be met
        uint256 expiresAt;      // When the lock expires (Unix timestamp)
        bool settled;           // Has the money been released?
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event PaymentAuthorized(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed node,
        uint256 amount,
        uint256 expiresAt
    );

    event PaymentSettled(
        bytes32 indexed paymentId,
        address indexed node,
        uint256 amount
    );

    event PaymentExpired(bytes32 indexed paymentId);

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Lock money with conditions. The "wrap" step.
     * @param paymentId Unique ID for this payment
     * @param nodeAddress Who gets paid when conditions are met
     * @param amount How much to lock
     * @param conditionsHash keccak256 hash of the payment conditions
     * @param expiresAt When this authorization expires
     */
    function authorizePayment(
        bytes32 paymentId,
        address nodeAddress,
        uint256 amount,
        bytes32 conditionsHash,
        uint256 expiresAt
    ) external;

    /**
     * @notice Release locked money to the node. The "unwrap" step.
     * @param paymentId Which payment to settle
     * @param conditionsHash Must match what was authorized (proof the conditions are same)
     */
    function settlePayment(
        bytes32 paymentId,
        bytes32 conditionsHash
    ) external;

    /**
     * @notice Get money back after expiry. Safety net for payers.
     * @param paymentId Which payment to reclaim
     */
    function reclaimExpired(bytes32 paymentId) external;
}
