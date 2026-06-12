/**
 * x402-rupee Server SDK — requirePayment Middleware
 *
 * 🧒 ELI5: Imagine you're a lemonade seller.
 *   Instead of writing "check for money" code in EVERY sell function,
 *   you put a bouncer at the door who checks ONCE:
 *   - No money? → "Please pay first" (HTTP 402)
 *   - Has valid receipt? → "Come in!" (next())
 *   - Fake receipt? → "Nice try!" (HTTP 402 again)
 *
 * Usage:
 *   import { requirePayment } from '@x402-rupee/sdk/server';
 *
 *   // Express/Hono:
 *   app.get('/api/data', requirePayment({ amount: 100, currency: 'eINR' }), handler);
 *
 *   // That's it! The endpoint now requires payment.
 *   // First request → 402 with payment details
 *   // Request with valid X-PAYMENT header → passes through to handler
 */

import type { PaymentConfig, PaymentRequired, VerifiedReceipt } from './types.js';

/**
 * Verify a receipt with the facilitator server.
 *
 * @param facilitatorUrl — Base URL of the facilitator
 * @param receiptToken — JWT receipt string
 */
async function verifyReceipt(
  facilitatorUrl: string,
  receiptToken: string
): Promise<VerifiedReceipt> {
  try {
    const response = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt: receiptToken }),
    });

    return await response.json() as VerifiedReceipt;
  } catch {
    return { valid: false, error: 'Failed to reach facilitator for verification' };
  }
}

/**
 * Create a payment-required middleware.
 *
 * Works with Express, Hono, or any framework that uses (req, res, next) pattern.
 * For Hono, you'd wrap this in a Hono-style middleware.
 *
 * @param config — Payment requirements (amount, currency, description)
 */
export function requirePayment(config: PaymentConfig) {
  const facilitatorUrl = process.env.FACILITATOR_URL || 'http://localhost:3001';
  const nodeAddress = process.env.NODE_WALLET_ADDRESS || '';

  /**
   * The middleware function.
   *
   * Flow:
   * 1. Check for X-PAYMENT header
   * 2. No header? → Return 402 with payment requirements
   * 3. Has header? → Verify the receipt with facilitator
   * 4. Valid? → Call next() (serve the resource)
   * 5. Invalid? → Return 402 again
   */
  return async (req: Request): Promise<Response | null> => {
    const paymentHeader = req.headers.get('x-payment');

    // No payment header → tell client how to pay
    if (!paymentHeader) {
      const paymentRequired: PaymentRequired = {
        error: 'Payment Required',
        amount: config.amount,
        currency: config.currency,
        facilitator: facilitatorUrl,
        description: config.description,
        nodeAddress,
      };

      return new Response(JSON.stringify(paymentRequired), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Has payment header → verify the receipt
    const result = await verifyReceipt(facilitatorUrl, paymentHeader);

    if (!result.valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired payment receipt',
          details: result.error,
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Payment verified! Return null to signal "proceed"
    return null;
  };
}

/**
 * Hono-compatible middleware wrapper.
 *
 * Usage with Hono:
 *   import { honoRequirePayment } from '@x402-rupee/sdk/server';
 *   app.get('/api/data', honoRequirePayment({ amount: 100, currency: 'eINR' }), handler);
 */
export function honoRequirePayment(config: PaymentConfig) {
  const check = requirePayment(config);

  return async (c: any, next: () => Promise<void>) => {
    const result = await check(c.req.raw);
    if (result) {
      // Payment required or invalid — return the 402 response
      return new Response(result.body, {
        status: result.status,
        headers: result.headers,
      });
    }
    // Payment valid — proceed to handler
    await next();
  };
}
