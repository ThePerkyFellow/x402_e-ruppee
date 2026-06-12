/**
 * x402-rupee SDK — Shared Types
 *
 * 🧒 ELI5: These are the "forms" that both the sender and receiver use.
 *   Like a universal order form that any restaurant can read.
 *   By sharing types, we make sure everyone speaks the same language.
 */

/** What the server sends back in a 402 response */
export interface PaymentRequired {
  error: 'Payment Required';
  amount: number;           // In smallest denomination (paise for INR)
  currency: 'USDC' | 'eINR';
  facilitator: string;      // URL of the facilitator server
  description?: string;     // Human-readable description of what you're paying for
  nodeAddress: string;      // Wallet address of the node to pay
}

/** Configuration for the requirePayment middleware */
export interface PaymentConfig {
  amount: number;           // Price in smallest denomination
  currency: 'USDC' | 'eINR';
  description?: string;
}

/** A verified payment receipt */
export interface VerifiedReceipt {
  valid: boolean;
  receipt?: {
    paymentId: string;
    txHash: string;
    nodeAddress: string;
    amount: string;
    settledAt: number;
    facilitator: string;
    chainId: number;
  };
  error?: string;
}

/** Client configuration */
export interface ClientConfig {
  facilitatorUrl: string;   // Base URL of the facilitator server
  walletPrivateKey?: string; // For automatic payment signing
}
