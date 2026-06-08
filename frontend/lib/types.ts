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

export interface HistoryRecord extends RankedChannelRecord {
  id?: number;
  snapshot_date: string;
}

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

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  count?: number;
}

export interface HealthResponse {
  ok: boolean;
  uptime: number;
  timestamp: string;
}
