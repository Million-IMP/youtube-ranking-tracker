// ─── Centralized Configuration ────────────────────────────────────────────────
// All tunable constants in one place. Override via environment variables.

import { ScoringWeights } from './types';

export const config = {
  // Alert thresholds
  rankChangeThreshold: Number(process.env.RANK_CHANGE_THRESHOLD ?? 2),
  anomalyThresholdPct: Number(process.env.ANOMALY_THRESHOLD_PCT ?? 20),
  viewSpikeThresholdPct: Number(process.env.VIEW_SPIKE_THRESHOLD_PCT ?? 30),

  // History
  historyRetentionDays: Number(process.env.HISTORY_RETENTION_DAYS ?? 90),
  defaultHistoryDays: Number(process.env.DEFAULT_HISTORY_DAYS ?? 30),

  // Scoring weight presets
  weightsNoDelta: {
    acceleration: 0.50,
    avgViews: 0.30,
    subscribers: 0.20,
    subscriberDelta: 0,
    viewDelta: 0,
  } as ScoringWeights,

  weightsWithDelta: {
    acceleration: 0.35,
    avgViews: 0.20,
    subscribers: 0.15,
    subscriberDelta: 0.20,
    viewDelta: 0.10,
  } as ScoringWeights,
};
