/**
 * USDC Settlement Adapter — Phase 1
 *
 * 🧒 ELI5: This is the "cash register for dollars (USDC)."
 *   It talks to the PBMWrapper smart contract on Base blockchain.
 *   When the facilitator says "settle this payment," this adapter:
 *   1. Connects to the blockchain (like dialing a phone)
 *   2. Calls the smart contract function (like pressing a button)
 *   3. Waits for confirmation (like waiting for the receipt to print)
 *   4. Returns the transaction hash (the receipt number)
 *
 * Uses `viem` — a lightweight Ethereum library (lighter than ethers.js).
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Address,
  type Hex,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import type { SettlementAdapter, PaymentAuthOnChain, AuthorizeParams } from '../types/index.js';
import { PBM_WRAPPER_ABI } from '../types/abi.js';

export class USDCAdapter implements SettlementAdapter {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: Account;
  private pbmWrapperAddress: Address;
  private chain: Chain;

  /**
   * @param config.rpcUrl — Blockchain endpoint URL (like a phone number for the blockchain)
   * @param config.privateKey — Facilitator's private key (like a password to sign transactions)
   * @param config.pbmWrapperAddress — Address of our deployed PBMWrapper contract
   * @param config.chain — Which blockchain to use (Base Sepolia for testing)
   */
  constructor(config: {
    rpcUrl: string;
    privateKey: Hex;
    pbmWrapperAddress: Address;
    chain?: Chain;
  }) {
    this.chain = config.chain || baseSepolia;
    this.pbmWrapperAddress = config.pbmWrapperAddress;

    // Public client: for READING blockchain data (free, no gas)
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    // Wallet client: for WRITING to blockchain (costs gas, needs private key)
    this.account = privateKeyToAccount(config.privateKey);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * Settle a payment on-chain.
   *
   * 🧒 ELI5: "Tell the smart contract: open the lockbox and give money to the node."
   *
   * What happens under the hood:
   * 1. walletClient.writeContract() → creates a transaction
   * 2. Transaction sent to Base Sepolia network
   * 3. Miners/validators process it
   * 4. PBMWrapper.settlePayment() executes on-chain
   * 5. Collateral transferred from contract to node
   * 6. We get back a transaction hash (proof it happened)
   */
  async settlePayment(paymentId: string, conditionsHash: string): Promise<string> {
    const txHash = await this.walletClient.writeContract({
      account: this.account,
      chain: this.chain,
      address: this.pbmWrapperAddress,
      abi: PBM_WRAPPER_ABI,
      functionName: 'settlePayment',
      args: [paymentId as Hex, conditionsHash as Hex],
    });

    // Wait for transaction to be included in a block (confirmed)
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === 'reverted') {
      throw new Error(`Settlement transaction reverted: ${txHash}`);
    }

    return txHash;
  }

  /**
   * Read payment authorization from the blockchain.
   *
   * 🧒 ELI5: "Look inside the lockbox to see who put money in and the rules."
   * This is FREE — reading doesn't cost gas.
   */
  async getPaymentAuth(paymentId: string): Promise<PaymentAuthOnChain | null> {
    try {
      console.log(`[USDCAdapter] Reading getPaymentAuth for ${paymentId}`);
      console.log(`[USDCAdapter] Contract: ${this.pbmWrapperAddress}`);

      const result = await this.publicClient.readContract({
        address: this.pbmWrapperAddress,
        abi: PBM_WRAPPER_ABI,
        functionName: 'getPaymentAuth',
        args: [paymentId as Hex],
      });

      console.log('[USDCAdapter] Raw result:', JSON.stringify(result, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      ));

      // viem may return the struct as a named object OR a positional array (tuple)
      // Handle both cases
      let payer: string;
      let nodeAddress: string;
      let amount: bigint;
      let conditionsHash: string;
      let expiresAt: bigint;
      let settled: boolean;

      if (Array.isArray(result)) {
        // Tuple format: [payer, nodeAddress, amount, conditionsHash, expiresAt, settled]
        [payer, nodeAddress, amount, conditionsHash, expiresAt, settled] = result as [string, string, bigint, string, bigint, boolean];
      } else if (result && typeof result === 'object') {
        // Named object format
        const auth = result as {
          payer: string;
          nodeAddress: string;
          amount: bigint;
          conditionsHash: string;
          expiresAt: bigint;
          settled: boolean;
        };
        ({ payer, nodeAddress, amount, conditionsHash, expiresAt, settled } = auth);
      } else {
        console.error('[USDCAdapter] Unexpected result type:', typeof result);
        return null;
      }

      // If payer is zero address, authorization doesn't exist
      const zeroAddr = '0x0000000000000000000000000000000000000000';
      if (!payer || payer.toLowerCase() === zeroAddr) {
        console.log('[USDCAdapter] Payment not found (payer is zero address)');
        return null;
      }

      console.log(`[USDCAdapter] Found payment auth: payer=${payer}, settled=${settled}`);
      return { payer, nodeAddress, amount, conditionsHash, expiresAt, settled };
    } catch (error) {
      console.error('[USDCAdapter] getPaymentAuth error:', error);
      return null;
    }
  }

  /**
   * Create a payment authorization on-chain (used for testing).
   *
   * 🧒 ELI5: "Put money in the lockbox with rules attached."
   * In production, the PAYER calls this directly. The facilitator doesn't
   * normally authorize — it only SETTLES. But for testing, it's handy.
   */
  async authorizePayment(params: AuthorizeParams): Promise<string> {
    const txHash = await this.walletClient.writeContract({
      account: this.account,
      chain: this.chain,
      address: this.pbmWrapperAddress,
      abi: PBM_WRAPPER_ABI,
      functionName: 'authorizePayment',
      args: [
        params.paymentId as Hex,
        params.nodeAddress as Address,
        BigInt(params.amount),
        params.conditionsHash as Hex,
        BigInt(params.expiresAt),
      ],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === 'reverted') {
      throw new Error(`Authorization transaction reverted: ${txHash}`);
    }

    return txHash;
  }
}
