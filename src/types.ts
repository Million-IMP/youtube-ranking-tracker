// ─── Shared Type Definitions ───────────────────────────────────────────────

/** Raw stats returned directly from the YouTube Data API v3 */
export interface RawChannelStats {
  channelId: string;
  title: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  fetchedAt: string;
}

/** RawChannelStats + growth delta fields (computed by delta layer) */
export interface EnrichedChannelStats extends RawChannelStats {
  subscriberDelta: number;
  viewDelta: number;
  subscriberDeltaRate: number;  // percentage vs previous snapshot
  viewDeltaRate: number;
  hasPreviousData: boolean;
}

/** Enriched stats + scoring metrics (computed by scoring layer) */
export interface ScoredChannel extends EnrichedChannelStats {
  acceleration: number;       // totalViews ÷ subscribers
  avgViewsPerVideo: number;   // totalViews ÷ totalVideos
  score: number;
  rank: number;
}

/** Final snake_case record safe to upsert into Supabase */
export interface RankedChannelRecord {
  rank: number;
  channel_id: string;
  title: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  acceleration: number;
  avg_views_per_video: number;
  score: number;
  subscriber_delta: number;
  view_delta: number;
  subscriber_delta_rate: number;
  view_delta_rate: number;
  has_previous_data: boolean;
  fetched_at: string;
}

/** Row from youtube_rankings_history */
export interface HistoryRecord {
  id?: number;
  channel_id: string;
  title: string;
  rank: number;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  acceleration: number;
  avg_views_per_video: number;
  score: number;
  subscriber_delta: number;
  view_delta: number;
  subscriber_delta_rate: number;
  view_delta_rate: number;
  has_previous_data: boolean;
  snapshot_date: string;
  fetched_at: string;
}

/** Row from run_logs */
export interface RunLog {
  id?: number;
  started_at?: string;
  finished_at?: string;
  status: 'running' | 'success' | 'failed';
  channel_count: number;
  success_count: number;
  error_count: number;
  error_details?: unknown;
  duration_ms?: number;
}

/** Weights for the composite scoring formula (must sum to 1.0) */
export interface ScoringWeights {
  acceleration: number;     // default 0.35 (with delta) / 0.50 (no delta)
  avgViews: number;         // default 0.20 / 0.30
  subscribers: number;      // default 0.15 / 0.20
  subscriberDelta: number;  // default 0.20 / 0.00
  viewDelta: number;        // default 0.10 / 0.00
}

/** Rank change event for alerting */
export interface RankChange {
  channelId: string;
  title: string;
  previousRank: number;
  currentRank: number;
  delta: number;
}

/** Anomaly detection result */
export interface AnomalyAlert {
  channelId: string;
  title: string;
  type: 'SUBSCRIBER_SPIKE' | 'SUBSCRIBER_DROP' | 'VIEW_SPIKE';
  message: string;
  changeRate: number;
}

/** Linear regression trend result */
export interface TrendResult {
  channelId: string;
  metric: 'subscriber_count' | 'view_count' | 'score';
  slope: number;
  intercept: number;
  r2: number;
  trend: 'growing' | 'declining' | 'stable';
  predicted30d: number;
  dataPoints: number;
}

/** API error types */
export type YouTubeApiErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'INVALID_CHANNEL_ID'
  | 'CHANNEL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface YouTubeTrackerError {
  code: YouTubeApiErrorCode;
  channelId?: string;
  message: string;
  retryable: boolean;
}
