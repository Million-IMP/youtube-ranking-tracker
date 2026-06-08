// ─── Delta Enrichment ────────────────────────────────────────────────────────
// Computes growth deltas by comparing current stats with the previous snapshot.
// Channels with no history get delta = 0 and hasPreviousData = false.

import { RawChannelStats, EnrichedChannelStats, HistoryRecord } from './types';

export function enrichWithDeltas(
  channels: RawChannelStats[],
  previousMap: Map<string, HistoryRecord>
): EnrichedChannelStats[] {
  return channels.map((ch) => {
    const prev = previousMap.get(ch.channelId);

    if (!prev) {
      return { ...ch, subscriberDelta: 0, viewDelta: 0, subscriberDeltaRate: 0, viewDeltaRate: 0, hasPreviousData: false };
    }

    const subscriberDelta = ch.subscriberCount - prev.subscriber_count;
    const viewDelta = ch.viewCount - prev.view_count;

    const subscriberDeltaRate = prev.subscriber_count > 0
      ? (subscriberDelta / prev.subscriber_count) * 100
      : 0;
    const viewDeltaRate = prev.view_count > 0
      ? (viewDelta / prev.view_count) * 100
      : 0;

    return { ...ch, subscriberDelta, viewDelta, subscriberDeltaRate, viewDeltaRate, hasPreviousData: true };
  });
}
