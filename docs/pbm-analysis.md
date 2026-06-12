# PBM Architecture Analysis

> Study notes from reading Singapore's Purpose Bound Money (PBM) implementation.
> Fill this document as you read the reference materials in Section 2 of the implementation plan.

## TODO: Read These First

1. [ ] OGP Substack blog post on DSGD trial
2. [ ] MAS Orchid Blueprint (pages 1–40)
3. [ ] MAS Project Orchid overview
4. [ ] OpenGovSG GitHub repositories

## DSGD Minting Flow (Pseudocode)

> Reconstruct from OGP blog post:

```
1. Digital Fiat Issuer (DBS) calls DSGD.mint(amount, pbmIssuerAddress)
2. PBM Issuer calls PBMWrapper.wrap(dsgdAmount, conditions{...})
3. PBM Wrapper locks DSGD as collateral
4. PBM Wrapper mints PBM token to recipient wallet
5. Recipient uses PBM token at merchant
6. PBM Wrapper validates conditions → releases DSGD to merchant
7. PBM token is burned
```

## Mapping to Our System

| Singapore PBM Step | Our x402 Equivalent |
|---|---|
| Step 1: DBS mints DSGD | Payer has USDC (Phase 1) / e-Rupee (Phase 2) |
| Step 2: Wrap with conditions | `PBMWrapper.authorizePayment()` with x402 conditions |
| Step 3: Lock collateral | USDC/eINR locked in PBMWrapper contract |
| Step 4: Mint PBM to recipient | Payment authorization created (on-chain struct) |
| Step 5: Recipient uses at merchant | Node serves content/compute, claims payment |
| Step 6: Validate + release | Facilitator calls `PBMWrapper.settlePayment()` |
| Step 7: Burn PBM | Payment marked as settled, ID marked as used |

## Four PBM Components

| Component | Singapore | Ours |
|---|---|---|
| Digital Currency (Collateral) | DSGD (ERC-20) | Phase 1: USDC / Phase 2: e-Rupee |
| PBM Wrapper | ERC-1155 contract | PBMWrapper.sol (custom) |
| PBM Wallet | User/merchant wallet | Node wallet (seeder/compute) |
| Ledger Infrastructure | Ethereum-compatible | Base L2 (Phase 1) / RBI ledger (Phase 2) |

## Key Differences from Singapore PBM

- **Use case**: Singapore = government vouchers for consumers. Ours = machine-to-machine micropayments.
- **Conditions**: Singapore = merchant list + expiry. Ours = content hash + task ID + node address + expiry.
- **Token standard**: Singapore = ERC-1155 (semi-fungible). Ours = simpler struct-based authorization.
- **Settlement trigger**: Singapore = merchant POS. Ours = x402 facilitator server.
