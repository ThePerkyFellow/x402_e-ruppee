/**
 * PBM Service — Core business logic for PBM wrapper interactions
 *
 * 🧒 ELI5: This is the "brain" of the facilitator.
 *   Routes (HTTP endpoints) are the "ears" — they hear requests.
 *   Adapters are the "hands" — they touch the blockchain.
 *   This service is the "brain" — it makes decisions:
 *   - "Is this signature real?"
 *   - "Does the conditions hash match?"
 *   - "Should I approve this payment?"
 */

import { keccak256, encodePacked, type Hex } from 'viem';
import type { SettlementAdapter, PaymentAuthOnChain, FacilitateRequest } from '../types/index.js';

export class PBMService {
  private adapter: SettlementAdapter;

  constructor(adapter: SettlementAdapter) {
    this.adapter = adapter;
  }

  /**
   * Verify the payer's signature.
   *
   * 🧒 ELI5: When you sign a letter, people can check it's really from you.
   *   Crypto signatures work the same way — the payer signs the payment request
   *   with their private key, and we verify it matches their public address.
   *
   * TODO: Implement proper EIP-712 signature verification.
   * For Phase 1 development, we accept all signatures.
   */
  async verifyPayerSignature(_request: FacilitateRequest): Promise<boolean> {
    // TODO: Implement EIP-712 typed data signature verification
    // This involves:
    // 1. Reconstruct the typed data structure from request fields
    // 2. Recover the signer address from the signature
    // 3. Compare recovered address with the expected payer address
    //
    // For now, return true for development. MUST be implemented before production.
    console.warn('[PBMService] Signature verification not yet implemented — accepting all signatures');
    return true;
  }

  /**
   * Get payment authorization from blockchain.
   */
  async getPaymentAuth(paymentId: string): Promise<PaymentAuthOnChain | null> {
    return this.adapter.getPaymentAuth(paymentId);
  }

  /**
   * Compute the conditions hash from request data.
   *
   * 🧒 ELI5: A hash is like a fingerprint for data.
   *   We take all the payment conditions, blend them together,
   *   and get a unique "fingerprint." If anyone changes even ONE letter,
   *   the fingerprint is completely different.
   *   This is how we know the conditions haven't been tampered with.
   *
   * Uses keccak256 (same hash function Ethereum uses).
   */
  computeConditionsHash(request: FacilitateRequest): string {
    // Pack the conditions the same way the smart contract would
    const packed = encodePacked(
      ['bytes32', 'address', 'uint256', 'uint256'],
      [
        request.paymentId as Hex,
        request.nodeAddress as `0x${string}`,
        BigInt(request.amount),
        BigInt(request.expiresAt),
      ]
    );

    return keccak256(packed);
  }

  /**
   * Settle payment via the adapter.
   *
   * 🧒 ELI5: "Brain tells the hand: open the lockbox now."
   */
  async settlePayment(paymentId: string, conditionsHash: string): Promise<string> {
    return this.adapter.settlePayment(paymentId, conditionsHash);
  }
}
