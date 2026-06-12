# x402 e-Rupee — The Complete Beginner's Guide

> Everything explained like you're 5 years old. No jargon left unexplained.

---

## Part 1: The Big Picture — What Problem Are We Solving?

### The Real World Analogy

Imagine you run a **lemonade stand**. A customer walks up, gives you ₹10, you give them lemonade. Simple.

Now imagine the customer is a **robot** (an AI agent, a computer program). And you're not one lemonade stand — you're **10,000 computers** across India, each selling different things:
- Some sell **video chunks** (like Netflix, but decentralized)
- Some sell **computing power** (like renting a brain to do math)

The problem? **Robots can't hand over physical cash.** They need a way to:
1. Know the price
2. Pay instantly
3. Get a receipt
4. Get the thing they paid for

**All without any human touching anything.**

### What We Built

We built the **entire payment system** that makes this possible:

```
Robot A: "I want video chunk #42"
Server:  "That costs ₹0.002. Pay here." (HTTP 402 response)
Robot A: "Here's my payment proof"       (X-PAYMENT header)
Server:  "Payment verified. Here's your video chunk."
```

The magic is in the middle — **our system** handles step 2-3.

---

## Part 2: The Technologies — What Is All This Stuff?

### 🔗 Blockchain — The Unfakeable Notebook

> **🧒 ELI5:** Imagine a notebook where:
> - Everyone in the world has a copy
> - Once you write something, you can NEVER erase it
> - If you try to change it, everyone else's copy proves you're lying
>
> That's a blockchain. It's a shared record book that nobody can cheat.

**Why we need it:** When Robot A pays Robot B, we need PROOF that can't be faked. The blockchain IS that proof.

**Base Sepolia** is the specific blockchain we use. It's a "testnet" — a practice blockchain with fake money. Like Monopoly money. We build and test here before using real money.

---

### 📝 Smart Contracts — Rules Carved in Stone

> **🧒 ELI5:** A normal contract is paper that says "I promise to pay you." Someone COULD break the promise.
>
> A smart contract is a **robot** that holds the money. The rules are programmed in. When conditions are met, the robot AUTOMATICALLY pays. Nobody can stop it. Nobody can cheat.

We wrote 2 smart contracts:
1. **MockEINR** — Fake rupees for testing
2. **PBMWrapper** — The lockbox with rules (the main one)

---

### 🔧 Solidity — The Language Smart Contracts Speak

> **🧒 ELI5:** Humans speak English. Cats speak meow. Smart contracts speak **Solidity**.
>
> It looks a bit like JavaScript but runs on the blockchain instead of your computer.

Example:
```solidity
// This says: "only the owner can call this function"
function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
}
```

---

### 🏗️ Hardhat — The Smart Contract Workshop

> **🧒 ELI5:** You don't build a car on the highway. You build it in a **workshop** first.
>
> Hardhat is the workshop for smart contracts. It lets us:
> - Write contracts
> - Test them with fake money
> - Create a tiny fake blockchain on our computer for testing
> - Deploy to real blockchains when ready

---

### 🪙 ERC-20 — The Universal Money Template

> **🧒 ELI5:** Every ₹100 note looks the same — same size, same color, same security features. That's because they follow a standard.
>
> ERC-20 is the standard for digital money on the blockchain. If your token follows ERC-20, every wallet, every exchange, every app already knows how to use it.

Our MockEINR token follows ERC-20. This means any Ethereum wallet can hold it, send it, receive it — without any special setup.

---

### 📦 Monorepo — One Big Organized Box

> **🧒 ELI5:** You have 3 LEGO sets — castle, spaceship, car. Instead of 3 boxes in 3 rooms, you put them ALL in ONE big box with labeled sections.

Our monorepo has 3 sections (packages):
```
x402/
├── packages/
│   ├── contracts/      ← The LEGO castle (smart contracts)
│   ├── facilitator/    ← The LEGO spaceship (API server)
│   └── sdk/            ← The LEGO car (developer toolkit)
```

**Why monorepo?** Because the spaceship needs wheels from the castle. When packages live together, they can share code easily.

---

### 📦 pnpm — The Smart Supply Manager

> **🧒 ELI5:** When building LEGO, castle and spaceship both need the same wheel piece. Instead of buying wheels TWICE, pnpm gets ONE set and lets both use it. Saves space, saves time.

pnpm is a **package manager**. It downloads libraries (pre-built code) that we need. It's smarter than npm (the default) because it saves disk space.

---

### 🔄 Turbo — The Build Scheduler

> **🧒 ELI5:** If you're making breakfast (toast + eggs + juice), you don't make toast, WAIT, then eggs, WAIT, then juice. You start ALL of them at the same time!
>
> But some things MUST wait — you can't butter toast before it's toasted.
>
> Turbo knows: "contracts must compile BEFORE facilitator can build." It runs everything as fast as possible while respecting the order.

---

## Part 3: Every File Explained

### Root Files (the foundation)

````carousel
#### [package.json](file:///c:/DataStore/Projects/x402/package.json)
**What:** The ID card of our project.
**Contains:** Project name, version, and scripts (commands we can run).
```json
"scripts": {
    "build": "turbo run build",   // Build everything
    "test": "turbo run test",     // Test everything
    "dev": "turbo run dev"        // Run everything in dev mode
}
```
**🧒 ELI5:** Like the label on the LEGO box — tells you what's inside and how to build it.
<!-- slide -->
#### [pnpm-workspace.yaml](file:///c:/DataStore/Projects/x402/pnpm-workspace.yaml)
**What:** Tells pnpm "all folders inside `packages/` are separate sub-projects."
```yaml
packages:
  - "packages/*"
```
**🧒 ELI5:** A map that says "the castle, spaceship, and car are all in this box."
<!-- slide -->
#### [turbo.json](file:///c:/DataStore/Projects/x402/turbo.json)
**What:** Build instructions for Turbo. Says which tasks exist and what depends on what.
- `build` depends on `^build` — meaning: build dependencies first
- `test` depends on `build` — meaning: compile before testing
- `dev` runs persistently (doesn't stop)

**🧒 ELI5:** The instruction sheet that says "build walls before adding the roof."
<!-- slide -->
#### [tsconfig.json](file:///c:/DataStore/Projects/x402/tsconfig.json)
**What:** TypeScript configuration. TypeScript = JavaScript with spell-checking.
- `strict: true` — catch MORE mistakes (good!)
- `target: ES2022` — use modern JavaScript features

**🧒 ELI5:** Like setting the difficulty level for your spell-checker to "strict" so it catches every typo.
<!-- slide -->
#### [.env.example](file:///c:/DataStore/Projects/x402/.env.example)
**What:** Template for secret configuration (passwords, API keys, blockchain addresses).
You copy this to `.env` and fill in YOUR values. Never share `.env` with anyone!

**🧒 ELI5:** A form with blank spaces: "Your name: _____, Your password: _____". You fill it in privately.
<!-- slide -->
#### [.gitignore](file:///c:/DataStore/Projects/x402/.gitignore)
**What:** Tells Git (version control) which files to IGNORE — never upload these.
- `node_modules/` — downloaded libraries (too big, anyone can re-download)
- `.env` — secrets (NEVER share passwords)
- `dist/` — compiled code (can be regenerated)

**🧒 ELI5:** A "do not pack" list for your suitcase. "Don't pack the furniture — we'll buy new ones there."
````

---

### Smart Contracts Package (`packages/contracts`)

This is the **heart** of the system. Everything else talks to these contracts.

````carousel
#### [IPBM.sol](file:///c:/DataStore/Projects/x402/packages/contracts/src/interfaces/IPBM.sol) — The Rule Book

**What:** An **interface** — it defines WHAT functions must exist, but not HOW they work.

```solidity
function authorizePayment(...) external;  // Must exist
function settlePayment(...) external;     // Must exist
function reclaimExpired(...) external;    // Must exist
```

**🧒 ELI5:** Like a job description: "The cashier MUST be able to: take money, give change, count the register." It doesn't say HOW — just WHAT.

**Why?** So different implementations can exist. If we build PBMWrapper v2 someday, it must still have these functions. The interface is the promise.
<!-- slide -->
#### [Ix402Facilitator.sol](file:///c:/DataStore/Projects/x402/packages/contracts/src/interfaces/Ix402Facilitator.sol) — The Referee's Rule Book

**What:** Interface for the verification function.

```solidity
function verifyPayment(bytes32 paymentId)
    external view
    returns (bool isValid, address nodeAddress, uint256 amount);
```

**🧒 ELI5:** Defines what the "referee" must be able to answer: "Was this payment real? Who got paid? How much?"
<!-- slide -->
#### [MockEINR.sol](file:///c:/DataStore/Projects/x402/packages/contracts/src/MockEINR.sol) — Monopoly Money

**What:** A fake e-Rupee token for testing. Follows the ERC-20 standard.

**Key details:**
- `decimals = 2` → 100 units = 1 rupee (like paise!)
- `mint()` → only the owner (simulating RBI/bank) can create new tokens
- `burn()` → anyone can destroy their own tokens

**Why is it simple?** ON PURPOSE. This is "Programmable PAYMENT, not Programmable MONEY."
The money (eINR) is dumb — just a token. The SMART part is in PBMWrapper.
This is critical for regulation: we're not creating a new currency, we're building payment logic AROUND existing currency.

**🧒 ELI5:** The Monopoly money itself doesn't have rules. The GAME BOARD has rules about what you can do with it.
<!-- slide -->
#### [PBMWrapper.sol](file:///c:/DataStore/Projects/x402/packages/contracts/src/PBMWrapper.sol) — THE LOCKBOX ⭐

**What:** The most important contract. This is where all the magic happens.

**The lockbox analogy:**
1. **Kid A** puts ₹5 in a lockbox, writes a note: "Give to Kid B when they bring my homework"
2. **Teacher** checks: "Did Kid B bring homework?" YES → opens lockbox, gives ₹5 to Kid B
3. **Friday deadline**: If Kid B never showed up, Kid A gets their ₹5 back

**Three core functions:**

| Function | What It Does | Who Calls It |
|---|---|---|
| `authorizePayment()` | Lock money in the lockbox with conditions | The payer (robot/app) |
| `settlePayment()` | Open lockbox, give money to the node | The facilitator (referee) |
| `reclaimExpired()` | Give money back if time ran out | The payer |

**Security features:**
- `registeredNodes` — only approved robots can receive money
- `authorizedFacilitators` — only approved referees can settle
- `usedPaymentIds` — same ticket can't be used twice (replay attack prevention)
- `ReentrancyGuard` — prevents a sneaky attack where a contract calls back into ours mid-transaction
- `SafeERC20` — handles weird tokens that don't follow standards properly

**🧒 ELI5:** An unbreakable piggy bank that only opens when specific magic words are spoken by specific people before a specific time.
<!-- slide -->
#### [PBMWrapper.test.ts](file:///c:/DataStore/Projects/x402/packages/contracts/test/PBMWrapper.test.ts) — Crash Testing

**What:** 19 tests that try EVERY way to use (and abuse) the lockbox.

**The 6 scenarios:**

| # | Test | Expected Result |
|---|---|---|
| 1 | Normal use: lock → settle → receive | ✅ Works |
| 2 | Same ticket used twice | ❌ Blocked |
| 3 | Settle after time expired | ❌ Blocked |
| 4 | Get refund after expiry | ✅ Works |
| 5 | Wrong password (conditions hash) | ❌ Blocked |
| 6 | Random stranger tries to settle | ❌ Blocked |

**Why test so much?** Smart contracts handle REAL MONEY and CAN'T BE UPDATED after deployment.
Find a bug after deploy? Money is GONE. So we test every edge case BEFORE deploying.

**🧒 ELI5:** Before putting your goldfish in a new tank, you fill it with water, wait a day, check for leaks, test the temperature, test the filter... because once the fish is in, you can't take the tank apart.
<!-- slide -->
#### [hardhat.config.ts](file:///c:/DataStore/Projects/x402/packages/contracts/hardhat.config.ts) — Workshop Settings

**What:** Tells Hardhat:
- **Solidity version:** 0.8.24 (which language version to compile with)
- **Optimizer:** ON, 200 runs (makes contracts cheaper to use on-chain)
- **Networks:**
  - `hardhat` — fake local blockchain (free, instant)
  - `baseTestnet` — Base Sepolia (real testnet, fake money)

**🧒 ELI5:** Settings for your workshop — "use this saw, this sandpaper, and build for this shelf."
````

---

### Facilitator Server (`packages/facilitator`)

The facilitator is the **bridge between the internet and the blockchain.**

Smart contracts can't listen to HTTP requests. They just sit on the blockchain waiting to be called.
The facilitator LISTENS to the internet, then CALLS the smart contract.

````carousel
#### [types/index.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/types/index.ts) — The Dictionary

**What:** Defines the "shape" of every piece of data in the system.

**Key types:**
- `X402PBMConditions` — The payment rules (who, how much, for what, when it expires)
- `FacilitateRequest` — What clients send to `POST /facilitate`
- `PaymentReceipt` — What the facilitator returns after settlement (JWT)
- `SettlementAdapter` — The interface for settlement backends (USDC vs e-Rupee)
- `FacilitatorConfig` — Server configuration (port, keys, addresses)

**🧒 ELI5:** Like a dictionary: "When I say 'PaymentReceipt', I mean a thing with paymentId, txHash, amount..."
Without this, everyone would call things different names and nothing would work.
<!-- slide -->
#### [types/abi.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/types/abi.ts) — The Translation Book

**What:** The ABI (Application Binary Interface) for our PBMWrapper contract.

The blockchain doesn't understand "settlePayment." It understands binary: `0xa9059cbb...`
The ABI is the translation table:
```
"settlePayment" → takes (bytes32, bytes32) → returns nothing
"paymentAuths"  → takes (bytes32) → returns (address, address, uint256, bytes32, uint256, bool)
```

**🧒 ELI5:** When you travel to Japan, you need a phrasebook:
"Hello" → "こんにちは". The ABI is the phrasebook for talking to smart contracts.
<!-- slide -->
#### [adapters/usdc.adapter.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/adapters/usdc.adapter.ts) — The Dollar Cash Register

**What:** Connects to the PBMWrapper contract on Base Sepolia blockchain using **viem** (a lightweight Ethereum library).

**Three functions:**
- `settlePayment()` — Tell the contract to release money to the node
- `getPaymentAuth()` — Read the lockbox to see what's inside (free, no gas)
- `authorizePayment()` — Lock money in the lockbox (for testing)

**Uses viem because:**
- Lighter than ethers.js (the old standard)
- Better TypeScript types (catches more errors at compile time)
- Tree-shakeable (only imports what you use)

**🧒 ELI5:** The hand that reaches into the blockchain and presses buttons on the smart contract.
<!-- slide -->
#### [adapters/erupee.adapter.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/adapters/erupee.adapter.ts) — The Rupee Cash Register (Coming Soon)

**What:** A STUB — same shape as the USDC adapter, but every function throws "not implemented yet."

**Why it exists:** When RBI gives us sandbox access, we fill in the actual code.
Because it has the SAME INTERFACE as the USDC adapter, swapping is a config change:
```typescript
// Change this one line in .env:
SETTLEMENT_RAIL=eINR  // instead of USDC
```
That's it. Everything else works the same.

**🧒 ELI5:** A cash register with no drawer yet. The buttons are labeled, the screen works, but when you press "open drawer" it says "drawer not installed yet."

**This is called the Adapter Pattern** — one of the most powerful design patterns in software. It lets you swap implementations without changing the rest of the code.
<!-- slide -->
#### [services/pbm.service.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/services/pbm.service.ts) — The Brain

**What:** Business logic — the decision-making center.

**Three responsibilities:**
1. **Verify signature** — Is the payment request REALLY from the person who claims to sent it? (stubbed for Phase 1)
2. **Compute conditions hash** — Take all the payment details, blend them into a unique fingerprint (keccak256). If anyone changed even ONE byte, the fingerprint is completely different.
3. **Settle payment** — Tell the adapter to call the smart contract.

**Why separate from routes?** Clean code principle: routes handle HTTP (what comes in, what goes out). Services handle LOGIC (decisions). Adapters handle INFRASTRUCTURE (blockchain calls). Each layer has one job.

**🧒 ELI5:** The route is the waiter (takes your order). The service is the chef (decides how to cook it). The adapter is the oven (does the actual cooking).
<!-- slide -->
#### [services/receipt.service.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/services/receipt.service.ts) — The Receipt Printer

**What:** Creates and verifies JWT (JSON Web Token) payment receipts.

**JWT = three parts separated by dots:**
```
eyJhbGci.eyJwYXlt.SflKxwRJ
  header    payload   signature
```
- **Header:** "I'm a JWT, signed with HS256 algorithm"
- **Payload:** The actual data (paymentId, txHash, amount, etc.)
- **Signature:** Proof that the facilitator wrote this. Can't be faked without the secret key.

**Two functions:**
- `generate()` — Create a signed receipt after settlement (expires in 24 hours)
- `verify()` — Check if a receipt is real and not expired

**🧒 ELI5:** Like a receipt from a store — it has the store's stamp on it. You can't fake the stamp without the store's special stamper.
<!-- slide -->
#### [routes/payment.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/routes/payment.ts) — The Front Desk (`POST /facilitate`)

**What:** The most important HTTP endpoint. This is where payment requests arrive.

**The 7-step flow:**
```
Step 1: Validate input (Zod checks all fields exist and are correct types)
Step 2: Verify payer signature (is this request really from them?)
Step 3: Check on-chain authorization (does the lockbox have their money?)
Step 4: Verify conditions hash (do the conditions match?)
Step 5: Call PBMWrapper.settlePayment() (open the lockbox)
Step 6: Generate JWT receipt (write the receipt)
Step 7: Return receipt + transaction hash (hand receipt to client)
```

If ANY step fails, the appropriate error is returned (400, 401, 404, 409, 500).

**🧒 ELI5:** The front desk of a bank. You walk in, they check your ID, check your account, process the transaction, print a receipt, hand it to you.
<!-- slide -->
#### [routes/verify.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/routes/verify.ts) — The Receipt Checker (`POST /verify`)

**What:** Nodes call this to check: "Is this receipt real?"

Before a node serves a video chunk or compute result, it sends the receipt here.
If the receipt is valid (signed by us, not expired), node serves the resource.

**🧒 ELI5:** The bouncer at a concert. Someone shows a ticket. Bouncer calls the ticket office: "Is ticket #12345 real?" "Yes." "Come in."
<!-- slide -->
#### [routes/health.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/routes/health.ts) — The Heartbeat (`GET /health`)

**What:** Returns `{ status: "ok" }` — proves the server is alive.

Monitoring tools (like a doctor checking your pulse) ping this every few seconds.
If it stops responding, someone gets an alert.

**🧒 ELI5:** Like asking "are you alive?" and the server says "yep!"
<!-- slide -->
#### [index.ts](file:///c:/DataStore/Projects/x402/packages/facilitator/src/index.ts) — The Front Door

**What:** Wires EVERYTHING together and starts the server.

**Boot sequence:**
1. Load config from environment variables
2. Pick the right adapter (USDC or eINR based on config)
3. Create services (PBM brain + receipt printer)
4. Mount routes (payment, verify, health)
5. Start listening on port 3001

**🧒 ELI5:** The building manager who: unlocks the door, turns on the lights, puts staff at their desks, and flips the "OPEN" sign.
````

---

### SDK Package (`packages/sdk`)

The SDK is for **OTHER developers** who want to add x402 payments to their apps.

````carousel
#### [types.ts](file:///c:/DataStore/Projects/x402/packages/sdk/src/types.ts) — Shared Forms

**What:** Types that both the "payer" side and "receiver" side need.

- `PaymentRequired` — What the server puts in a 402 response ("pay me this much")
- `PaymentConfig` — How you configure the payment gate ("this endpoint costs ₹2")
- `VerifiedReceipt` — What comes back when you verify a receipt

**🧒 ELI5:** The order form at a restaurant — same form used by the customer AND the kitchen.
<!-- slide -->
#### [server.ts](file:///c:/DataStore/Projects/x402/packages/sdk/src/server.ts) — The Payment Bouncer

**What:** `requirePayment()` — a middleware function you drop into ANY endpoint to gate it behind payment.

**Usage (it's this simple):**
```typescript
app.get('/api/premium-data',
  requirePayment({ amount: 100, currency: 'eINR' }),
  handler
);
```

**What happens when someone calls `/api/premium-data`:**
1. No `X-PAYMENT` header? → Returns 402 with price tag
2. Has `X-PAYMENT` header? → Verifies receipt with facilitator
3. Valid receipt? → Passes through to your handler
4. Fake receipt? → Returns 402 again

**🧒 ELI5:** A bouncer you can hire for ANY door. Just say "this door costs ₹100" and the bouncer handles everything — checking tickets, rejecting fakes, letting valid ones through.
<!-- slide -->
#### [client.ts](file:///c:/DataStore/Projects/x402/packages/sdk/src/client.ts) — The Smart Shopper

**What:** `X402Client` with `payAndFetch()` — automatically handles the 402 payment flow.

**Flow:**
```typescript
const client = new X402Client({ facilitatorUrl: 'http://localhost:3001' });
const response = await client.payAndFetch('http://api.example.com/data');
```

**What happens inside payAndFetch:**
1. Try to fetch the URL normally
2. Got a 402? Read the price tag
3. Call your payment callback (you authorize on blockchain)
4. Retry the request with the receipt in `X-PAYMENT` header
5. Return the actual response with data

**🧒 ELI5:** A shopping assistant robot. "Go buy lemonade." Robot goes, gets told the price, pays, brings back lemonade. You just said "go buy."
<!-- slide -->
#### [index.ts](file:///c:/DataStore/Projects/x402/packages/sdk/src/index.ts) — The Store Front

**What:** Re-exports everything from one place.

```typescript
// Instead of importing from 3 different files:
import { X402Client } from '@x402-rupee/sdk/client';
import { requirePayment } from '@x402-rupee/sdk/server';

// You can import from one place:
import { X402Client, requirePayment } from '@x402-rupee/sdk';
```

**🧒 ELI5:** The store has one front door. You don't need to know which aisle things are on — the door leads to everything.
````

---

## Part 4: The Complete Payment Flow — How It ALL Connects

Here's what happens when an AI agent wants to buy a video chunk. Every single step:

```
STEP 1 — AI Agent tries to get a video chunk
─────────────────────────────────────────────
AI Agent → GET http://seeder.example.com/chunk/42
                                    │
                                    ▼
              Seeder's server runs requirePayment()
              middleware from our SDK. Checks for
              X-PAYMENT header. None found!
                                    │
                                    ▼

STEP 2 — Seeder returns 402 "Pay me first!"
─────────────────────────────────────────────
Seeder → HTTP 402 Response:
{
  "error": "Payment Required",
  "amount": 200,              ← 200 paise = ₹2
  "currency": "eINR",
  "facilitator": "http://facilitator.example.com",
  "nodeAddress": "0xSEEDER..."  ← seeder's wallet
}
                                    │
                                    ▼

STEP 3 — AI Agent reads the price tag
─────────────────────────────────────
Our X402Client.payAndFetch() reads the 402 body.
"Okay, I need to pay 200 paise to 0xSEEDER
 through the facilitator at this URL."
                                    │
                                    ▼

STEP 4 — AI Agent authorizes payment on-chain
──────────────────────────────────────────────
AI Agent calls PBMWrapper.authorizePayment() on blockchain:
- paymentId: unique ID for this payment
- nodeAddress: 0xSEEDER
- amount: 200 (paise)
- conditionsHash: fingerprint of all conditions
- expiresAt: 5 minutes from now

This LOCKS 200 paise in the PBMWrapper contract.
The money is now in the lockbox. Nobody can touch
it except through settlePayment() or reclaimExpired().
                                    │
                                    ▼

STEP 5 — AI Agent asks facilitator to settle
─────────────────────────────────────────────
AI Agent → POST http://facilitator.example.com/facilitate
{
  "paymentId": "0xABC123...",
  "nodeAddress": "0xSEEDER...",
  "amount": "200",
  "conditionsHash": "0xDEF456...",
  "payerSignature": "0x789...",
  "expiresAt": 1718060000,
  "useCase": "media",
  "metadata": { "contentHash": "0xCHUNK42..." }
}
                                    │
                                    ▼

STEP 6 — Facilitator processes the payment
──────────────────────────────────────────
(This is routes/payment.ts doing its 7-step flow)

6a. Zod validates the input ✓
6b. Verify payer signature ✓
6c. Read on-chain: does this paymentId exist? ✓
6d. Is it already settled? NO ✓
6e. Does conditionsHash match on-chain? ✓
6f. Call PBMWrapper.settlePayment() on blockchain
    → Contract verifies facilitator is authorized
    → Contract verifies not expired
    → Contract verifies conditionsHash matches
    → Contract transfers 200 paise to 0xSEEDER
    → Contract marks payment as settled
6g. Generate JWT receipt (signed by facilitator)
                                    │
                                    ▼

STEP 7 — Facilitator returns receipt
────────────────────────────────────
Facilitator → 200 OK:
{
  "receipt": "eyJhbGci.eyJwYXlt.SflKxw...",  ← JWT
  "txHash": "0xTX789..."  ← blockchain proof
}
                                    │
                                    ▼

STEP 8 — AI Agent retries with receipt
──────────────────────────────────────
AI Agent → GET http://seeder.example.com/chunk/42
Headers: { "X-PAYMENT": "eyJhbGci.eyJwYXlt.SflKxw..." }
                                    │
                                    ▼

STEP 9 — Seeder verifies and serves
────────────────────────────────────
Seeder's requirePayment() middleware sees X-PAYMENT header.
Calls facilitator: POST /verify { receipt: "eyJhbGci..." }
Facilitator checks JWT signature + expiry → "valid": true

Seeder serves the video chunk! 🎉
                                    │
                                    ▼

RESULT: AI Agent has video chunk #42.
        Seeder has 200 paise.
        No human touched anything.
        Everything is provable on blockchain.
```

---

## Part 5: The Singapore Connection — Why PBM?

Everything we built is based on Singapore's **Project Orchid** — a real government project that proved this works.

| Their System | Our System |
|---|---|
| Government giving meal vouchers to citizens | Robots paying each other for API calls |
| "Can only spend at approved restaurants" | "Can only pay registered nodes" |
| "Expires in 30 days" | "Expires in 5 minutes" |
| "Maximum ₹50 per meal" | "Maximum ₹0.002 per chunk" |
| Singapore Dollar (SGD) | Indian e-Rupee (eINR) / USDC |

The architecture is identical. The use case is different. That's the beauty — **the pattern is proven**, we just applied it to machine-to-machine payments.

---

## Part 6: What Each Document in `/docs` Is For

| Document | Purpose |
|---|---|
| [architecture.md](file:///c:/DataStore/Projects/x402/docs/architecture.md) | System diagram + how all pieces connect |
| [pbm-analysis.md](file:///c:/DataStore/Projects/x402/docs/pbm-analysis.md) | Your study notes mapping Singapore PBM → our system |
| [rbi-sandbox-notes.md](file:///c:/DataStore/Projects/x402/docs/rbi-sandbox-notes.md) | Phase 6 checklist for RBI e-Rupee integration |

---

## Quick Glossary

| Term | Meaning |
|---|---|
| **x402** | HTTP protocol for machine payments. When server needs money, it returns HTTP status 402. |
| **PBM** | Purpose Bound Money — Singapore's concept of adding rules to money transfers |
| **ERC-20** | Standard interface for tokens on Ethereum (like USB standard for drives) |
| **Hardhat** | Development environment for writing/testing smart contracts |
| **Hono** | Lightweight web framework (like Express but faster and smaller) |
| **viem** | Library for talking to Ethereum blockchains from JavaScript |
| **Zod** | Input validation library — checks that data matches expected shape |
| **JWT** | JSON Web Token — a signed note that proves who wrote it |
| **Gas** | Fee you pay to run code on blockchain (like postage for a letter) |
| **Testnet** | Practice blockchain with fake money |
| **Base Sepolia** | The specific testnet we use (run by Coinbase) |
| **keccak256** | Hash function — turns any data into a fixed-length fingerprint |
| **Replay attack** | Cheating by reusing a valid payment proof twice |
| **Reentrancy** | Sneaky attack where a contract calls back into yours mid-transaction |

