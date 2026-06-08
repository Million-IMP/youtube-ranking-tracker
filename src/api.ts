// ─── REST API (Hono) ──────────────────────────────────────────────────────────
// Endpoints:
//   GET  /health                      서버 상태 확인
//   GET  /api/rankings                현재 전체 랭킹
//   GET  /api/rankings/:channelId     특정 채널 상세
//   GET  /api/channels/:id/history    채널 히스토리 (최근 N일)
//   GET  /api/stats/growth            이번 주 가장 빠르게 성장 중인 채널 TOP N
//   GET  /api/channels/:id/trend      선형 회귀 성장 트렌드
//   POST /api/rankings/refresh        수동 갱신 (X-Api-Key 인증)

import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { fetchRankings, fetchRankingById } from './supabase';
import { fetchChannelHistory } from './history';
import { getChannelTrend } from './trend';
import { runTracker } from './index';
import { config } from './config';

const app = new Hono();

app.use('*', cors());

const VALID_METRICS = ['subscriber_count', 'view_count', 'score'] as const;
type TrendMetric = typeof VALID_METRICS[number];

function err(c: Context, status: 400 | 401 | 404 | 500, code: string, message: string) {
  return c.json({ ok: false, code, message }, status);
}

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({ ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
);

// ─── GET /api/rankings ────────────────────────────────────────────────────────
app.get('/api/rankings', async (c) => {
  try {
    const rankings = await fetchRankings();
    return c.json({ ok: true, count: rankings.length, data: rankings });
  } catch (e) {
    return err(c, 500, 'SERVER_ERROR', (e as Error).message);
  }
});

// ─── GET /api/rankings/:channelId ─────────────────────────────────────────────
app.get('/api/rankings/:channelId', async (c) => {
  const channelId = c.req.param('channelId');
  try {
    const record = await fetchRankingById(channelId);
    if (!record) return err(c, 404, 'NOT_FOUND', `Channel ${channelId} not found`);
    return c.json({ ok: true, data: record });
  } catch (e) {
    return err(c, 500, 'SERVER_ERROR', (e as Error).message);
  }
});

// ─── GET /api/channels/:id/history ───────────────────────────────────────────
app.get('/api/channels/:id/history', async (c) => {
  const channelId = c.req.param('id');
  const days = Number(c.req.query('days') ?? config.defaultHistoryDays);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return err(c, 400, 'INVALID_PARAM', 'days must be between 1 and 365');
  }
  try {
    const history = await fetchChannelHistory(channelId, days);
    return c.json({ ok: true, channelId, days, count: history.length, data: history });
  } catch (e) {
    return err(c, 500, 'SERVER_ERROR', (e as Error).message);
  }
});

// ─── GET /api/stats/growth ────────────────────────────────────────────────────
app.get('/api/stats/growth', async (c) => {
  const topN = Number(c.req.query('top') ?? 3);
  if (!Number.isFinite(topN) || topN < 1 || topN > 20) {
    return err(c, 400, 'INVALID_PARAM', 'top must be between 1 and 20');
  }
  try {
    const rankings = await fetchRankings();
    const withDelta = rankings
      .filter((r) => r.has_previous_data)
      .sort((a, b) => b.subscriber_delta_rate - a.subscriber_delta_rate)
      .slice(0, topN);
    return c.json({ ok: true, count: withDelta.length, data: withDelta });
  } catch (e) {
    return err(c, 500, 'SERVER_ERROR', (e as Error).message);
  }
});

// ─── GET /api/channels/:id/trend ─────────────────────────────────────────────
app.get('/api/channels/:id/trend', async (c) => {
  const channelId = c.req.param('id');
  const rawMetric = c.req.query('metric') ?? 'subscriber_count';
  const days = Number(c.req.query('days') ?? config.defaultHistoryDays);

  if (!(VALID_METRICS as readonly string[]).includes(rawMetric)) {
    return err(c, 400, 'INVALID_PARAM', `metric must be one of: ${VALID_METRICS.join(', ')}`);
  }
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return err(c, 400, 'INVALID_PARAM', 'days must be between 1 and 365');
  }

  try {
    const trend = await getChannelTrend(channelId, rawMetric as TrendMetric, days);
    return c.json({ ok: true, data: trend });
  } catch (e) {
    return err(c, 500, 'SERVER_ERROR', (e as Error).message);
  }
});

// ─── POST /api/rankings/refresh ──────────────────────────────────────────────
app.post('/api/rankings/refresh', async (c) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return err(c, 401, 'UNAUTHORIZED', 'Invalid or missing X-Api-Key header');
  }
  try {
    const result = await runTracker();
    return c.json({ ok: true, meta: result.meta });
  } catch (e) {
    return err(c, 500, 'SERVER_ERROR', (e as Error).message);
  }
});

export default app;
