// ─── Video Monitoring ────────────────────────────────────────────────────────
// Fetches recent videos per channel and their statistics.
// Quota cost: 1 (contentDetails) + N (playlistItems) + ceil(videos/50) per run.

import { google } from 'googleapis';

const youtube = google.youtube('v3');

export interface RawVideoStats {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string;  // ISO 8601
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

async function fetchUploadsPlaylistIds(
  apiKey: string,
  channelIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const res = await youtube.channels.list({
      key: apiKey,
      id: batch,
      part: ['contentDetails'],
      maxResults: 50,
    });
    for (const item of res.data.items ?? []) {
      const playlistId = item.contentDetails?.relatedPlaylists?.uploads;
      if (item.id && playlistId) map.set(item.id, playlistId);
    }
  }
  return map;
}

async function fetchRecentVideoInfos(
  apiKey: string,
  channelId: string,
  playlistId: string,
  maxResults: number
): Promise<Array<{ videoId: string; channelId: string; title: string; publishedAt: string }>> {
  const res = await youtube.playlistItems.list({
    key: apiKey,
    playlistId,
    part: ['snippet', 'contentDetails'],
    maxResults,
  });
  return (res.data.items ?? [])
    .map((item) => ({
      videoId: item.contentDetails?.videoId ?? '',
      channelId,
      title: item.snippet?.title ?? '',
      publishedAt: item.snippet?.publishedAt ?? '',
    }))
    .filter((v) => v.videoId && v.publishedAt);
}

async function fetchVideoStatsBatch(
  apiKey: string,
  videoIds: string[]
): Promise<Map<string, { viewCount: number; likeCount: number; commentCount: number }>> {
  const map = new Map<string, { viewCount: number; likeCount: number; commentCount: number }>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const res = await youtube.videos.list({
      key: apiKey,
      id: batch,
      part: ['statistics'],
    });
    for (const item of res.data.items ?? []) {
      if (!item.id) continue;
      map.set(item.id, {
        viewCount: parseInt(item.statistics?.viewCount ?? '0', 10),
        likeCount: parseInt(item.statistics?.likeCount ?? '0', 10),
        commentCount: parseInt(item.statistics?.commentCount ?? '0', 10),
      });
    }
  }
  return map;
}

/**
 * Fetches recent videos with statistics for all given channels.
 * Returns up to maxPerChannel videos per channel.
 */
export async function fetchRecentVideos(
  apiKey: string,
  channelIds: string[],
  maxPerChannel = 10
): Promise<RawVideoStats[]> {
  const playlistMap = await fetchUploadsPlaylistIds(apiKey, channelIds);
  if (playlistMap.size === 0) return [];

  const videoInfoArrays = await Promise.all(
    [...playlistMap.entries()].map(([channelId, playlistId]) =>
      fetchRecentVideoInfos(apiKey, channelId, playlistId, maxPerChannel)
        .catch((err) => {
          console.error(`[Video] Failed to fetch playlist ${playlistId}: ${err.message}`);
          return [];
        })
    )
  );

  const allInfos = videoInfoArrays.flat();
  if (allInfos.length === 0) return [];

  const statsMap = await fetchVideoStatsBatch(apiKey, allInfos.map((v) => v.videoId));

  return allInfos.map((v) => ({
    videoId: v.videoId,
    channelId: v.channelId,
    title: v.title,
    publishedAt: v.publishedAt,
    viewCount: statsMap.get(v.videoId)?.viewCount ?? 0,
    likeCount: statsMap.get(v.videoId)?.likeCount ?? 0,
    commentCount: statsMap.get(v.videoId)?.commentCount ?? 0,
  }));
}
