// ─── REST API (Hono) ──────────────────────────────────────────────────────────
// Endpoints:
//   GET  /api/rankings              현재 전체 랭킹
//   GET  /api/rankings/:channelId   특정 채널 상세
//   GET  /api/channels/:id/history  채널 히스토리 (최근 N일)
//   GET  /api/stats/growth          이번 주 가장 빠르게 성장 중인 채널 TOP N
//   GET  /api/channels/:id/trend    선형 회귀 성장 트렌드
//   POST /api/rankings/refresh      수동 갱신 (X-Api-Key 인증)

import { Hono } from 'hono';
import { fetchRankings } from './supabase';
import { fetchChannelHistory } from './history';
import { getChannelTrend } from './trend';
import { runTracker } from './index';

const app = new Hono();

// ─── GET /api/rankings ────────────────────────────────────────────────────────
app.get('/api/rankings', async (c) => {
  try {
    const rankings = await fetchRankings();
    return c.json({ ok: true, count: rankings.length, data: rankings });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

// ─── GET /api/rankings/:channelId ─────────────────────────────────────────────
app.get('/api/rankings/:channelId', async (c) => {
  const channelId = c.req.param('channelId');
  try {
    const all = await fetchRankings();
    const record = all.find((r) => r.channel_id === channelId);
    if (!record) return c.json({ ok: false, error: 'Channel not found' }, 404);
    return c.json({ ok: true, data: record });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

// ─── GET /api/channels/:id/history ───────────────────────────────────────────
app.get('/api/channels/:id/history', async (c) => {
  const channelId = c.req.param('id');
  const days = Number(c.req.query('days') ?? 30);
  try {
    const history = await fetchChannelHistory(channelId, days);
    return c.json({ ok: true, channelId, days, count: history.length, data: history });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

// ─── GET /api/stats/growth ────────────────────────────────────────────────────
app.get('/api/stats/growth', async (c) => {
  const topN = Number(c.req.query('top') ?? 3);
  try {
    const rankings = await fetchRankings();
    const withDelta = rankings
      .filter((r) => r.has_previous_data)
      .sort((a, b) => b.subscriber_delta_rate - a.subscriber_delta_rate)
      .slice(0, topN);
    return c.json({ ok: true, data: withDelta });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

// ─── GET /api/channels/:id/trend ─────────────────────────────────────────────
app.get('/api/channels/:id/trend', async (c) => {
  const channelId = c.req.param('id');
  const metric = (c.req.query('metric') ?? 'subscriber_count') as
    'subscriber_count' | 'view_count' | 'score';
  const days = Number(c.req.query('days') ?? 30);
  try {
    const trend = await getChannelTrend(channelId, metric, days);
    return c.json({ ok: true, data: trend });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

// ─── POST /api/rankings/refresh ──────────────────────────────────────────────
app.post('/api/rankings/refresh', async (c) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }
  try {
    const result = await runTracker();
    return c.json({ ok: true, meta: result.meta });
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

export default app;
