// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Pipeline: Fetch → Delta → Score → Format → Supabase (Rankings + History) + Alert

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fetchChannels } from './fetch';
import { enrichWithDeltas } from './delta';
import { scoreChannels } from './scoring';
import { formatOutput } from './format';
import { upsertRankings, fetchRankings, upsertVideoSnapshots, fetchUnalertedRecentVideos, markVideosAsAlerted } from './supabase';
import { fetchLatestSnapshots, insertHistoryBatch, cleanupOldHistory } from './history';
import { createRunLog, completeRunLog } from './runlog';
import { detectRankChanges, detectAnomalies, sendSlackAlert, detectHotVideos, sendSlackVideoAlert } from './alert';
import { fetchRecentVideos } from './video';
import { RankedChannelRecord, ScoringWeights, YouTubeTrackerError } from './types';
import { config } from './config';

export interface ChannelGroup {
  name: string;
  channelIds: string[];
}

export interface TrackerResult {
  rankings: RankedChannelRecord[];
  errors: YouTubeTrackerError[];
  meta: {
    total: number;
    successful: number;
    failed: number;
    savedToSupabase: boolean;
    hasDelta: boolean;
    generatedAt: string;
  };
}

/** Loads channel IDs: direct arg → env variable → channels.json groups (flattened) */
function loadChannelIds(override?: string[]): string[] {
  if (override && override.length > 0) return override;

  const envIds = process.env.CHANNEL_IDS;
  if (envIds) return envIds.split(',').map((s) => s.trim()).filter(Boolean);

  const configPath = path.resolve(process.cwd(), 'channels.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      groups?: Record<string, ChannelGroup>;
      channelIds?: string[];
    };

    // Flatten all groups
    if (config.groups) {
      const ids = Object.values(config.groups).flatMap((g) => g.channelIds);
      if (ids.length > 0) return ids;
    }
    if (config.channelIds && config.channelIds.length > 0) return config.channelIds;
  }

  throw new Error('No channel IDs found. Edit channels.json or set CHANNEL_IDS env variable.');
}

export async function runTracker(
  channelIds?: string[],
  weights?: Partial<ScoringWeights>,
  save?: boolean
): Promise<TrackerResult> {
  const apiKey = process.env.YOUTUBE_API_KEY ?? '';
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set in .env');

  const ids = loadChannelIds(channelIds);
  const startedAt = Date.now();
  const shouldSave = save ?? !!process.env.SUPABASE_URL;

  let runLogId: number | null = null;
  if (shouldSave) {
    try { runLogId = await createRunLog(ids.length); } catch { /* non-fatal */ }
  }

  // Layer 1: Fetch
  const { results: rawStats, errors } = await fetchChannels(apiKey, ids);

  // Layer 2: Delta — fetch previous snapshots, compute growth rates
  const previousMap = shouldSave
    ? await fetchLatestSnapshots(ids).catch(() => new Map())
    : new Map();
  const enriched = enrichWithDeltas(rawStats, previousMap);

  // Layer 3: Score
  const scored = scoreChannels(enriched, weights);

  // Layer 4: Format
  const rankings = formatOutput(scored);

  let savedToSupabase = false;

  if (shouldSave && rankings.length > 0) {
    // Upsert current rankings + append to history (parallel)
    await Promise.all([
      upsertRankings(rankings),
      insertHistoryBatch(rankings),
      cleanupOldHistory(config.historyRetentionDays),
    ]);
    savedToSupabase = true;

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    // Slack alerts — rank changes & anomalies (non-blocking)
    if (webhookUrl) {
      const changes = detectRankChanges(rankings, previousMap);
      const anomalies = detectAnomalies(rankings, previousMap);
      sendSlackAlert(changes, anomalies, webhookUrl).catch(() => {});
    }

    // Video monitoring — detect hot new videos
    const channelAvgMap = new Map(rankings.map((r) => [r.channel_id, r.avg_views_per_video]));
    const channelTitleMap = new Map(rankings.map((r) => [r.channel_id, r.title]));
    try {
      const rawVideos = await fetchRecentVideos(apiKey, ids, config.videoCheckMaxPerChannel);
      if (rawVideos.length > 0) {
        await upsertVideoSnapshots(rawVideos.map((v) => ({
          video_id: v.videoId,
          channel_id: v.channelId,
          title: v.title,
          published_at: v.publishedAt,
          view_count: v.viewCount,
          like_count: v.likeCount,
          comment_count: v.commentCount,
        })));
        const unalerted = await fetchUnalertedRecentVideos(ids, config.hotVideoWindowHours);
        const hotVideos = detectHotVideos(unalerted, channelAvgMap, channelTitleMap);
        console.log(`[Video] ${rawVideos.length} videos synced, ${hotVideos.length} hot`);
        if (hotVideos.length > 0) {
          if (webhookUrl) {
            await sendSlackVideoAlert(hotVideos, webhookUrl).catch((err) =>
              console.error('[Video] Slack alert error:', (err as Error).message)
            );
          }
          await markVideosAsAlerted(hotVideos.map((v) => v.videoId));
        }
      }
    } catch (err) {
      console.error('[Video] monitoring error:', (err as Error).message);
    }
  }

  if (runLogId !== null) {
    completeRunLog(runLogId, startedAt, rankings.length, errors.length,
      errors.length > 0 ? errors : undefined).catch(() => {});
  }

  const hasDelta = enriched.some((c) => c.hasPreviousData);

  return {
    rankings,
    errors,
    meta: { total: ids.length, successful: rankings.length, failed: errors.length, savedToSupabase, hasDelta, generatedAt: new Date().toISOString() },
  };
}

// ─── CLI Runner ───────────────────────────────────────────────────────────────

async function main() {
  try {
    const result = await runTracker();
    const scoreMode = result.meta.hasDelta ? '5-metric (delta)' : '3-metric (static)';

    console.log(`\n=== YouTube Ranking Results [${scoreMode}] ===`);
    console.table(
      result.rankings.map((r) => ({
        Rank: r.rank,
        Title: r.title.slice(0, 24).padEnd(24),
        Subscribers: r.subscriber_count.toLocaleString(),
        'Δ Sub': r.has_previous_data ? (r.subscriber_delta >= 0 ? '+' : '') + r.subscriber_delta.toLocaleString() : '-',
        'Δ %': r.has_previous_data ? (r.subscriber_delta_rate >= 0 ? '+' : '') + r.subscriber_delta_rate.toFixed(2) + '%' : '-',
        Score: r.score.toFixed(4),
      }))
    );

    if (result.errors.length > 0) {
      console.warn('\n=== Channel Errors ===');
      result.errors.forEach((e) => console.warn(`  [${e.code}] ${e.channelId}: ${e.message}`));
    }

    console.log('\nMeta:', JSON.stringify(result.meta, null, 2));
  } catch (err: unknown) {
    const trackerError = err as YouTubeTrackerError;
    if (trackerError.code === 'QUOTA_EXCEEDED') {
      console.error('[FATAL] YouTube API quota exceeded. Retry after midnight Pacific Time.');
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  main().catch((err) => { console.error('[FATAL]', err); process.exit(1); });
}
