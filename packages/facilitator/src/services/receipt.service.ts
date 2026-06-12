/**
 * Receipt Service — JWT-based payment receipt generation and verification
 *
 * 🧒 ELI5: After the lockbox pays the node, the facilitator writes a "receipt."
 *   This receipt is a JWT (JSON Web Token) — a signed note that says:
 *   "I, the facilitator, confirm that payment X was made to node Y for amount Z."
 *   The node checks this note to make sure it's real before serving resources.
 *
 * JWT = three parts separated by dots:
 *   header.payload.signature
 *   - Header: "I'm a JWT signed with HS256"
 *   - Payload: The actual receipt data
 *   - Signature: Proof the facilitator wrote this (can't be faked)
 */

import * as jose from 'jose';
import type { PaymentReceipt } from '../types/index.js';

export class ReceiptService {
  private secret: Uint8Array;
  private issuer: string;

  /**
   * @param jwtSecret — Secret key for signing JWTs. KEEP THIS SECRET.
   *   If someone gets this, they can forge receipts.
   * @param issuer — The facilitator's identifier in the JWT
   */
  constructor(jwtSecret: string, issuer: string = 'x402-rupee-facilitator') {
    this.secret = new TextEncoder().encode(jwtSecret);
    this.issuer = issuer;
  }

  /**
   * Generate a signed payment receipt.
   *
   * 🧒 ELI5: Write a receipt, sign it with your secret stamp.
   *   Expires in 24 hours (after that, node should have already verified it).
   */
  async generate(receipt: PaymentReceipt): Promise<string> {
    const jwt = await new jose.SignJWT({
      paymentId: receipt.paymentId,
      txHash: receipt.txHash,
      nodeAddress: receipt.nodeAddress,
      amount: receipt.amount,
      settledAt: receipt.settledAt,
      facilitator: receipt.facilitator,
      chainId: receipt.chainId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setExpirationTime('24h')
      .sign(this.secret);

    return jwt;
  }

  /**
   * Verify a payment receipt JWT.
   *
   * 🧒 ELI5: Check if the receipt is real (signed by us) and not expired.
   *   Returns the receipt data if valid, null if fake or expired.
   */
  async verify(token: string): Promise<PaymentReceipt | null> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret, {
        issuer: this.issuer,
      });

      return {
        paymentId: payload.paymentId as string,
        txHash: payload.txHash as string,
        nodeAddress: payload.nodeAddress as string,
        amount: payload.amount as string,
        settledAt: payload.settledAt as number,
        facilitator: payload.facilitator as string,
        chainId: payload.chainId as number,
      };
    } catch {
      // Invalid signature, expired, or malformed
      return null;
    }
  }
}
