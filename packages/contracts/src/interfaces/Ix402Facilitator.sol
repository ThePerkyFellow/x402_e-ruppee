// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Ix402Facilitator
 * @notice Interface that x402 facilitator contracts must implement.
 *
 * ELI5: The facilitator is the "referee" in a game.
 *       When Player A says "I paid!" and Player B says "give me the ball!",
 *       the referee checks if the payment is real and says "yep, legit, play on."
 *       This interface defines what the referee MUST be able to do.
 */
interface Ix402Facilitator {
    /**
     * @notice Verify that a payment receipt is valid.
     * @param paymentId The payment to verify
     * @return isValid Whether the payment was settled successfully
     * @return nodeAddress The node that received the payment
     * @return amount The amount that was settled
     */
    function verifyPayment(bytes32 paymentId)
        external
        view
        returns (bool isValid, address nodeAddress, uint256 amount);
}
