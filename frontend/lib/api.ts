import { RankedChannelRecord, HistoryRecord, TrendResult, HealthResponse } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  const json = await res.json();
  if (!json.ok) throw new Error(`[${json.code}] ${json.message}`);
  return json;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return get<HealthResponse>('/health');
}

export async function fetchRankings(): Promise<RankedChannelRecord[]> {
  const json = await get<{ ok: boolean; data: RankedChannelRecord[] }>('/api/rankings');
  return json.data;
}

export async function fetchRanking(channelId: string): Promise<RankedChannelRecord> {
  const json = await get<{ ok: boolean; data: RankedChannelRecord }>(`/api/rankings/${channelId}`);
  return json.data;
}

export async function fetchGrowthLeaders(top = 3): Promise<RankedChannelRecord[]> {
  const json = await get<{ ok: boolean; data: RankedChannelRecord[] }>(`/api/stats/growth?top=${top}`);
  return json.data;
}

export async function fetchHistory(channelId: string, days: number): Promise<HistoryRecord[]> {
  const json = await get<{ ok: boolean; data: HistoryRecord[] }>(
    `/api/channels/${channelId}/history?days=${days}`
  );
  return json.data;
}

export async function fetchTrend(
  channelId: string,
  metric: 'subscriber_count' | 'view_count' | 'score',
  days: number
): Promise<TrendResult> {
  const json = await get<{ ok: boolean; data: TrendResult }>(
    `/api/channels/${channelId}/trend?metric=${metric}&days=${days}`
  );
  return json.data;
}

export async function triggerRefresh(apiKey: string): Promise<void> {
  const res = await fetch(`${BASE}/api/rankings/refresh`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`[${json.code}] ${json.message}`);
}
