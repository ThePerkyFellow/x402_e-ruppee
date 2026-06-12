/**
 * e-Rupee Settlement Adapter — Phase 2 (STUB)
 *
 * 🧒 ELI5: This is the "cash register for rupees (e-Rupee)."
 *   Right now it's EMPTY — like a cash register with no drawer installed.
 *   When RBI gives us sandbox access, we'll fill in the actual code.
 *
 *   The beauty of this design: the facilitator server doesn't care
 *   which adapter it uses. It calls the same functions (settlePayment, etc.)
 *   regardless of whether money is USDC or e-Rupee.
 *   This is called the "Adapter Pattern" — swap the implementation,
 *   keep the interface.
 */

import type { SettlementAdapter, PaymentAuthOnChain, AuthorizeParams } from '../types/index.js';

export class ERupeeAdapter implements SettlementAdapter {
  /**
   * TODO Phase 2: Call RBI CBDC sandbox endpoint
   *
   * Expected API (when available):
   * POST https://cbdc-sandbox.rbi.org.in/v1/payments/settle
   * {
   *   payment_id: paymentId,
   *   conditions_hash: conditionsHash,
   *   facilitator_token: process.env.RBI_FACILITATOR_TOKEN
   * }
   */
  async settlePayment(_paymentId: string, _conditionsHash: string): Promise<string> {
    throw new Error(
      'e-Rupee adapter not yet configured. ' +
      'Add RBI sandbox credentials to proceed. ' +
      'See docs/rbi-sandbox-notes.md for setup instructions.'
    );
  }

  async getPaymentAuth(_paymentId: string): Promise<PaymentAuthOnChain | null> {
    throw new Error('e-Rupee adapter: getPaymentAuth not implemented. Awaiting RBI sandbox API schema.');
  }

  async authorizePayment(_params: AuthorizeParams): Promise<string> {
    throw new Error('e-Rupee adapter: authorizePayment not implemented. Awaiting RBI sandbox API schema.');
  }
}
