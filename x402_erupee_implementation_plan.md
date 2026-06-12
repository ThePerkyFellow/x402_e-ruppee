# x402 × e-Rupee Implementation Plan
## Work Order: Programmable Rupee Infrastructure for the Agentic Economy

**Version:** 1.0  
**Status:** Pre-build  
**Owner:** ThePerkyFellow  
**Stack:** TypeScript / Node.js / Solidity / Next.js  
**Settlement Target (Phase 1):** USDC on Base Testnet  
**Settlement Target (Phase 2):** e-Rupee via RBI CBDC Sandbox  

---

## 0. How to Use This Document

This is a living work order. Feed it to your IDE (Cursor, VS Code + Copilot, or Claude Code) as context at the start of every session. Each phase contains **Tasks** (what to build), **Study Items** (what to read/reverse-engineer first), and **Acceptance Criteria** (how you know it's done).

Do not skip Study Items. The PBM architecture from Singapore is your technical blueprint — understanding it deeply before writing code is the difference between building on solid foundations and rebuilding everything twice.

```
Recommended IDE prompt prefix:
"I am building an x402 payment facilitator adapted for India's e-Rupee CBDC.
The architecture is based on Singapore's PBM (Purpose Bound Money) system.
My implementation plan is in x402_erupee_implementation_plan.md.
Current phase: [insert phase]. Current task: [insert task number]."
```

---

## 1. Project Overview

### What We Are Building

A **programmable rupee payment facilitator** that bridges the x402 HTTP payment protocol with India's e-Rupee CBDC — enabling autonomous machine-to-machine payments without human intervention on every transaction.

Two production use cases will run on top of this infrastructure:
1. **NammaPay Media** — A torrent-based media distribution network where seeders earn micropayments per chunk served
2. **NammaCompute** — A distributed compute marketplace where idle consumer GPUs earn per task completed

### The Core Architectural Insight (from Singapore's PBM)

Singapore's Project Orchid proved that programmable money does not require rebuilding the currency. It requires a **wrapper layer** — a smart contract that sits between the payer and the money, enforcing conditions before releasing funds. The money itself (SGD, Rupee, Dollar) remains unchanged.

```
┌─────────────────────────────────────────────────────────┐
│                    PBM ARCHITECTURE                      │
│                                                          │
│  ┌──────────┐    ┌─────────────────┐    ┌────────────┐  │
│  │  PAYER   │───▶│   PBM WRAPPER   │───▶│ COLLATERAL │  │
│  │(Machine/ │    │ (Smart Contract)│    │  (e-Rupee/ │  │
│  │ Human)   │    │                 │    │   USDC)    │  │
│  └──────────┘    │ Conditions:     │    └────────────┘  │
│                  │ • Validity date │                     │
│                  │ • Merchant list │                     │
│                  │ • Amount caps   │                     │
│                  │ • Task hash     │                     │
│                  └─────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### How x402 Connects

x402 operates at the HTTP layer. When a server needs payment, it returns an HTTP 402 response. The client (machine/agent) reads the payment requirements, authorizes payment, and retries the request. Your facilitator is the entity that:
- Receives the x402 payment authorization from the client
- Validates and executes the PBM wrapper logic
- Settles in e-Rupee (Phase 2) or USDC (Phase 1)
- Returns proof-of-payment to the server

```
Full Request Flow:

[AI Agent / Browser / App]
         │
         │ 1. GET /stream/video-chunk-42
         ▼
[Content/Compute Node] ──▶ HTTP 402 Response
         │                  {amount: "₹0.002",
         │                   facilitator: "your-endpoint",
         │                   conditions: {...}}
         │
         │ 2. Agent reads 402, calls facilitator
         ▼
[YOUR FACILITATOR] ◀─────────────────────────────┐
         │                                         │
         │ 3. Validates PBM conditions             │
         │ 4. Executes wrapper smart contract      │
         │ 5. Settles to node wallet               │
         │                                         │
         │ 6. Returns payment_receipt (JWT)        │
         ▼                                         │
[Content/Compute Node]                             │
         │                                         │
         │ 7. Verifies receipt, serves resource    │
         ▼                                         │
[AI Agent / Browser / App] ──────────────────────▶┘
         │
         ▼
    Resource delivered.
    No human touched anything.
```

---

## 2. Reference Material — Study Before Building

### 2.1 Singapore PBM — Primary Source Code

**Repository to study:**
```
https://github.com/orgs/opengovsg/repositories
```
Search for PBM-related repositories. Look for:
- Smart contract implementations (Solidity)
- The wrapper/collateral separation pattern
- How conditions are encoded in the contract
- The minting and burning flow

**OGP Engineering Blog — Required Reading (in order):**
```
1. https://opengovsg.substack.com/p/reimagining-government-payouts-with-programmable-money-p2-ba7a2ab35188
   → Read this first. OGP engineers explain exactly how they built the DSGD trial.
   → Key sections: "Core Decisions", "Smart Contracts", "Parties and Accounts"

2. https://www.mas.gov.sg/-/media/mas-media-library/development/fintech/project-orchid/orchid-blueprint-final.pdf
   → The MAS Orchid Blueprint. Pages 1–40 are architecture.
   → Key sections: "Forms of Digital Money", "PBM Wrapper", "Settlement Ledger", "Policy Wrappers"

3. https://www.mas.gov.sg/schemes-and-initiatives/project-orchid
   → MAS Project Orchid overview. Phase 1 and Phase 2 reports are linked here.
```

**x402 Protocol Spec:**
```
https://www.x402.org/
https://github.com/coinbase/x402
```
Read the full spec. Key concepts to understand:
- The `X-PAYMENT` request header format
- The `402 Payment Required` response body schema
- The facilitator role and how it verifies payment
- The `payment_receipt` structure

### 2.2 PBM Architecture — Four Components to Internalize

From the MAS Orchid Blueprint, PBM has exactly four components. Map each one to your system before writing a single line of code.

| PBM Component | Singapore Implementation | Your Implementation |
|---|---|---|
| **Digital Currency (Collateral)** | DSGD — ERC-20, minted by DBS | Phase 1: USDC on Base Testnet / Phase 2: e-Rupee token |
| **PBM Wrapper** | ERC-1155 semi-fungible token smart contract | Your smart contract with x402 conditions |
| **PBM Wallet** | User/merchant wallet holding PBM tokens | Node wallet (seeder/compute provider) |
| **Ledger Infrastructure** | Ethereum-compatible blockchain | Phase 1: Base (L2) / Phase 2: RBI CBDC ledger |

### 2.3 Key Architectural Decision: Programmable Payment vs Programmable Money

This distinction determines your entire regulatory strategy.

- **Programmable Money** = logic is baked INTO the token. The rupee itself has rules. RBI controls this.
- **Programmable Payment** = logic sits OUTSIDE the token, in your smart contract. The rupee is just rupee. You build the conditions layer.

**You are building Programmable Payment, not Programmable Money.**

This is identical to what the ECB decided for the digital euro. The currency is untouched. Your wrapper enforces conditions. This is the correct regulatory position — you are not issuing money, you are building payment logic infrastructure.

---

## 3. Tech Stack

```
Layer               Technology              Reason
─────────────────────────────────────────────────────────────
Smart Contracts     Solidity 0.8.x          PBM wrapper, ERC-20 collateral
Contract Testing    Hardhat + Chai           Industry standard, x402 team uses it
Blockchain (P1)     Base Testnet (L2)        Low fees, Coinbase-native, x402's home chain
Blockchain (P2)     RBI CBDC Ledger          via CAT Sandbox API when available
Facilitator API     Node.js + TypeScript     x402 reference implementation is TypeScript
API Framework       Hono (not Express)       Lightweight, edge-compatible, typed
Database            PostgreSQL + Prisma      Transaction ledger, node registry
Queue               BullMQ + Redis           Async task dispatch (compute marketplace)
Frontend            Next.js 14 App Router    Dashboard for nodes and creators
Auth                Privy                    Handles both wallet + email auth, India-friendly
Testing             Vitest + Supertest       Unit + integration tests
Deployment          Railway or Fly.io        Simple, no AWS complexity to start
Monitoring          OpenTelemetry + Grafana  Payment flows must be observable
```

---

## 4. Repository Structure

Set up this monorepo before writing any feature code:

```
x402-rupee/
├── packages/
│   ├── contracts/              # Solidity smart contracts
│   │   ├── src/
│   │   │   ├── PBMWrapper.sol          # Core wrapper contract
│   │   │   ├── eRupeeCollateral.sol    # Collateral token (USDC Phase 1 / e-Rupee Phase 2)
│   │   │   ├── NodeRegistry.sol        # Registered compute/media nodes
│   │   │   └── interfaces/
│   │   │       ├── IPBM.sol
│   │   │       └── Ix402Facilitator.sol
│   │   ├── test/
│   │   └── hardhat.config.ts
│   │
│   ├── facilitator/            # Core x402 facilitator server
│   │   ├── src/
│   │   │   ├── index.ts                # Hono app entry
│   │   │   ├── routes/
│   │   │   │   ├── payment.ts          # POST /facilitate
│   │   │   │   ├── verify.ts           # GET /verify/:receipt_id
│   │   │   │   └── health.ts
│   │   │   ├── services/
│   │   │   │   ├── pbm.service.ts      # PBM wrapper logic
│   │   │   │   ├── settlement.service.ts # USDC/e-Rupee settlement
│   │   │   │   ├── verification.service.ts
│   │   │   │   └── receipt.service.ts
│   │   │   ├── adapters/
│   │   │   │   ├── usdc.adapter.ts     # Phase 1: USDC on Base
│   │   │   │   └── erupee.adapter.ts   # Phase 2: RBI CBDC API
│   │   │   └── middleware/
│   │   │       ├── auth.ts
│   │   │       └── rateLimit.ts
│   │   └── test/
│   │
│   ├── sdk/                    # Open-source SDK for developers
│   │   ├── src/
│   │   │   ├── client.ts           # For payers (agents/apps)
│   │   │   ├── server.ts           # For payees (nodes/APIs)
│   │   │   └── types.ts
│   │   └── examples/
│   │       ├── media-node/
│   │       └── compute-node/
│   │
│   ├── media/                  # NammaPay Media application
│   │   ├── tracker/            # Torrent tracker with x402 hooks
│   │   ├── seeder/             # Node software for seeders
│   │   └── player/             # Web player (Next.js)
│   │
│   └── compute/                # NammaCompute application
│       ├── scheduler/          # Task dispatch and routing
│       ├── worker/             # Node software for compute providers
│       └── dashboard/          # Web dashboard (Next.js)
│
├── docs/
│   ├── architecture.md
│   ├── pbm-analysis.md         # Your notes from studying PBM source
│   └── rbi-sandbox-notes.md
├── .env.example
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 5. Phase 1 — Deconstruct PBM (Weeks 1–2)

**Goal:** Fully understand the Singapore PBM codebase before writing any production code. Create `docs/pbm-analysis.md` as the output.

### Task 1.1 — Clone and Read OGP PBM Repository

```bash
# Find the correct repo at:
# https://github.com/orgs/opengovsg/repositories
# Look for: pbm, purpose-bound-money, orchid, dsgd

git clone https://github.com/opengovsg/[pbm-repo-name]
cd [pbm-repo-name]
```

In your IDE, open the contracts directory. For each smart contract, answer these questions in `docs/pbm-analysis.md`:

- What state variables does it store?
- What are the external-facing functions?
- What events does it emit?
- What are the access control rules (who can call what)?
- What is the mint/burn flow?

### Task 1.2 — Map the DSGD Minting Flow

From the OGP blog post, reconstruct this exact flow in pseudocode:

```
1. Digital Fiat Issuer (DBS) calls DSGD.mint(amount, pbmIssuerAddress)
2. PBM Issuer calls PBMWrapper.wrap(dsgdAmount, conditions{
     validUntil: timestamp,
     allowedMerchants: address[],
     maxTransactionAmount: uint256
   })
3. PBM Wrapper locks DSGD as collateral
4. PBM Wrapper mints PBM token to recipient wallet
5. Recipient uses PBM token at merchant
6. PBM Wrapper validates conditions → releases DSGD to merchant
7. PBM token is burned
```

Write this flow in `docs/pbm-analysis.md`. Then write: **"In my system, step 1 is replaced by [X], step 2 is replaced by [Y]..."**

### Task 1.3 — Identify What Changes for x402

The PBM wrapper conditions in Singapore were:
- Validity period
- Allowed merchant list
- Denomination restrictions

Your x402 conditions will be:
- Content hash (specific file chunk, not just any content)
- Task ID (specific compute job)
- Expiry (payment authorization expires in N seconds, prevents replay attacks)
- Max amount per call
- Node address (only this registered node can claim)

Write a conditions schema in TypeScript before touching Solidity:

```typescript
// packages/contracts/src/types/conditions.ts

interface X402PBMConditions {
  // Payment target
  contentHash?: string;        // keccak256 of content chunk (media use case)
  taskId?: string;             // UUID of compute task (compute use case)
  nodeAddress: string;         // Ethereum address of registered node

  // Temporal
  expiresAt: number;           // Unix timestamp — payment auth must be used within N seconds
  issuedAt: number;            // For replay attack prevention

  // Amount
  amount: bigint;              // In smallest denomination (paise for e-Rupee, wei-equiv for USDC)
  currency: 'USDC' | 'eINR';  // Phase 1 vs Phase 2

  // Facilitator
  facilitatorAddress: string;  // Your facilitator's Ethereum address
  chainId: number;             // Base Testnet: 84532 / Base Mainnet: 8453
}
```

### Task 1.4 — Read the x402 TypeScript Reference Implementation

```bash
git clone https://github.com/coinbase/x402
cd x402
# Read these files in order:
# 1. typescript/packages/x402/src/types/index.ts  — the full type system
# 2. typescript/packages/x402/src/facilitator/     — how a facilitator works
# 3. typescript/packages/x402/src/verify/          — payment verification
# 4. typescript/examples/                           — working examples
```

Document in your notes: what does a valid `X-PAYMENT` header contain? What does a valid `402` response body contain?

**Acceptance Criteria for Phase 1:**
- [ ] `docs/pbm-analysis.md` has the complete DSGD minting flow annotated
- [ ] You can explain the four PBM components from memory
- [ ] `X402PBMConditions` type is defined and makes sense
- [ ] You have read the x402 facilitator source code and can trace a payment through it

---

## 6. Phase 2 — Build the PBM Wrapper Contract (Weeks 3–4)

**Goal:** A working Solidity contract that implements PBM logic with x402 conditions, tested on Base Testnet.

### Task 2.1 — Set Up Hardhat Environment

```bash
cd packages/contracts
pnpm init
pnpm add -D hardhat @nomicfoundation/hardhat-toolbox
pnpm add @openzeppelin/contracts
npx hardhat init
```

Configure `hardhat.config.ts` for Base Testnet:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    baseTestnet: {
      url: "https://sepolia.base.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
      chainId: 84532,
    },
  },
};

export default config;
```

### Task 2.2 — Write the Collateral Token Contract

Phase 1 uses USDC, which already exists. But write a mock for local testing:

```solidity
// packages/contracts/src/MockEINR.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockEINR
 * @notice Mock e-Rupee token for Phase 1 testing.
 *         In Phase 2, this is replaced by the RBI's actual e-Rupee token contract.
 *         Architecture note: This contract is intentionally minimal.
 *         The programmable logic lives in PBMWrapper, not here.
 *         The e-Rupee token should be a pure ERC-20 — just money, no conditions.
 */
contract MockEINR is ERC20, Ownable {
    uint8 private _decimals;

    constructor(uint8 decimals_) ERC20("Mock e-Rupee", "eINR") Ownable(msg.sender) {
        _decimals = decimals_; // Use 2 for paise (100 paise = 1 rupee)
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // Only authorized minters (simulating RBI bank partners) can mint
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

### Task 2.3 — Write the PBM Wrapper Contract

This is the core contract. Study the OGP implementation first, then write yours.

```solidity
// packages/contracts/src/PBMWrapper.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PBMWrapper
 * @notice Implements Purpose Bound Money logic for x402 micropayments.
 *
 * Architecture (adapted from MAS Project Orchid):
 * - Collateral: eINR/USDC locked in this contract
 * - Wrapper: This contract, encoding x402 payment conditions
 * - Settlement: Triggered by x402 facilitator after verifying payment proof
 *
 * Key difference from Singapore PBM:
 * - Singapore PBM: wraps money for vouchers (human consumer use case)
 * - This PBM: wraps money for API micropayments (machine-to-machine use case)
 * - Conditions are based on content hashes and task IDs, not merchant lists
 */
contract PBMWrapper is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20 public immutable collateralToken; // eINR or USDC

    // Registered nodes (seeders / compute providers)
    mapping(address => bool) public registeredNodes;

    // Authorized facilitators (your facilitator server's address)
    mapping(address => bool) public authorizedFacilitators;

    // Payment authorizations: paymentId => PaymentAuth
    mapping(bytes32 => PaymentAuthorization) public paymentAuths;

    // Used payment IDs to prevent replay attacks
    mapping(bytes32 => bool) public usedPaymentIds;

    // ─── Types ────────────────────────────────────────────────────────────────

    struct PaymentAuthorization {
        address payer;
        address nodeAddress;
        uint256 amount;
        bytes32 conditionsHash; // keccak256 of the full conditions struct
        uint256 expiresAt;
        bool settled;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event PaymentAuthorized(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed node,
        uint256 amount,
        uint256 expiresAt
    );

    event PaymentSettled(
        bytes32 indexed paymentId,
        address indexed node,
        uint256 amount
    );

    event PaymentExpired(bytes32 indexed paymentId);

    event NodeRegistered(address indexed node);
    event NodeDeregistered(address indexed node);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _collateralToken) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
    }

    // ─── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Authorize a micropayment. Called by payer (or facilitator on behalf of payer).
     *         Locks collateral in this contract.
     *         This is the "wrap" step from Singapore PBM.
     */
    function authorizePayment(
        bytes32 paymentId,
        address nodeAddress,
        uint256 amount,
        bytes32 conditionsHash,
        uint256 expiresAt
    ) external nonReentrant {
        require(!usedPaymentIds[paymentId], "Payment ID already used");
        require(registeredNodes[nodeAddress], "Node not registered");
        require(expiresAt > block.timestamp, "Expiry must be in future");
        require(amount > 0, "Amount must be positive");

        // Lock collateral from payer
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        paymentAuths[paymentId] = PaymentAuthorization({
            payer: msg.sender,
            nodeAddress: nodeAddress,
            amount: amount,
            conditionsHash: conditionsHash,
            expiresAt: expiresAt,
            settled: false
        });

        emit PaymentAuthorized(paymentId, msg.sender, nodeAddress, amount, expiresAt);
    }

    /**
     * @notice Settle a payment to a node. Called by authorized facilitator after
     *         verifying the node actually served the content or completed the task.
     *         This is the "unwrap + release" step from Singapore PBM.
     */
    function settlePayment(
        bytes32 paymentId,
        bytes32 conditionsHash
    ) external nonReentrant {
        require(authorizedFacilitators[msg.sender], "Not authorized facilitator");

        PaymentAuthorization storage auth = paymentAuths[paymentId];

        require(!auth.settled, "Already settled");
        require(block.timestamp <= auth.expiresAt, "Payment authorization expired");
        require(auth.conditionsHash == conditionsHash, "Conditions hash mismatch");

        auth.settled = true;
        usedPaymentIds[paymentId] = true;

        // Release collateral to node
        collateralToken.safeTransfer(auth.nodeAddress, auth.amount);

        emit PaymentSettled(paymentId, auth.nodeAddress, auth.amount);
    }

    /**
     * @notice Reclaim expired payment authorization. Returns collateral to payer.
     */
    function reclaimExpired(bytes32 paymentId) external nonReentrant {
        PaymentAuthorization storage auth = paymentAuths[paymentId];

        require(auth.payer == msg.sender, "Not payer");
        require(!auth.settled, "Already settled");
        require(block.timestamp > auth.expiresAt, "Not yet expired");

        auth.settled = true;
        usedPaymentIds[paymentId] = true;

        collateralToken.safeTransfer(auth.payer, auth.amount);

        emit PaymentExpired(paymentId);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    function registerNode(address node) external onlyOwner {
        registeredNodes[node] = true;
        emit NodeRegistered(node);
    }

    function deregisterNode(address node) external onlyOwner {
        registeredNodes[node] = false;
        emit NodeDeregistered(node);
    }

    function authorizeFacilitator(address facilitator) external onlyOwner {
        authorizedFacilitators[facilitator] = true;
    }
}
```

### Task 2.4 — Write Contract Tests

```typescript
// packages/contracts/test/PBMWrapper.test.ts
// Test every function. Key scenarios to cover:
// 1. Happy path: authorize → settle → node receives funds
// 2. Replay attack: same paymentId used twice → reverts
// 3. Expired payment: settle after expiry → reverts
// 4. Reclaim: payer reclaims after expiry → funds returned
// 5. Wrong conditions hash: settle with wrong hash → reverts
// 6. Unauthorized facilitator: random address tries to settle → reverts
```

**Acceptance Criteria for Phase 2:**
- [ ] `PBMWrapper.sol` compiles with no warnings
- [ ] All test scenarios pass
- [ ] Contract deployed to Base Testnet
- [ ] Deployment address recorded in `docs/deployments.md`

---

## 7. Phase 3 — Build the x402 Facilitator Server (Weeks 5–7)

**Goal:** A running API server that implements the x402 facilitator spec, using the PBM wrapper contract for settlement.

### Task 3.1 — Set Up Facilitator Package

```bash
cd packages/facilitator
pnpm init
pnpm add hono @hono/node-server
pnpm add viem                    # Ethereum interaction (lighter than ethers.js)
pnpm add @prisma/client prisma
pnpm add bullmq ioredis
pnpm add zod                     # Runtime type validation
pnpm add -D typescript vitest
```

### Task 3.2 — Implement Core Payment Route

The `/facilitate` endpoint is the heart of the system. It receives a payment authorization from an x402 client and triggers PBM settlement.

```typescript
// packages/facilitator/src/routes/payment.ts

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { pbmService } from '../services/pbm.service';
import { receiptService } from '../services/receipt.service';

const paymentSchema = z.object({
  paymentId: z.string(),         // Unique ID for this payment
  nodeAddress: z.string(),       // Which node to pay
  amount: z.string(),            // Amount in paise (string to avoid JS bigint issues)
  conditionsHash: z.string(),    // keccak256 of conditions — must match what was authorized
  payerSignature: z.string(),    // EIP-712 signature from payer's wallet
  expiresAt: z.number(),
  useCase: z.enum(['media', 'compute']),
  metadata: z.object({
    contentHash: z.string().optional(),  // For media use case
    taskId: z.string().optional(),       // For compute use case
  }),
});

export const paymentRoute = new Hono();

paymentRoute.post('/facilitate', zValidator('json', paymentSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    // 1. Verify payer signature (prevent spoofing)
    const isValidSignature = await pbmService.verifyPayerSignature(body);
    if (!isValidSignature) {
      return c.json({ error: 'Invalid payer signature' }, 401);
    }

    // 2. Check payment authorization exists on-chain and is not expired
    const auth = await pbmService.getPaymentAuth(body.paymentId);
    if (!auth || auth.settled) {
      return c.json({ error: 'Payment authorization not found or already settled' }, 404);
    }

    // 3. Verify conditions hash matches
    const computedHash = pbmService.computeConditionsHash(body);
    if (computedHash !== body.conditionsHash) {
      return c.json({ error: 'Conditions hash mismatch' }, 400);
    }

    // 4. Call PBMWrapper.settlePayment() on-chain
    const txHash = await pbmService.settlePayment(body.paymentId, body.conditionsHash);

    // 5. Generate payment receipt (JWT signed by facilitator)
    const receipt = await receiptService.generate({
      paymentId: body.paymentId,
      txHash,
      nodeAddress: body.nodeAddress,
      amount: body.amount,
      settledAt: Date.now(),
    });

    return c.json({ receipt, txHash }, 200);

  } catch (error) {
    console.error('Facilitation error:', error);
    return c.json({ error: 'Settlement failed' }, 500);
  }
});
```

### Task 3.3 — Implement the Settlement Adapters

This is the key abstraction that makes Phase 2 (e-Rupee) a configuration change, not a rewrite.

```typescript
// packages/facilitator/src/adapters/base.adapter.ts

export interface SettlementAdapter {
  settlePayment(paymentId: string, conditionsHash: string): Promise<string>; // returns txHash
  getPaymentAuth(paymentId: string): Promise<PaymentAuthOnChain | null>;
  authorizePayment(params: AuthorizeParams): Promise<string>;
}

// packages/facilitator/src/adapters/usdc.adapter.ts
// Phase 1: Interacts with PBMWrapper.sol on Base Testnet using viem

// packages/facilitator/src/adapters/erupee.adapter.ts
// Phase 2: Stub for now. Will call RBI CBDC Sandbox API when credentials available.
// Structure:
export class ERupeeAdapter implements SettlementAdapter {
  async settlePayment(paymentId: string, conditionsHash: string): Promise<string> {
    // TODO Phase 2: Call RBI CBDC sandbox endpoint
    // POST https://cbdc-sandbox.rbi.org.in/v1/payments/settle
    // {
    //   payment_id: paymentId,
    //   conditions_hash: conditionsHash,
    //   facilitator_token: process.env.RBI_FACILITATOR_TOKEN
    // }
    throw new Error('e-Rupee adapter not yet configured. Add RBI sandbox credentials.');
  }

  async getPaymentAuth(paymentId: string): Promise<PaymentAuthOnChain | null> {
    // TODO Phase 2
    throw new Error('Not implemented');
  }

  async authorizePayment(params: AuthorizeParams): Promise<string> {
    // TODO Phase 2
    throw new Error('Not implemented');
  }
}
```

### Task 3.4 — Build the Open Source SDK

The SDK is what creates adoption. Make it trivially easy to integrate x402 into any Node.js server.

```typescript
// packages/sdk/src/server.ts

/**
 * x402-rupee server SDK
 * Usage:
 *   import { requirePayment } from 'x402-rupee/server';
 *   app.get('/api/data', requirePayment({ amount: 100, currency: 'eINR' }), handler);
 */

export function requirePayment(config: {
  amount: number;      // in paise
  currency: 'USDC' | 'eINR';
  description?: string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      return res.status(402).json({
        error: 'Payment Required',
        amount: config.amount,
        currency: config.currency,
        facilitator: process.env.FACILITATOR_URL,
        description: config.description,
        // Include the node's wallet address so payer knows where to authorize
        nodeAddress: process.env.NODE_WALLET_ADDRESS,
      });
    }

    // Verify the payment receipt with the facilitator
    const isValid = await verifyReceipt(paymentHeader as string);
    if (!isValid) {
      return res.status(402).json({ error: 'Invalid or expired payment receipt' });
    }

    next();
  };
}
```

**Acceptance Criteria for Phase 3:**
- [ ] Facilitator server runs locally
- [ ] Full payment cycle works end-to-end on Base Testnet (authorize → facilitate → settle → receipt)
- [ ] SDK can be installed in a new project and a 402 response is returned correctly
- [ ] Replay attack is blocked (same paymentId returns error)

---

## 8. Phase 4 — NammaPay Media (Weeks 8–10)

**Goal:** A working torrent-based media distribution system where seeders earn micropayments.

### Architecture

```
Content Registration Flow:
Creator uploads content → Torrent magnet link generated → Content hash stored on-chain

Streaming Flow:
Viewer requests chunk → Seeder responds with 402 → Viewer pays via x402 → Chunk delivered

Earnings Flow:
Seeder accumulates micropayment receipts → Batch settle weekly/daily to reduce gas costs
```

### Task 4.1 — Modify a Torrent Client

Do not build a torrent client from scratch. Fork or integrate with:
```
https://github.com/webtorrent/webtorrent
```
WebTorrent is JavaScript-native, runs in Node.js and the browser, and is actively maintained.

The modification needed: intercept the chunk-serving flow to inject x402 payment verification before delivering each chunk.

```typescript
// packages/media/seeder/src/x402Seeder.ts

import WebTorrent from 'webtorrent';
import { requirePayment } from 'x402-rupee/server';

// When a peer requests a chunk, check for valid payment receipt
// before serving the chunk bytes
```

### Task 4.2 — Content Registration Contract

Creators register their content on-chain so the payment routing is trustless:

```solidity
// packages/contracts/src/ContentRegistry.sol
// Maps: contentHash → {creatorAddress, pricePerChunk, metadata}
```

### Task 4.3 — Viewer Web App

```
Next.js app with:
- Browse available content (reads ContentRegistry)
- Load wallet (Privy — supports email login for non-crypto users)
- Stream content (WebTorrent in browser, paying per chunk)
- Creator upload interface
```

---

## 9. Phase 5 — NammaCompute (Weeks 11–14)

**Goal:** A distributed compute marketplace where idle GPUs earn micropayments per task.

### Architecture

```
Task Types (start with these, they are "embarrassingly parallel"):
- Video transcoding (each segment independent)
- Image processing (resize, filter, format conversion)
- AI inference (run a model on a single input)
- Data preprocessing (transform a batch of records)

Task Flow:
1. Client submits task via API (POST /tasks)
2. Scheduler finds available registered node
3. Node receives task, executes it
4. Node submits result hash + proof of completion
5. Facilitator verifies result, triggers PBMWrapper.settlePayment()
6. Node receives payment
```

### Task 5.1 — Task Scheduler

```typescript
// packages/compute/scheduler/src/index.ts
// Uses BullMQ for reliable task queuing
// Assigns tasks to nodes based on:
// - Node availability (heartbeat last seen < 30s)
// - Node capability (GPU memory, CPU cores registered)
// - Node reputation score (historical task completion rate)
```

### Task 5.2 — Node Worker Software

The node software that runs on compute providers' machines:

```typescript
// packages/compute/worker/src/index.ts
// A daemon that:
// 1. Registers node address with facilitator
// 2. Polls for available tasks
// 3. Executes tasks in a Docker sandbox (security isolation)
// 4. Submits result hash for verification
// 5. Receives payment via PBMWrapper settlement
```

### Task 5.3 — Verification System

The hardest problem in distributed compute is verifying that work was actually done correctly.

Use this approach for Phase 1:
- **Redundant execution**: same task sent to 2-3 nodes, results compared
- **Result hashing**: nodes submit keccak256 of output, majority rules
- **Stake-based reputation**: nodes stake tokens; wrong results slash their stake

This is sufficient for Phase 1 non-critical tasks. ZK proof verification is a Phase 3 concern.

---

## 10. Phase 6 — e-Rupee Integration (Weeks 15–20)

**Goal:** Replace USDC settlement with e-Rupee via RBI CBDC Sandbox.

### Prerequisites (must be completed before this phase)

- [ ] Company incorporated as Private Limited (India)
- [ ] MoA includes "development of payment infrastructure and digital currency applications"
- [ ] Applied to RBI CBDC retail sandbox (rbicbdcsandbox@rbi.org.in)
  OR partner bank fintech program accepted (ICICI iStartup / HDFC SmartHub)
- [ ] Working USDC implementation is live with real users

### Task 6.1 — Implement eRupeeAdapter

With sandbox credentials from RBI or partner bank, implement the e-Rupee adapter:

```typescript
// packages/facilitator/src/adapters/erupee.adapter.ts

export class ERupeeAdapter implements SettlementAdapter {
  private sandboxClient: RBISandboxClient;

  constructor() {
    this.sandboxClient = new RBISandboxClient({
      baseUrl: process.env.RBI_SANDBOX_URL,
      apiKey: process.env.RBI_SANDBOX_API_KEY,
      facilitatorId: process.env.RBI_FACILITATOR_ID,
    });
  }

  async settlePayment(paymentId: string, conditionsHash: string): Promise<string> {
    // Map x402 payment authorization to e-Rupee token transfer
    const auth = await this.getPaymentAuth(paymentId);

    const transfer = await this.sandboxClient.transfer({
      from: auth.payerWalletId,         // e-Rupee wallet ID
      to: auth.nodeWalletId,            // e-Rupee wallet ID
      amount: auth.amount,              // in paise
      reference: paymentId,
      conditionsHash,
    });

    return transfer.transactionId;
  }
}
```

### Task 6.2 — Dual-Rail Settlement

Run USDC and e-Rupee in parallel. Let users choose:

```typescript
// In facilitator config:
const adapter = process.env.SETTLEMENT_RAIL === 'eINR'
  ? new ERupeeAdapter()
  : new USDCAdapter();
```

This allows you to serve both crypto-native users (USDC) and India-first users (e-Rupee) from the same infrastructure.

---

## 11. Regulatory Checkpoints

Complete these in parallel with technical development, not after.

| Milestone | Action | Timing |
|---|---|---|
| Phase 1 complete | Incorporate Pvt Ltd, correct MoA | Week 4 |
| Phase 2 complete | Apply to RBI CBDC retail sandbox | Week 6 |
| Phase 3 complete | Approach HDFC SmartHub or ICICI iStartup | Week 8 |
| Phase 4 live | File for RBI Payment Aggregator (PA) license or partner with Cashfree/Razorpay as payment aggregator | Week 12 |
| Phase 6 start | Apply to CAT Sandbox with working USDC product as proof | Week 14 |

**Never operate a payment product at scale without a PA license or PA partner. This is non-negotiable.**

---

## 12. Environment Variables

```env
# .env.example

# Blockchain
DEPLOYER_PRIVATE_KEY=
FACILITATOR_PRIVATE_KEY=
BASE_TESTNET_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Contract addresses (fill after Phase 2 deployment)
PBM_WRAPPER_ADDRESS=
MOCK_EINR_ADDRESS=
CONTENT_REGISTRY_ADDRESS=

# Facilitator server
FACILITATOR_URL=http://localhost:3001
NODE_WALLET_ADDRESS=
JWT_SECRET=

# Database
DATABASE_URL=postgresql://localhost:5432/x402rupee

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# RBI Sandbox (Phase 6)
RBI_SANDBOX_URL=
RBI_SANDBOX_API_KEY=
RBI_FACILITATOR_ID=

# Settlement rail: 'USDC' or 'eINR'
SETTLEMENT_RAIL=USDC
```

---

## 13. Open Questions (Resolve Before Each Phase)

These are architectural decisions that need answers before the relevant phase begins.

1. **Gas costs for Phase 1**: Each PBMWrapper.settlePayment() call costs gas on Base. At ₹0.002/request, gas costs must stay below ₹0.0002 (10% overhead). Verify Base Testnet gas costs before Phase 3.

2. **Batch settlement**: Instead of settling every micropayment individually (expensive), can you batch 1000 settlements into one transaction? Look at: state channels, payment channels, or off-chain tally with periodic on-chain settlement.

3. **Node reputation scoring algorithm**: Simple moving average of task completion rate? Or stake-weighted? Decision needed before Phase 5.

4. **e-Rupee API schema**: Until RBI sandbox credentials are obtained, the eRupeeAdapter is a stub. Monitor RBI developer documentation for API schema changes.

5. **KYC for node operators**: Compute and media nodes receiving payments above ₹50,000/year may need KYC under Indian law. Research threshold with a CA before Phase 4 launch.

---

## 14. Key Reference Links

```
# Singapore PBM
https://www.mas.gov.sg/schemes-and-initiatives/project-orchid
https://www.mas.gov.sg/-/media/mas-media-library/development/fintech/project-orchid/orchid-blueprint-final.pdf
https://opengovsg.substack.com/p/reimagining-government-payouts-with-programmable-money-p2-ba7a2ab35188
https://github.com/orgs/opengovsg/repositories

# x402 Protocol
https://www.x402.org/
https://github.com/coinbase/x402
https://docs.cdp.coinbase.com/x402

# RBI CBDC
https://rbidocs.rbi.org.in/rdocs/content/pdfs/CBDC231121.pdf  (RBI CBDC concept note)
rbicbdcsandbox@rbi.org.in  (sandbox access)

# Base Network (L2 blockchain)
https://docs.base.org/
https://sepolia.basescan.org/  (Base Testnet explorer)

# WebTorrent (for media use case)
https://github.com/webtorrent/webtorrent

# Privy (wallet + auth)
https://www.privy.io/

# OpenZeppelin (smart contract libraries)
https://docs.openzeppelin.com/contracts/5.x/
```

---

*End of Work Order v1.0*
*Next review: After Phase 2 (contract deployment)*
