// ─── Trend Analysis (Linear Regression) ──────────────────────────────────────
// Fits a simple least-squares line to historical metric values and projects
// the value 30 days into the future.

import { fetchChannelHistory } from './history';
import { TrendResult } from './types';

interface Point { x: number; y: number }

function linearRegression(points: Point[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² = 1 - SS_res / SS_tot
  const meanY  = sumY / n;
  const ssTot  = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes  = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2     = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function classifyTrend(slope: number, meanY: number): 'growing' | 'declining' | 'stable' {
  if (meanY === 0) return 'stable';
  const relativeSlopePct = (slope / meanY) * 100;
  if (relativeSlopePct > 0.5) return 'growing';
  if (relativeSlopePct < -0.5) return 'declining';
  return 'stable';
}

export async function getChannelTrend(
  channelId: string,
  metric: 'subscriber_count' | 'view_count' | 'score',
  days = 30
): Promise<TrendResult> {
  const history = await fetchChannelHistory(channelId, days);

  if (history.length < 2) {
    return {
      channelId, metric, slope: 0, intercept: 0, r2: 0,
      trend: 'stable', predicted30d: history[0]?.[metric] ?? 0,
      dataPoints: history.length,
    };
  }

  const baseDate = new Date(history[0].snapshot_date).getTime();
  const points: Point[] = history.map((h) => ({
    x: (new Date(h.snapshot_date).getTime() - baseDate) / (1000 * 60 * 60 * 24), // days
    y: Number(h[metric]),
  }));

  const { slope, intercept, r2 } = linearRegression(points);
  const lastX = points[points.length - 1].x;
  const predicted30d = Math.max(0, slope * (lastX + 30) + intercept);
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;

  return {
    channelId, metric, slope, intercept, r2,
    trend: classifyTrend(slope, meanY),
    predicted30d: Math.round(predicted30d),
    dataPoints: history.length,
  };
}
