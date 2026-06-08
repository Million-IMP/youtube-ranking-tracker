// ─── Layer 1: Data Collection ───────────────────────────────────────────────
// Responsibility: call YouTube Data API v3 and return raw channel statistics.
// One API call per batch of up to 50 channel IDs (quota cost: 1 unit per call).

import { google } from 'googleapis';
import { RawChannelStats, YouTubeTrackerError } from './types';

const youtube = google.youtube('v3');

/**
 * Fetches statistics for up to 50 channel IDs in a single API call.
 * YouTube allows comma-separated IDs in the `id` parameter.
 */
async function fetchBatch(
  apiKey: string,
  channelIds: string[],
  fetchedAt: string
): Promise<{ results: RawChannelStats[]; errors: YouTubeTrackerError[] }> {
  const results: RawChannelStats[] = [];
  const errors: YouTubeTrackerError[] = [];

  try {
    const response = await youtube.channels.list({
      key: apiKey,
      id: channelIds,           // up to 50 IDs per request
      part: ['snippet', 'statistics'],
      maxResults: 50,
    });

    const items = response.data.items ?? [];

    // Track which IDs returned no data → report as CHANNEL_NOT_FOUND
    const returnedIds = new Set(items.map((item) => item.id ?? ''));
    for (const id of channelIds) {
      if (!returnedIds.has(id)) {
        errors.push({
          code: 'CHANNEL_NOT_FOUND',
          channelId: id,
          message: `Channel ID "${id}" returned no data. It may be deleted or private.`,
          retryable: false,
        });
      }
    }

    for (const item of items) {
      const stats = item.statistics;
      const snippet = item.snippet;

      // hiddenSubscriberCount channels return undefined — skip them gracefully
      if (!stats || stats.hiddenSubscriberCount) continue;

      results.push({
        channelId: item.id ?? '',
        title: snippet?.title ?? 'Unknown',
        subscriberCount: parseInt(stats.subscriberCount ?? '0', 10),
        viewCount: parseInt(stats.viewCount ?? '0', 10),
        videoCount: parseInt(stats.videoCount ?? '0', 10),
        fetchedAt,
      });
    }
  } catch (err: unknown) {
    const error = err as { code?: number; errors?: Array<{ reason?: string }> };
    const reason = error.errors?.[0]?.reason ?? '';

    if (error.code === 403 && reason === 'quotaExceeded') {
      // Quota exceeded — throw immediately to stop the entire run
      // n8n: catch this in an Error node and send an alert
      throw {
        code: 'QUOTA_EXCEEDED',
        message: 'YouTube API daily quota exceeded. Retry after midnight Pacific Time.',
        retryable: true,
      } satisfies YouTubeTrackerError;
    }

    // Transient network or unknown error — mark the entire batch as failed
    for (const id of channelIds) {
      errors.push({
        code: 'NETWORK_ERROR',
        channelId: id,
        message: `Batch fetch failed: ${(err as Error).message ?? 'unknown error'}`,
        retryable: true,
      });
    }
  }

  return { results, errors };
}

/**
 * Main fetch entry point.
 * Splits channelIds into batches of 50 to stay within the API limit,
 * then collects all results and errors across batches.
 *
 * n8n Code Node usage:
 *   const apiKey = $env.YOUTUBE_API_KEY;
 *   const ids    = $input.first().json.channelIds;  // array from previous node
 *   return await fetchChannels(apiKey, ids);
 */
export async function fetchChannels(
  apiKey: string,
  channelIds: string[]
): Promise<{ results: RawChannelStats[]; errors: YouTubeTrackerError[] }> {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is required');
  if (channelIds.length === 0) return { results: [], errors: [] };

  const BATCH_SIZE = 50;
  const fetchedAt = new Date().toISOString();
  const allResults: RawChannelStats[] = [];
  const allErrors: YouTubeTrackerError[] = [];

  for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
    const batch = channelIds.slice(i, i + BATCH_SIZE);
    const { results, errors } = await fetchBatch(apiKey, batch, fetchedAt);
    allResults.push(...results);
    allErrors.push(...errors);
  }

  return { results: allResults, errors: allErrors };
}
