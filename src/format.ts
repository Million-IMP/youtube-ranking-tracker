// ─── Layer 3: Output Formatting ──────────────────────────────────────────────
// Converts ScoredChannel (camelCase) → RankedChannelRecord (snake_case for DB).

import { ScoredChannel, RankedChannelRecord } from './types';

export function formatOutput(channels: ScoredChannel[]): RankedChannelRecord[] {
  return channels.map((ch) => ({
    rank: ch.rank,
    channel_id: ch.channelId,
    title: ch.title,
    subscriber_count: ch.subscriberCount,
    view_count: ch.viewCount,
    video_count: ch.videoCount,
    acceleration: round4(ch.acceleration),
    avg_views_per_video: round4(ch.avgViewsPerVideo),
    score: round4(ch.score),
    subscriber_delta: ch.subscriberDelta,
    view_delta: ch.viewDelta,
    subscriber_delta_rate: round4(ch.subscriberDeltaRate),
    view_delta_rate: round4(ch.viewDeltaRate),
    has_previous_data: ch.hasPreviousData,
    fetched_at: ch.fetchedAt,
  }));
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
