// ─── Layer 4: Supabase — Current Rankings ────────────────────────────────────
// Handles upsert/read of the youtube_rankings table (latest snapshot only).

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RankedChannelRecord } from './types';

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
