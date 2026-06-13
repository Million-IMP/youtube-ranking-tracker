// ─── Layer 4: Supabase — Current Rankings ────────────────────────────────────
// Handles upsert/read of the youtube_rankings table (latest snapshot only).

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RankedChannelRecord, VideoSnapshot } from './types';

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export async function upsertRankings(records: RankedChannelRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  const { error, count } = await getClient()
    .from('youtube_rankings')
    .upsert(records, { onConflict: 'channel_id', count: 'exact' });
  if (error) throw new Error(`Rankings upsert failed: ${error.message}`);
  return count ?? records.length;
}

export async function fetchRankings(): Promise<RankedChannelRecord[]> {
  const { data, error } = await getClient()
    .from('youtube_rankings')
    .select('*')
    .order('rank', { ascending: true });
  if (error) throw new Error(`Rankings fetch failed: ${error.message}`);
  return (data ?? []) as RankedChannelRecord[];
}

export async function fetchRankingById(channelId: string): Promise<RankedChannelRecord | null> {
  const { data, error } = await getClient()
    .from('youtube_rankings')
    .select('*')
    .eq('channel_id', channelId)
    .maybeSingle();
  if (error) throw new Error(`Ranking fetch failed: ${error.message}`);
  return data as RankedChannelRecord | null;
}

// ─── Video Snapshots ──────────────────────────────────────────────────────────

export async function upsertVideoSnapshots(snapshots: Omit<VideoSnapshot, 'first_seen_at' | 'last_updated_at' | 'hot_alert_sent_at'>[]): Promise<void> {
  if (snapshots.length === 0) return;
  const records = snapshots.map((s) => ({ ...s, last_updated_at: new Date().toISOString() }));
  const { error } = await getClient()
    .from('youtube_video_snapshots')
    .upsert(records, { onConflict: 'video_id' });
  if (error) throw new Error(`Video snapshots upsert failed: ${error.message}`);
}

export async function fetchUnalertedRecentVideos(
  channelIds: string[],
  windowHours: number
): Promise<VideoSnapshot[]> {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await getClient()
    .from('youtube_video_snapshots')
    .select('*')
    .in('channel_id', channelIds)
    .is('hot_alert_sent_at', null)
    .gte('published_at', cutoff);
  if (error) throw new Error(`Video snapshots fetch failed: ${error.message}`);
  return (data ?? []) as VideoSnapshot[];
}

export async function markVideosAsAlerted(videoIds: string[]): Promise<void> {
  if (videoIds.length === 0) return;
  const { error } = await getClient()
    .from('youtube_video_snapshots')
    .update({ hot_alert_sent_at: new Date().toISOString() })
    .in('video_id', videoIds);
  if (error) throw new Error(`Mark alerted failed: ${error.message}`);
}
