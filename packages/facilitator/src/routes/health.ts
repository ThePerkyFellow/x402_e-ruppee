/**
 * Health Route — GET /health
 *
 * 🧒 ELI5: Like asking the server "are you alive?"
 *   Monitoring tools (Grafana, uptime bots) ping this every few seconds.
 *   If it stops responding, someone gets alerted.
 */

import { Hono } from 'hono';

export function createHealthRoute(): Hono {
  const app = new Hono();

  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      service: 'x402-rupee-facilitator',
    });
  });

  return app;
}
