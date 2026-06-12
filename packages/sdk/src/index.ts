/**
 * x402-rupee SDK — Main Entry Point
 *
 * Re-exports everything for convenient imports:
 *   import { X402Client, requirePayment } from '@x402-rupee/sdk';
 */

export { X402Client } from './client.js';
export { requirePayment, honoRequirePayment } from './server.js';
export type {
  PaymentRequired,
  PaymentConfig,
  VerifiedReceipt,
  ClientConfig,
} from './types.js';
