// Slack hot-video alert format test (synthetic data).
// Run: npx ts-node src/scripts/test-video-alert.ts

import 'dotenv/config';
import { sendSlackVideoAlert } from '../alert';
import { HotVideoAlert } from '../types';

async function main() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) { console.error('❌ SLACK_WEBHOOK_URL not set'); process.exit(1); }

  const now = Date.now();
  const testAlerts: HotVideoAlert[] = [
    {
      videoId: 'dQw4w9WgXcQ',
      channelId: 'UC_test1',
      channelTitle: '흑자헬스 SurplusHealth',
      videoTitle: '[벤치마킹 테스트] 체지방 빠지는 최강 루틴 공개',
      publishedAt: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      viewCount: 87_000,
      likeCount: 4_200,
      channelAvgViews: 210_000,
      viewRatioToAvg: 87_000 / 210_000,
      hoursSincePublished: 18,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      videoId: 'abc123xyz',
      channelId: 'UC_test2',
      channelTitle: '피지컬갤러리',
      videoTitle: '[벤치마킹 테스트] 구독자 300만 기념 비하인드',
      publishedAt: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
      viewCount: 450_000,
      likeCount: 19_800,
      channelAvgViews: 1_040_000,
      viewRatioToAvg: 450_000 / 1_040_000,
      hoursSincePublished: 36,
      videoUrl: 'https://www.youtube.com/watch?v=abc123xyz',
    },
  ];

  console.log('전송할 테스트 알림:');
  testAlerts.forEach((v) =>
    console.log(`  • ${v.channelTitle}: "${v.videoTitle}" ${v.viewCount.toLocaleString()}뷰 (평균의 ${(v.viewRatioToAvg * 100).toFixed(0)}%, ${v.hoursSincePublished}h)`)
  );

  await sendSlackVideoAlert(testAlerts, webhookUrl);
  console.log('✅ Slack 전송 완료 — 슬랙 채널에서 메시지를 확인하세요');
}

main().catch((err) => { console.error('[FATAL]', err); process.exit(1); });
