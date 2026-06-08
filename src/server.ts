// ─── API Server Entry Point ───────────────────────────────────────────────────
// Run: node dist/server.js
// Or:  npm run api

import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './api';

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] YouTube Ranking API running on http://localhost:${port}`);
  console.log(`[server] Endpoints:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /api/rankings`);
  console.log(`  GET  /api/rankings/:channelId`);
  console.log(`  GET  /api/channels/:id/history?days=30`);
  console.log(`  GET  /api/stats/growth?top=3`);
  console.log(`  GET  /api/channels/:id/trend?metric=subscriber_count&days=30`);
  console.log(`  POST /api/rankings/refresh  (X-Api-Key 헤더 필요)`);
});
