// Debug: show recent videos and threshold check
import 'dotenv/config';
import { getClient } from '../supabase';
import { config } from '../config';

async function main() {
  const cutoff = new Date(Date.now() - config.hotVideoWindowHours * 60 * 60 * 1000).toISOString();
  console.log(`Window: last ${config.hotVideoWindowHours}h (since ${cutoff})`);
  console.log(`Threshold multiplier: ${config.hotVideoThresholdMultiplier}x avg\n`);

  // All videos sorted by published_at desc
  const { data: videos } = await getClient()
    .from('youtube_video_snapshots')
    .select('video_id, channel_id, title, published_at, view_count, hot_alert_sent_at')
    .order('published_at', { ascending: false })
    .limit(20);

  const { data: rankings } = await getClient()
    .from('youtube_rankings')
    .select('channel_id, title, avg_views_per_video');

  const avgMap = new Map((rankings ?? []).map((r: any) => [r.channel_id, r.avg_views_per_video]));
  const titleMap = new Map((rankings ?? []).map((r: any) => [r.channel_id, r.title]));

  console.log('최근 20개 영상 (published_at 기준):');
  for (const v of videos ?? []) {
    const hoursAgo = ((Date.now() - new Date(v.published_at).getTime()) / (1000 * 60 * 60)).toFixed(1);
    const avg = avgMap.get(v.channel_id) ?? 0;
    const ratio = avg > 0 ? (v.view_count / avg) : 0;
    const inWindow = new Date(v.published_at) >= new Date(cutoff);
    const isHot = ratio >= config.hotVideoThresholdMultiplier;
    const flag = inWindow && isHot ? '🔥 HOT' : inWindow ? '⏱️ in-window' : '⏰ too-old';
    console.log(`${flag} | ${hoursAgo}h ago | ${(ratio * 100).toFixed(0)}% | ${v.view_count.toLocaleString()}뷰 | ${titleMap.get(v.channel_id) ?? v.channel_id} — ${v.title.slice(0, 40)}`);
  }
}

main().catch(console.error);
