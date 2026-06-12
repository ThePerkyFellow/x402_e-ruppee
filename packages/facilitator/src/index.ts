/**
 * Facilitator Server — Entry Point
 */

// Load .env from project root FIRST (before any other imports use env vars)
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import type { Hex, Address } from 'viem';

// Services
import { PBMService } from './services/pbm.service.js';
import { ReceiptService } from './services/receipt.service.js';

// Adapters
import { USDCAdapter } from './adapters/usdc.adapter.js';
import { ERupeeAdapter } from './adapters/erupee.adapter.js';

// Routes
import { createPaymentRoute } from './routes/payment.js';
import { createVerifyRoute } from './routes/verify.js';
import { createHealthRoute } from './routes/health.js';

// Types
import type { FacilitatorConfig, SettlementAdapter } from './types/index.js';

/**
 * Load configuration from environment variables.
 *
 * 🧒 ELI5: Environment variables = sticky notes on your desk.
 *   They hold secrets (passwords, keys) that shouldn't be in the code.
 *   The code reads the sticky notes when it starts up.
 */
function loadConfig(): FacilitatorConfig {
  const requiredVars = [
    'FACILITATOR_PRIVATE_KEY',
    'PBM_WRAPPER_ADDRESS',
    'JWT_SECRET',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`);
      console.error(`   Copy .env.example to .env and fill in the values.`);
      process.exit(1);
    }
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    chainId: parseInt(process.env.CHAIN_ID || '84532', 10), // Base Sepolia default
    pbmWrapperAddress: process.env.PBM_WRAPPER_ADDRESS!,
    collateralTokenAddress: process.env.MOCK_EINR_ADDRESS || '',
    facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
    settlementRail: (process.env.SETTLEMENT_RAIL as 'USDC' | 'eINR') || 'USDC',
    rpcUrl: process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org',
  };
}

/**
 * Create the appropriate settlement adapter based on config.
 *
 * 🧒 ELI5: Pick the right cash register.
 *   If we're using dollars (USDC), use the dollar register.
 *   If we're using rupees (eINR), use the rupee register.
 */
function createAdapter(config: FacilitatorConfig): SettlementAdapter {
  if (config.settlementRail === 'eINR') {
    console.log('📌 Using e-Rupee settlement adapter (Phase 2)');
    return new ERupeeAdapter();
  }

  console.log('📌 Using USDC settlement adapter (Phase 1)');
  return new USDCAdapter({
    rpcUrl: config.rpcUrl,
    privateKey: config.facilitatorPrivateKey as Hex,
    pbmWrapperAddress: config.pbmWrapperAddress as Address,
  });
}

/**
 * Build and start the Hono application.
 */
export function createApp(config: FacilitatorConfig): Hono {
  const app = new Hono();

  // ─── Middleware ──────────────────────────────────────────────────────────
  app.use('*', logger());     // Log all requests
  app.use('*', cors());       // Allow cross-origin requests (for frontend)

  // ─── Services ───────────────────────────────────────────────────────────
  const adapter = createAdapter(config);
  const pbmService = new PBMService(adapter);
  const receiptService = new ReceiptService(config.jwtSecret);

  // ─── Routes ─────────────────────────────────────────────────────────────
  app.route('/', createHealthRoute());
  app.route('/', createPaymentRoute(pbmService, receiptService, config));
  app.route('/', createVerifyRoute(receiptService));

  // ─── 404 Handler ────────────────────────────────────────────────────────
  app.notFound((c) => {
    return c.json({
      error: 'Not found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      docs: 'See docs/architecture.md for available endpoints',
    }, 404);
  });

  // ─── Error Handler ──────────────────────────────────────────────────────
  app.onError((err, c) => {
    console.error('[Server] Unhandled error:', err);
    return c.json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    }, 500);
  });

  return app;
}

// ─── Start Server ───────────────────────────────────────────────────────────
// Only start if this file is run directly (not imported for testing)

const isMainModule = process.argv[1]?.includes('index');

if (isMainModule) {
  const config = loadConfig();
  const app = createApp(config);

  serve({
    fetch: app.fetch,
    port: config.port,
  }, (info) => {
    console.log(`
┌─────────────────────────────────────────────────┐
│         x402-rupee Facilitator Server            │
│                                                  │
│  🚀 Running on http://localhost:${info.port}          │
│  ⛓️  Chain: ${config.chainId === 84532 ? 'Base Sepolia (testnet)' : `Chain ${config.chainId}`}       │
│  💰 Rail: ${config.settlementRail}                            │
│  📄 Contract: ${config.pbmWrapperAddress.slice(0, 10)}...  │
│                                                  │
│  Endpoints:                                      │
│    GET  /health       — Health check             │
│    POST /facilitate   — Process payment          │
│    POST /verify       — Verify receipt           │
└─────────────────────────────────────────────────┘
    `);
  });
}

export { loadConfig };
