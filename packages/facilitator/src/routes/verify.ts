/**
 * Verify Route — GET /verify/:receipt_id
 *
 * 🧒 ELI5: After getting a receipt, anyone can come here and ask:
 *   "Is this receipt real?" The facilitator checks its records and says yes or no.
 *   This is how nodes confirm payment BEFORE serving resources.
 */

import { Hono } from 'hono';
import type { ReceiptService } from '../services/receipt.service.js';

export function createVerifyRoute(receiptService: ReceiptService): Hono {
  const app = new Hono();

  /**
   * POST /verify — Verify a payment receipt JWT
   *
   * Why POST not GET? Because the JWT token can be very long (500+ chars),
   * too long for a URL parameter. POST lets us send it in the body.
   */
  app.post('/verify', async (c) => {
    const body = await c.req.json();
    const { receipt: token } = body;

    if (!token || typeof token !== 'string') {
      return c.json({ error: 'Receipt token required' }, 400);
    }

    const receipt = await receiptService.verify(token);

    if (!receipt) {
      return c.json({ valid: false, error: 'Invalid or expired receipt' }, 401);
    }

    return c.json({
      valid: true,
      receipt,
    }, 200);
  });

  return app;
}
