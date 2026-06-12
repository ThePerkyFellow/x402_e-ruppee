# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        x402-rupee System                            │
│                                                                     │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐  │
│  │  AI Agent /  │     │   FACILITATOR    │     │  Content/       │  │
│  │  Browser /   │────▶│   SERVER (Hono)  │────▶│  Compute Node   │  │
│  │  App         │     │                  │     │                 │  │
│  └─────────────┘     │  POST /facilitate │     │  Uses SDK:      │  │
│        │              │  GET  /verify     │     │  requirePayment │  │
│        │              └────────┬─────────┘     └─────────────────┘  │
│        │                       │                                     │
│        │              ┌────────▼─────────┐                          │
│        │              │  PBM WRAPPER     │                          │
│        │              │  (Smart Contract)│                          │
│        │              │                  │                          │
│        │              │  authorizePayment│                          │
│        └─────────────▶│  settlePayment   │                          │
│                       │  reclaimExpired  │                          │
│                       └────────┬─────────┘                          │
│                                │                                     │
│                       ┌────────▼─────────┐                          │
│                       │  COLLATERAL      │                          │
│                       │  (USDC / eINR)   │                          │
│                       │  ERC-20 Token    │                          │
│                       └──────────────────┘                          │
│                                                                     │
│  ─────────────── BASE L2 BLOCKCHAIN ──────────────────────────────  │
└─────────────────────────────────────────────────────────────────────┘
```

## Payment Flow

1. Client requests resource from node
2. Node returns HTTP 402 with payment requirements
3. Client reads 402, calls facilitator's `POST /facilitate`
4. Facilitator verifies signature, checks on-chain authorization
5. Facilitator calls `PBMWrapper.settlePayment()` on-chain
6. Collateral (USDC/eINR) released to node's wallet
7. Facilitator returns signed JWT receipt to client
8. Client retries request with receipt in `X-PAYMENT` header
9. Node verifies receipt, serves resource

## Package Structure

- **packages/contracts** — Solidity smart contracts (PBMWrapper, MockEINR)
- **packages/facilitator** — x402 facilitator API server (Hono)
- **packages/sdk** — Client + server SDK for developers
- **packages/media** — NammaPay Media app (Phase 4)
- **packages/compute** — NammaCompute app (Phase 5)
