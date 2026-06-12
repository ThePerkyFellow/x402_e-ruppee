/**
 * PBM Wrapper ABI — Minimal ABI for facilitator interactions
 *
 * 🧒 ELI5: ABI = "instruction manual" for talking to the smart contract.
 *   The blockchain doesn't know function names. It knows numbers and binary.
 *   The ABI translates: "settlePayment" → the exact binary the blockchain expects.
 *   Think of it like a phrasebook when visiting a foreign country.
 *
 * We only include the functions the facilitator ACTUALLY calls,
 * not the entire contract ABI. Keeps things minimal.
 */
export const PBM_WRAPPER_ABI = [
  // ─── Write Functions (change blockchain state) ─────────────────────────
  {
    name: 'settlePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentId', type: 'bytes32' },
      { name: 'conditionsHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'authorizePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentId', type: 'bytes32' },
      { name: 'nodeAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'conditionsHash', type: 'bytes32' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
  },

  // ─── Read Functions (don't change state, free to call) ─────────────────
  {
    name: 'paymentAuths',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [
      { name: 'payer', type: 'address' },
      { name: 'nodeAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'conditionsHash', type: 'bytes32' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'settled', type: 'bool' },
    ],
  },
  {
    name: 'getPaymentAuth',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'payer', type: 'address' },
          { name: 'nodeAddress', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'conditionsHash', type: 'bytes32' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'settled', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'verifyPayment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [
      { name: 'isValid', type: 'bool' },
      { name: 'nodeAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  {
    name: 'registeredNodes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'authorizedFacilitators',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ─── Events (for listening to what happens on-chain) ───────────────────
  {
    name: 'PaymentSettled',
    type: 'event',
    inputs: [
      { name: 'paymentId', type: 'bytes32', indexed: true },
      { name: 'node', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PaymentAuthorized',
    type: 'event',
    inputs: [
      { name: 'paymentId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'node', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint256', indexed: false },
    ],
  },
] as const;
