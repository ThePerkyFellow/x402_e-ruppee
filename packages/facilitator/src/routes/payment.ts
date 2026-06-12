/**
 * Payment Route — POST /facilitate
 *
 * 🧒 ELI5: This is the "front desk" of the facilitator.
 *   When a robot comes in and says "I want to pay for something,"
 *   the front desk:
 *   1. Checks their ID (signature verification)
 *   2. Checks the payment exists in the lockbox (on-chain check)
 *   3. Checks the conditions match (hash comparison)
 *   4. Opens the lockbox (settlement)
 *   5. Gives them a receipt (JWT)
 *
 * This is the HEART of the x402 system — the most important endpoint.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { PBMService } from '../services/pbm.service.js';
import type { ReceiptService } from '../services/receipt.service.js';
import type { FacilitatorConfig } from '../types/index.js';

/**
 * Zod schema for request validation.
 *
 * 🧒 ELI5: Before the front desk does anything, it checks the form.
 *   Missing fields? Wrong types? Zod catches it immediately.
 *   Like a bouncer checking your ticket before you enter.
 */
const facilitateSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID required'),
  nodeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.string().min(1, 'Amount required'),
  conditionsHash: z.string().min(1, 'Conditions hash required'),
  payerSignature: z.string().min(1, 'Payer signature required'),
  expiresAt: z.number().positive('Expiry must be positive'),
  useCase: z.enum(['media', 'compute']),
  metadata: z.object({
    contentHash: z.string().optional(),
    taskId: z.string().optional(),
  }),
});

export function createPaymentRoute(
  pbmService: PBMService,
  receiptService: ReceiptService,
  config: FacilitatorConfig
): Hono {
  const app = new Hono();

  /**
   * POST /facilitate — Main payment facilitation endpoint
   *
   * Flow:
   * 1. Validate input (Zod)
   * 2. Verify payer signature (EIP-712)
   * 3. Check on-chain authorization exists + not expired/settled
   * 4. Verify conditions hash matches
   * 5. Settle payment on-chain (PBMWrapper.settlePayment)
   * 6. Generate JWT receipt
   * 7. Return receipt + txHash
   */
  app.post('/facilitate', async (c) => {
    // Step 1: Validate input
    const parseResult = facilitateSchema.safeParse(await c.req.json());
    if (!parseResult.success) {
      return c.json({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      }, 400);
    }

    const body = parseResult.data;

    try {
      // Step 2: Verify payer signature
      const isValidSignature = await pbmService.verifyPayerSignature(body);
      if (!isValidSignature) {
        return c.json({ error: 'Invalid payer signature' }, 401);
      }

      // Step 3: Check payment authorization exists on-chain
      const auth = await pbmService.getPaymentAuth(body.paymentId);
      if (!auth) {
        return c.json({ error: 'Payment authorization not found on-chain' }, 404);
      }
      if (auth.settled) {
        return c.json({ error: 'Payment already settled' }, 409); // 409 Conflict
      }

      // Step 4: Verify conditions hash
      // The hash sent by the client must match what's stored on-chain
      if (auth.conditionsHash !== body.conditionsHash) {
        return c.json({ error: 'Conditions hash mismatch' }, 400);
      }

      // Step 5: Settle payment on-chain
      const txHash = await pbmService.settlePayment(body.paymentId, body.conditionsHash);

      // Step 6: Generate JWT receipt
      const receipt = await receiptService.generate({
        paymentId: body.paymentId,
        txHash,
        nodeAddress: body.nodeAddress,
        amount: body.amount,
        settledAt: Date.now(),
        facilitator: config.pbmWrapperAddress,
        chainId: config.chainId,
      });

      // Step 7: Return success
      return c.json({ receipt, txHash }, 200);

    } catch (error) {
      console.error('[Payment] Facilitation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';

      // If settlement reverted, re-check if payment was already settled
      // (RPC propagation lag can cause settled=false read → revert on settle)
      if (message.includes('revert') || message.includes('Reverted')) {
        try {
          const recheck = await pbmService.getPaymentAuth(body.paymentId);
          if (recheck?.settled) {
            return c.json({ error: 'Payment already settled' }, 409);
          }
        } catch { /* fall through to generic error */ }
      }

      return c.json({ error: 'Settlement failed', details: message }, 500);
    }
  });

  return app;
}
