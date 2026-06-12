/**
 * x402-rupee Client SDK — For Payers (AI agents, apps, browsers)
 *
 * 🧒 ELI5: Imagine you're a robot ordering lemonade.
 *   1. You ask for lemonade → "Please pay first!" (402 response)
 *   2. You read the price tag (402 body)
 *   3. You put money in the lockbox (authorize payment)
 *   4. You ask the facilitator to settle (POST /facilitate)
 *   5. You get a receipt
 *   6. You ask for lemonade again, showing the receipt → "Here you go!" 🍋
 *
 * This SDK automates steps 2-6 so developers don't have to.
 *
 * Usage:
 *   import { X402Client } from '@x402-rupee/sdk/client';
 *
 *   const client = new X402Client({ facilitatorUrl: 'http://localhost:3001' });
 *   const response = await client.payAndFetch('http://api.example.com/data');
 */

import type { ClientConfig, PaymentRequired } from './types.js';

export class X402Client {
  private facilitatorUrl: string;

  constructor(config: ClientConfig) {
    this.facilitatorUrl = config.facilitatorUrl;
  }

  /**
   * Fetch a URL, automatically handling 402 payment flows.
   *
   * 🧒 ELI5:
   *   1. Try to get the resource
   *   2. If server says "pay me!" (402), handle payment automatically
   *   3. Retry the request with the receipt
   *   4. Return the actual resource
   *
   * @param url — The URL to fetch
   * @param init — Standard fetch options (headers, method, body, etc.)
   * @param paymentCallback — Called when payment is needed. You implement the actual
   *                          blockchain authorization + facilitation here.
   */
  async payAndFetch(
    url: string,
    init?: RequestInit,
    paymentCallback?: (requirements: PaymentRequired) => Promise<string | null>
  ): Promise<Response> {
    // Step 1: Try the request
    const firstResponse = await fetch(url, init);

    // If not 402, just return the response (no payment needed)
    if (firstResponse.status !== 402) {
      return firstResponse;
    }

    // Step 2: Parse payment requirements from 402 response
    const requirements = await firstResponse.json() as PaymentRequired;

    if (!paymentCallback) {
      throw new Error(
        'Server requires payment but no paymentCallback provided. ' +
        `Amount: ${requirements.amount} ${requirements.currency}. ` +
        `Facilitator: ${requirements.facilitator}`
      );
    }

    // Step 3: Let the caller handle payment (authorize on-chain + facilitate)
    // The callback returns the receipt JWT or null if payment failed
    const receipt = await paymentCallback(requirements);

    if (!receipt) {
      throw new Error('Payment callback returned null — payment failed or was cancelled');
    }

    // Step 4: Retry the original request with the payment receipt
    const retryHeaders = new Headers(init?.headers || {});
    retryHeaders.set('X-PAYMENT', receipt);

    return fetch(url, {
      ...init,
      headers: retryHeaders,
    });
  }

  /**
   * Verify a receipt with the facilitator.
   *
   * 🧒 ELI5: "Is this receipt real?" Ask the facilitator to check.
   */
  async verifyReceipt(receiptToken: string): Promise<boolean> {
    const response = await fetch(`${this.facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt: receiptToken }),
    });

    if (!response.ok) return false;
    const result = await response.json() as { valid: boolean };
    return result.valid;
  }

  /**
   * Check facilitator server health.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.facilitatorUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
