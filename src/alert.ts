// ─── Alert & Anomaly Detection ───────────────────────────────────────────────
// Detects rank changes and subscriber/view anomalies, then sends Slack notifications.

import { RankedChannelRecord, HistoryRecord, RankChange, AnomalyAlert } from './types';
import { config } from './config';

export function detectRankChanges(
  current: RankedChannelRecord[],
  previousMap: Map<string, HistoryRecord>
): RankChange[] {
  const changes: RankChange[] = [];

  for (const ch of current) {
    const prev = previousMap.get(ch.channel_id);
    if (!prev) continue;

    const delta = prev.rank - ch.rank; // 양수 = 순위 상승
    if (Math.abs(delta) >= config.rankChangeThreshold) {
      changes.push({
        channelId: ch.channel_id,
        title: ch.title,
        previousRank: prev.rank,
        currentRank: ch.rank,
        delta,
        currentScore: ch.score,
        previousScore: prev.score,
        currentSubscribers: ch.subscriber_count,
        previousSubscribers: prev.subscriber_count,
        subscriberDelta: ch.subscriber_delta,
        subscriberDeltaRate: ch.subscriber_delta_rate,
        currentAcceleration: ch.acceleration,
        previousAcceleration: prev.acceleration,
      });
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

    const subRate = ch.subscriber_delta_rate;
    const viewRate = ch.view_delta_rate;

    if (subRate >= config.anomalyThresholdPct) {
      anomalies.push({
        channelId: ch.channel_id,
        title: ch.title,
        type: 'SUBSCRIBER_SPIKE',
        message: `구독자 ${subRate.toFixed(1)}% 급증 (+${ch.subscriber_delta.toLocaleString('ko-KR')}명)`,
        changeRate: subRate,
      });
    } else if (subRate <= -config.anomalyThresholdPct) {
      anomalies.push({
        channelId: ch.channel_id,
        title: ch.title,
        type: 'SUBSCRIBER_DROP',
        message: `구독자 ${Math.abs(subRate).toFixed(1)}% 급감 (${ch.subscriber_delta.toLocaleString('ko-KR')}명)`,
        changeRate: subRate,
      });
    }

    if (viewRate >= config.viewSpikeThresholdPct) {
      anomalies.push({
        channelId: ch.channel_id,
        title: ch.title,
        type: 'VIEW_SPIKE',
        message: `조회수 ${viewRate.toFixed(1)}% 급증 (+${ch.view_delta.toLocaleString('ko-KR')}회)`,
        changeRate: viewRate,
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
      const scorePct = c.previousScore > 0
        ? ((c.currentScore - c.previousScore) / c.previousScore * 100).toFixed(1)
        : '0.0';
      const scorePctStr = (Number(scorePct) >= 0 ? '+' : '') + scorePct + '%';
      const subSign = c.subscriberDelta >= 0 ? '+' : '';
      const subRateSign = c.subscriberDeltaRate >= 0 ? '+' : '';
      lines.push(
        `${arrow} *${c.title}*: ${c.previousRank}위 → ${c.currentRank}위 (${sign}${c.delta})`,
        `   스코어: ${c.previousScore.toFixed(4)} → ${c.currentScore.toFixed(4)} (${scorePctStr})`,
        `   구독자: ${c.currentSubscribers.toLocaleString('ko-KR')}명 (${subSign}${c.subscriberDelta.toLocaleString('ko-KR')}명, ${subRateSign}${c.subscriberDeltaRate.toFixed(1)}%)`,
        `   가속도: ${c.previousAcceleration.toFixed(2)} → ${c.currentAcceleration.toFixed(2)}`,
      );
    }
  }

  if (anomalies.length > 0) {
    lines.push('\n*이상 감지*');
    for (const a of anomalies) {
      const icon = a.type === 'SUBSCRIBER_SPIKE' ? '🚀' : a.type === 'VIEW_SPIKE' ? '👀' : '⚠️';
      lines.push(`${icon} ${a.title}: ${a.message}`);
    }
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  });

  if (!res.ok) {
    console.error(`[Slack] Webhook responded with ${res.status}: ${await res.text()}`);
  }
}
