// ─── Centralized Configuration ────────────────────────────────────────────────
// All tunable constants in one place. Override via environment variables.

import { ScoringWeights } from './types';

export const config = {
  // Alert thresholds
  rankChangeThreshold: Number(process.env.RANK_CHANGE_THRESHOLD ?? 2),
  anomalyThresholdPct: Number(process.env.ANOMALY_THRESHOLD_PCT ?? 20),
  viewSpikeThresholdPct: Number(process.env.VIEW_SPIKE_THRESHOLD_PCT ?? 30),

  // History
  historyRetentionDays: Number(process.env.HISTORY_RETENTION_DAYS ?? 90),
  defaultHistoryDays: Number(process.env.DEFAULT_HISTORY_DAYS ?? 30),

  // Video monitoring
  // hotVideoWindowHours: 1일 1회 스케줄 실행 + GitHub Actions 4~5h 지연을 감안.
  //   48h 윈도우는 "업로드 직후 실행" 시 다음 체크가 72h에 오면 놓침.
  //   96h(4일)로 확장 → 최대 2번 체크 기회 확보. 벤치마킹은 실시간 불필요.
  hotVideoWindowHours: Number(process.env.HOT_VIDEO_WINDOW_HOURS ?? 96),
  // hotVideoThresholdMultiplier: YouTube 영상은 96h 내 lifetime views의 약 35~40% 획득.
  //   0.15 = avg의 15% → 96h 정상 페이스(35%)의 약 0.43배.
  //   즉 "평균적인 성과의 절반도 안 나오면 패스, 절반 이상 나오면 알림"
  //   실측 데이터: 흑자헬스 '침팬지' 33h만에 avg 13% → 96h 지나면 ~20% 예상 → 감지.
  hotVideoThresholdMultiplier: Number(process.env.HOT_VIDEO_THRESHOLD_MULTIPLIER ?? 0.15),
  videoCheckMaxPerChannel: Number(process.env.VIDEO_CHECK_MAX_PER_CHANNEL ?? 10),

  // Scoring weight presets
  weightsNoDelta: {
    acceleration: 0.50,
    avgViews: 0.30,
    subscribers: 0.20,
    subscriberDelta: 0,
    viewDelta: 0,
  } as ScoringWeights,

  weightsWithDelta: {
    acceleration: 0.35,
    avgViews: 0.20,
    subscribers: 0.15,
    subscriberDelta: 0.20,
    viewDelta: 0.10,
  } as ScoringWeights,
};
