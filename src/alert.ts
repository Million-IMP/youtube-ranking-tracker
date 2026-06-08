// ─── Alert & Anomaly Detection ───────────────────────────────────────────────
// Detects rank changes and subscriber anomalies, then sends Slack notifications.

import { RankedChannelRecord, HistoryRecord, RankChange, AnomalyAlert } from './types';

const RANK_CHANGE_THRESHOLD = 2;      // 2단계 이상 변동 시 알림
const ANOMALY_THRESHOLD_PCT = 20;     // 구독자 20% 이상 변동 시 이상 감지

export function detectRankChanges(
  current: RankedChannelRecord[],
  previousMap: Map<string, HistoryRecord>
): RankChange[] {
  const changes: RankChange[] = [];

  for (const ch of current) {
    const prev = previousMap.get(ch.channel_id);
    if (!prev) continue;

    const delta = prev.rank - ch.rank; // 양수 = 순위 상승
    if (Math.abs(delta) >= RANK_CHANGE_THRESHOLD) {
      changes.push({ channelId: ch.channel_id, title: ch.title, previousRank: prev.rank, currentRank: ch.rank, delta });
    }
  }

  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function detectAnomalies(
  current: RankedChannelRecord[],
  previousMap: Map<string, HistoryRecord>
): AnomalyAlert[] {
  const anomalies: AnomalyAlert[] = [];

  for (const ch of current) {
    if (!ch.has_previous_data) continue;

    const changeRate = ch.subscriber_delta_rate;

    if (changeRate >= ANOMALY_THRESHOLD_PCT) {
      anomalies.push({
        channelId: ch.channel_id,
        title: ch.title,
        type: 'SUBSCRIBER_SPIKE',
        message: `구독자 ${changeRate.toFixed(1)}% 급증 (+${ch.subscriber_delta.toLocaleString()}명)`,
        changeRate,
      });
    } else if (changeRate <= -ANOMALY_THRESHOLD_PCT) {
      anomalies.push({
        channelId: ch.channel_id,
        title: ch.title,
        type: 'SUBSCRIBER_DROP',
        message: `구독자 ${Math.abs(changeRate).toFixed(1)}% 급감 (${ch.subscriber_delta.toLocaleString()}명)`,
        changeRate,
      });
    }
  }

  return anomalies;
}

export async function sendSlackAlert(
  changes: RankChange[],
  anomalies: AnomalyAlert[],
  webhookUrl: string
): Promise<void> {
  if (changes.length === 0 && anomalies.length === 0) return;

  const lines: string[] = [`*📊 YouTube 랭킹 알림* — ${new Date().toLocaleDateString('ko-KR')}\n`];

  if (changes.length > 0) {
    lines.push('*순위 변동*');
    for (const c of changes) {
      const arrow = c.delta > 0 ? '📈' : '📉';
      const sign = c.delta > 0 ? '+' : '';
      lines.push(`${arrow} ${c.title}: ${c.previousRank}위 → ${c.currentRank}위 (${sign}${c.delta})`);
    }
  }

  if (anomalies.length > 0) {
    lines.push('\n*이상 감지*');
    for (const a of anomalies) {
      const icon = a.type === 'SUBSCRIBER_SPIKE' ? '🚀' : '⚠️';
      lines.push(`${icon} ${a.title}: ${a.message}`);
    }
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  });
}
