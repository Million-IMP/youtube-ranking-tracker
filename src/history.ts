// ─── History Layer ────────────────────────────────────────────────────────────
// Reads/writes youtube_rankings_history for delta computation and trend analysis.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HistoryRecord, RankedChannelRecord } from './types';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

/**
 * Returns the most recent history snapshot per channel as a Map keyed by channel_id.
 * Uses parallel individual queries (1 row per channel) to avoid loading full history tables.
 */
export async function fetchLatestSnapshots(
  channelIds: string[]
): Promise<Map<string, HistoryRecord>> {
  if (channelIds.length === 0) return new Map();

  const client = getClient();

  const results = await Promise.all(
    channelIds.map((id) =>
      client
        .from('youtube_rankings_history')
        .select('*')
        .eq('channel_id', id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );

  const map = new Map<string, HistoryRecord>();
  for (let i = 0; i < channelIds.length; i++) {
    const { data } = results[i];
    if (data) map.set(channelIds[i], data as HistoryRecord);
  }
  return map;
}

/**
 * Fetches all snapshots for a single channel ordered by date ascending.
 * Used by trend.ts for linear regression.
 */
export async function fetchChannelHistory(
  channelId: string,
  days = 30
): Promise<HistoryRecord[]> {
  const client = getClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await client
    .from('youtube_rankings_history')
    .select('*')
    .eq('channel_id', channelId)
    .gte('snapshot_date', cutoff.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (error) throw new Error(`Channel history fetch failed: ${error.message}`);
  return (data ?? []) as HistoryRecord[];
}

/**
 * Inserts today's ranked records into history.
 * Upserts on (channel_id, snapshot_date) so re-runs on the same day overwrite.
 */
export async function insertHistoryBatch(records: RankedChannelRecord[]): Promise<void> {
  if (records.length === 0) return;

  const client = getClient();
  const today = new Date().toISOString().split('T')[0];

  const rows = records.map((r) => ({
    channel_id: r.channel_id,
    title: r.title,
    rank: r.rank,
    subscriber_count: r.subscriber_count,
    view_count: r.view_count,
    video_count: r.video_count,
    acceleration: r.acceleration,
    avg_views_per_video: r.avg_views_per_video,
    score: r.score,
    subscriber_delta: r.subscriber_delta,
    view_delta: r.view_delta,
    subscriber_delta_rate: r.subscriber_delta_rate,
    view_delta_rate: r.view_delta_rate,
    has_previous_data: r.has_previous_data,
    snapshot_date: today,
    fetched_at: r.fetched_at,
  }));

  const { error } = await client
    .from('youtube_rankings_history')
    .upsert(rows, { onConflict: 'channel_id,snapshot_date' });

  if (error) throw new Error(`History insert failed: ${error.message}`);
}

/** Deletes snapshots older than retentionDays to keep the table lean. */
export async function cleanupOldHistory(retentionDays = 90): Promise<void> {
  const client = getClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const { error } = await client
    .from('youtube_rankings_history')
    .delete()
    .lt('snapshot_date', cutoff.toISOString().split('T')[0]);

  if (error) throw new Error(`History cleanup failed: ${error.message}`);
}
