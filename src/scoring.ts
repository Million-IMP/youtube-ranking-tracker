// ─── Layer 2: Business Logic / Scoring ─────────────────────────────────────
// Two weight presets are auto-selected:
//   WITH_DELTA   — when at least one channel has a previous snapshot
//   WITHOUT_DELTA — first run, no history available
//
// All metrics are min-max normalized before weighting so no single
// large-scale metric (raw subscriber count) drowns out the others.

import { EnrichedChannelStats, ScoredChannel, ScoringWeights } from './types';
import { config } from './config';

function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

export function scoreChannels(
  channels: EnrichedChannelStats[],
  weightsOverride?: Partial<ScoringWeights>
): ScoredChannel[] {
  if (channels.length === 0) return [];

  const hasDelta = channels.some((c) => c.hasPreviousData);
  const baseWeights = hasDelta ? config.weightsWithDelta : config.weightsNoDelta;
  const w: ScoringWeights = { ...baseWeights, ...weightsOverride };

  const weightSum = w.acceleration + w.avgViews + w.subscribers + w.subscriberDelta + w.viewDelta;
  if (Math.abs(weightSum - 1.0) > 0.001) {
    throw new Error(`Scoring weights must sum to 1.0, got ${weightSum.toFixed(3)}`);
  }

  const withMetrics = channels.map((ch) => ({
    ...ch,
    acceleration: ch.viewCount / (ch.subscriberCount || 1),
    avgViewsPerVideo: ch.viewCount / (ch.videoCount || 1),
  }));

  const normAcceleration    = minMaxNormalize(withMetrics.map((c) => c.acceleration));
  const normAvgViews        = minMaxNormalize(withMetrics.map((c) => c.avgViewsPerVideo));
  const normSubscribers     = minMaxNormalize(withMetrics.map((c) => c.subscriberCount));
  const normSubscriberDelta = minMaxNormalize(withMetrics.map((c) => c.subscriberDeltaRate));
  const normViewDelta       = minMaxNormalize(withMetrics.map((c) => c.viewDeltaRate));

  const scored: ScoredChannel[] = withMetrics.map((ch, i) => ({
    ...ch,
    score:
      normAcceleration[i]    * w.acceleration +
      normAvgViews[i]        * w.avgViews +
      normSubscribers[i]     * w.subscribers +
      normSubscriberDelta[i] * w.subscriberDelta +
      normViewDelta[i]       * w.viewDelta,
    rank: 0,
  }));

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((ch, i) => { ch.rank = i + 1; });

  return scored;
}
