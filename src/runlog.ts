// ─── Run Log Layer ────────────────────────────────────────────────────────────
// Tracks each execution in the run_logs table for observability.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RunLog } from './types';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export async function createRunLog(channelCount: number): Promise<number> {
  const client = getClient();
  const { data, error } = await client
    .from('run_logs')
    .insert({ status: 'running', channel_count: channelCount, success_count: 0, error_count: 0 })
    .select('id')
    .single();

  if (error) throw new Error(`Run log create failed: ${error.message}`);
  return (data as { id: number }).id;
}

export async function completeRunLog(
  id: number,
  startedAt: number,
  successCount: number,
  errorCount: number,
  errorDetails?: unknown
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('run_logs')
    .update({
      status: errorCount > 0 && successCount === 0 ? 'failed' : 'success',
      finished_at: new Date().toISOString(),
      success_count: successCount,
      error_count: errorCount,
      error_details: errorDetails ?? null,
      duration_ms: Date.now() - startedAt,
    })
    .eq('id', id);

  if (error) throw new Error(`Run log update failed: ${error.message}`);
}
