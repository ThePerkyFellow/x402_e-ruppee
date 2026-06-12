/**
 * x402 PBM Conditions & Shared Types
 *
 * 🧒 ELI5: These are the "forms" everyone fills out.
 *   When robot A wants to pay robot B, they fill out a form with:
 *   - WHO gets paid (nodeAddress)
 *   - HOW MUCH (amount)
 *   - FOR WHAT (contentHash or taskId)
 *   - WHEN it expires (expiresAt)
 *
 *   Everyone uses the SAME form, so there's no confusion.
 *   TypeScript types = form templates that catch mistakes before they happen.
 */

// ─── Payment Conditions ──────────────────────────────────────────────────────
// These mirror the x402 conditions from the implementation plan

export interface X402PBMConditions {
  // Payment target
  contentHash?: string;        // keccak256 of content chunk (media use case)
  taskId?: string;             // UUID of compute task (compute use case)
  nodeAddress: string;         // Ethereum address of registered node

  // Temporal
  expiresAt: number;           // Unix timestamp — payment auth must be used within N seconds
  issuedAt: number;            // For replay attack prevention

  // Amount
  amount: string;              // String to avoid JS bigint precision issues (in smallest unit)
  currency: 'USDC' | 'eINR';  // Phase 1 vs Phase 2

  // Facilitator
  facilitatorAddress: string;  // Facilitator's Ethereum address
  chainId: number;             // Base Testnet: 84532 / Base Mainnet: 8453
}

// ─── Payment Request ─────────────────────────────────────────────────────────
// What the client sends to POST /facilitate

export interface FacilitateRequest {
  paymentId: string;
  nodeAddress: string;
  amount: string;              // In smallest denomination
  conditionsHash: string;      // keccak256 of the conditions
  payerSignature: string;      // EIP-712 signature from payer wallet
  expiresAt: number;
  useCase: 'media' | 'compute';
  metadata: {
    contentHash?: string;      // For media
    taskId?: string;           // For compute
  };
}

// ─── Payment Receipt ─────────────────────────────────────────────────────────
// What the facilitator returns after successful settlement
// This is a JWT that the node verifies before serving resources

export interface PaymentReceipt {
  paymentId: string;
  txHash: string;              // Blockchain transaction hash
  nodeAddress: string;
  amount: string;
  settledAt: number;           // Unix timestamp
  facilitator: string;         // Facilitator address (for verification)
  chainId: number;
}

// ─── On-Chain Payment Authorization ──────────────────────────────────────────
// Maps to the PBMWrapper.PaymentAuthorization struct

export interface PaymentAuthOnChain {
  payer: string;
  nodeAddress: string;
  amount: bigint;
  conditionsHash: string;
  expiresAt: bigint;
  settled: boolean;
}

// ─── Settlement Adapter Interface ────────────────────────────────────────────
// Different adapters for different settlement rails (USDC vs e-Rupee)
// 🧒 ELI5: Like having different cash registers for dollars vs rupees.
//   Same buttons, different drawers.

export interface SettlementAdapter {
  /** Settle payment on-chain. Returns transaction hash. */
  settlePayment(paymentId: string, conditionsHash: string): Promise<string>;

  /** Check if payment authorization exists on-chain */
  getPaymentAuth(paymentId: string): Promise<PaymentAuthOnChain | null>;

  /** Create payment authorization on-chain (for testing/direct use) */
  authorizePayment(params: AuthorizeParams): Promise<string>;
}

export interface AuthorizeParams {
  paymentId: string;
  nodeAddress: string;
  amount: string;
  conditionsHash: string;
  expiresAt: number;
}

// ─── Server Config ───────────────────────────────────────────────────────────

export interface FacilitatorConfig {
  port: number;
  chainId: number;
  pbmWrapperAddress: string;
  collateralTokenAddress: string;
  facilitatorPrivateKey: string;
  jwtSecret: string;
  settlementRail: 'USDC' | 'eINR';
  rpcUrl: string;
}
