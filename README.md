# x402 × e-Rupee

**Programmable rupee infrastructure for the agentic economy.**

A bridge between the [x402 HTTP payment protocol](https://www.x402.org/) and India's e-Rupee CBDC — enabling autonomous machine-to-machine payments without human intervention, settled in Indian rupees.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with TypeScript](https://img.shields.io/badge/TypeScript-64%25-blue)](packages/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-gray)](packages/contracts/)
[![Network](https://img.shields.io/badge/Network-Base%20Sepolia-blue)](https://sepolia.basescan.org/)
[![Status](https://img.shields.io/badge/Status-Phase%201%20Active-green)]()

---

## The Problem

The internet was built in 1991 to share information. Not to exchange value.

Every payment you make online today is a workaround — Stripe, Razorpay, PayPal sitting between you and what you want, each extracting a cut, each requiring an account, each requiring a human to authenticate every transaction.

This architecture breaks entirely when the payer is a machine.

AI agents need to pay APIs for data. Distributed compute nodes need to receive payment per task. Content seeders need to earn per chunk served. At sub-rupee micropayment scale, traditional payment rails are economically impossible — a ₹0.002 transaction cannot absorb a ₹0.30 Stripe fee.

HTTP status code 402 — "Payment Required" — was reserved in the original 1991 spec for exactly this future. It sat unused for 34 years. Coinbase activated it in 2025. **x402 makes payment a first-class primitive of the web.**

The remaining gap: every x402 implementation settles in USDC, requiring a crypto wallet. India has 400 million UPI users and the world's second-largest CBDC pilot (₹10.16 billion in e-Rupee circulation, growing 334% YoY). Zero x402 integration exists for either.

**This project builds that bridge.**

---

## What This Is

An open-source x402 facilitator adapted for India's e-Rupee CBDC, with architecture derived from Singapore's [Project Orchid](https://www.mas.gov.sg/schemes-and-initiatives/project-orchid) Purpose Bound Money (PBM) system.

**Phase 1 (active):** Full x402 facilitator running on Base Sepolia testnet, settling in mock eINR (USDC-compatible ERC-20). All architecture, contracts, and APIs are live and testable today.

**Phase 2 (roadmap):** Swap the settlement adapter to India's e-Rupee via RBI CBDC Sandbox. Same codebase, different settlement rail.

### Two production use cases being built on top of this infrastructure

**NammaPay Media** — Torrent-based content distribution where every seeder earns micropayments per chunk served. Creators receive 90% of every rupee spent. No platform taking 45% of revenue. No subscription required — pay only for what you watch.

**NammaCompute** — Distributed compute marketplace where idle consumer GPUs earn rupees per task completed. AI inference, video transcoding, and data processing routed away from centralized AWS/GCP data centers (running at 15% utilization) toward distributed idle capacity.

---

## Architecture

The core insight from Singapore's PBM: you don't need to rebuild the currency. You need a **wrapper layer** — a smart contract that enforces payment conditions before releasing funds. The Rupee itself remains unchanged. This is *programmable payment*, not programmable money — a critical distinction for regulatory positioning.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAYMENT FLOW                               │
│                                                                 │
│  [AI Agent / App]                                               │
│       │                                                         │
│       │  1. GET /resource                                       │
│       ▼                                                         │
│  [Content / Compute Node]  ──▶  HTTP 402                        │
│       │                         { amount, facilitator,          │
│       │                           nodeAddress, currency }       │
│       │                                                         │
│       │  2. POST /facilitate                                    │
│       ▼                                                         │
│  [x402 Facilitator]  ◀─── This repo                            │
│       │                                                         │
│       │  3. PBMWrapper.settlePayment()                          │
│       ▼                                                         │
│  [PBM Smart Contract]  ──▶  Transfers eINR to node             │
│       │                                                         │
│       │  4. Returns JWT receipt                                 │
│       ▼                                                         │
│  [Content / Compute Node]  ──▶  Serves resource                │
│                                                                 │
│  No human touched anything. Settled on-chain. Auditable.        │
└─────────────────────────────────────────────────────────────────┘
```

### The PBM Wrapper (adapted from Singapore's Project Orchid)

```
Singapore PBM                        This Project
─────────────────────────────────    ─────────────────────────────────
Govt giving meal vouchers            Machines paying for API calls
"Spend only at restaurants"    →     "Pay only registered nodes"
"Expires in 30 days"           →     "Expires in 5 minutes"
"Max ₹50 per meal"             →     "Max ₹0.002 per chunk"
SGD collateral                 →     eINR / USDC collateral
```

---

## Repository Structure

```
x402-rupee/
├── packages/
│   ├── contracts/              # Solidity smart contracts
│   │   ├── src/
│   │   │   ├── MockEINR.sol            # ERC-20 mock e-Rupee (Phase 1 testing)
│   │   │   ├── PBMWrapper.sol          # Core PBM wrapper with x402 conditions
│   │   │   └── interfaces/
│   │   │       ├── IPBM.sol            # PBM interface contract
│   │   │       └── Ix402Facilitator.sol
│   │   └── test/
│   │       └── PBMWrapper.test.ts      # 19 test scenarios
│   │
│   ├── facilitator/            # x402 facilitator server (Hono + Node.js)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── payment.ts          # POST /facilitate — core payment endpoint
│   │       │   ├── verify.ts           # POST /verify — receipt verification
│   │       │   └── health.ts           # GET /health
│   │       ├── services/
│   │       │   ├── pbm.service.ts      # Business logic, signature verification
│   │       │   └── receipt.service.ts  # JWT receipt generation and verification
│   │       ├── adapters/
│   │       │   ├── usdc.adapter.ts     # Phase 1: USDC on Base Sepolia (live)
│   │       │   └── erupee.adapter.ts   # Phase 2: RBI CBDC (stub, awaiting sandbox)
│   │       └── types/
│   │           ├── index.ts            # Full type system
│   │           └── abi.ts              # PBMWrapper ABI for viem
│   │
│   └── sdk/                    # Open-source SDK for developers
│       └── src/
│           ├── server.ts               # requirePayment() middleware
│           ├── client.ts               # X402Client with payAndFetch()
│           └── types.ts
│
├── docs/
│   ├── architecture.md
│   ├── pbm-analysis.md
│   └── rbi-sandbox-notes.md
├── eli5_explanation.md         # Full beginner's guide — start here
└── x402_erupee_implementation_plan.md  # Detailed work order
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- A wallet with Base Sepolia testnet ETH ([faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Install

```bash
git clone https://github.com/ThePerkyFellow/x402_e-ruppee.git
cd x402_e-ruppee
pnpm install
```

### Configure

```bash
cp .env.example .env
# Fill in your DEPLOYER_PRIVATE_KEY and FACILITATOR_PRIVATE_KEY
```

### Build everything

```bash
pnpm build
```

### Run the test suite

```bash
# Contracts — runs on local Hardhat blockchain
cd packages/contracts
pnpm test

# All packages
pnpm test
```

### Deploy contracts to Base Sepolia

```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network baseTestnet
# Note the deployed addresses and add them to .env
```

### Start the facilitator server

```bash
cd packages/facilitator
pnpm dev
# Server starts at http://localhost:3001
```

### Test the full payment flow

```bash
# Health check
curl http://localhost:3001/health

# Trigger a payment (see packages/sdk/examples/ for full flow)
```

---

## The Settlement Adapter Pattern

The entire settlement layer is swappable via a single environment variable. This is the architectural decision that makes Phase 2 a configuration change rather than a rewrite.

```typescript
// .env
SETTLEMENT_RAIL=USDC   // Phase 1: Base Sepolia testnet
SETTLEMENT_RAIL=eINR   // Phase 2: RBI CBDC sandbox (when credentials available)
```

Both adapters implement the same `SettlementAdapter` interface:

```typescript
interface SettlementAdapter {
  authorizePayment(params: AuthorizeParams): Promise<string>;
  settlePayment(paymentId: string, conditionsHash: string): Promise<string>;
  getPaymentAuth(paymentId: string): Promise<PaymentAuthOnChain | null>;
}
```

When RBI CBDC sandbox credentials are obtained, `erupee.adapter.ts` gets filled in. Nothing else changes.

---

## Using the SDK

### Add a payment gate to any endpoint (server side)

```typescript
import { requirePayment } from '@x402-rupee/sdk';

// This endpoint now costs ₹2 per call
app.get('/api/data',
  requirePayment({ amount: 200, currency: 'eINR' }),
  (req, res) => res.json({ data: 'paid content' })
);
```

### Pay for a resource automatically (client / agent side)

```typescript
import { X402Client } from '@x402-rupee/sdk';

const client = new X402Client({ facilitatorUrl: 'http://localhost:3001' });

// Automatically handles 402 → pay → retry
const response = await client.payAndFetch('http://api.example.com/data');
```

---

## Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | PBM contracts + x402 facilitator on Base Sepolia (USDC) | ✅ Active |
| **Phase 2** | Contract audit + mainnet deployment | 🔜 Next |
| **Phase 3** | NammaPay Media — torrent seeder micropayments | 🔜 Planned |
| **Phase 4** | NammaCompute — distributed GPU marketplace | 🔜 Planned |
| **Phase 5** | Incorporate Pvt Ltd, apply to RBI CBDC retail sandbox | 🔜 Parallel |
| **Phase 6** | Swap USDC adapter for e-Rupee via RBI CAT Sandbox | 🔜 Planned |
| **Phase 7** | BRICS CBDC multi-currency support | 🔭 Long-term |

### The BRICS angle

India chairs BRICS in 2026 and has proposed linking member CBDC systems — e-Rupee, digital yuan, digital ruble, Brazil's Drex. If a BRICS CBDC bridge is endorsed, an x402 facilitator that settles in any of those currencies becomes infrastructure for 40% of the world's population. The adapter architecture is designed for this from day one.

---

## Regulatory Position

This project implements **programmable payment**, not programmable money. The e-Rupee token itself carries no conditions. All payment logic lives in the PBM wrapper layer — external smart contracts that enforce conditions before releasing standard currency. This mirrors the architecture the ECB adopted for the digital euro and aligns with RBI's stated distinction between the two concepts.

The e-Rupee adapter (`erupee.adapter.ts`) will connect to the RBI CBDC CAT Sandbox when credentials are available. If you work at a bank participating in RBI's CBDC pilot and want to collaborate, please open an issue.

**This project does not hold customer funds, does not issue new currency, and does not operate as a payment aggregator.** Anything built on this infrastructure that processes real payments at scale will require appropriate RBI licensing. See `docs/rbi-sandbox-notes.md` for the compliance roadmap.

---

## The Singapore Blueprint

This project is a direct adaptation of Singapore's open-source [Project Orchid / PBM](https://www.mas.gov.sg/schemes-and-initiatives/project-orchid) architecture, built by [Open Government Products](https://github.com/orgs/opengovsg/repositories).

MAS proved that programmable money conditions can be enforced without modifying the underlying currency. We applied that pattern to machine-to-machine API micropayments and adapted the settlement layer for India's e-Rupee.

Key reference documents in `docs/pbm-analysis.md`.

---

## Contributing

Building in public. All contributors welcome — especially if you bring one or more of the following:

- **Solidity experience** — contract optimization, security review, ZK proof integration
- **Node.js / TypeScript** — facilitator server, SDK, task scheduler
- **RBI CBDC knowledge** — sandbox access, API schema, compliance guidance
- **WebTorrent / P2P networking** — NammaPay Media seeder architecture
- **GPU / distributed compute** — NammaCompute worker and scheduler
- **Indian fintech / regulatory** — PA license path, partner bank introductions

### How to contribute

```bash
# Fork the repo, create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, write tests
pnpm test

# Open a PR with a clear description of what and why
```

Please read the implementation plan (`x402_erupee_implementation_plan.md`) before starting on any feature — it has the architectural context for every decision.

For first-time contributors, look for issues tagged `good first issue`. If you want to discuss an idea before building it, open a discussion.

---

## Documentation

| Document | What it covers |
|---|---|
| [`eli5_explanation.md`](eli5_explanation.md) | Complete beginner's guide — every concept explained simply |
| [`x402_erupee_implementation_plan.md`](x402_erupee_implementation_plan.md) | Full technical work order with tasks and acceptance criteria |
| [`docs/architecture.md`](docs/architecture.md) | System diagram and component overview |
| [`docs/pbm-analysis.md`](docs/pbm-analysis.md) | Singapore PBM → e-Rupee mapping and analysis |
| [`docs/rbi-sandbox-notes.md`](docs/rbi-sandbox-notes.md) | Phase 6 regulatory checklist and RBI sandbox application notes |

---

## Further Reading

- [x402 Protocol Spec](https://www.x402.org/) — the HTTP payment standard this builds on
- [x402 GitHub](https://github.com/coinbase/x402) — reference implementation
- [MAS Project Orchid](https://www.mas.gov.sg/schemes-and-initiatives/project-orchid) — the Singapore PBM system this adapts
- [MAS Orchid Blueprint PDF](https://www.mas.gov.sg/-/media/mas-media-library/development/fintech/project-orchid/orchid-blueprint-final.pdf) — full PBM architecture document
- [RBI CBDC Concept Note](https://rbidocs.rbi.org.in/rdocs/content/pdfs/CBDC231121.pdf) — RBI's digital rupee framework
- [RBI CBDC Sandbox](mailto:rbicbdcsandbox@rbi.org.in) — CAT Sandbox access

---

## License

MIT — build freely, give credit, don't hold us liable.

---

*Built in Bengaluru. Open source from day one.*
