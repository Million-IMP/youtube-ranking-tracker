# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build        # TypeScript → dist/
npm run dev          # CLI 실행 (ts-node, .env 필요)
npm start            # CLI 실행 (컴파일된 dist/)
npm run api          # REST API 서버 기동 (port 3000)
npm run api:dev      # REST API 서버 기동 (ts-node)
```

**Supabase 마이그레이션:**
```bash
supabase link --project-ref <ref>   # 최초 1회
supabase db push                    # 마이그레이션 적용
```
`supabase db push`는 `SUPABASE_ACCESS_TOKEN` 환경 변수(개인 액세스 토큰)가 필요하다. `.env`의 `SUPABASE_SERVICE_ROLE_KEY`와 다른 값이다.

## Architecture

### 실행 파이프라인 (`src/index.ts` → `runTracker()`)

```
fetchChannels()       → RawChannelStats[]
enrichWithDeltas()    → EnrichedChannelStats[]   (이전 스냅샷과 비교해 Δ 계산)
scoreChannels()       → ScoredChannel[]           (min-max 정규화 후 가중치 합산)
formatOutput()        → RankedChannelRecord[]     (snake_case, DB 저장 형태)
  ├── upsertRankings()      → youtube_rankings (최신 스냅샷 유지)
  ├── insertHistoryBatch()  → youtube_rankings_history (날짜별 누적)
  └── sendSlackAlert()      → Slack Webhook (비동기, 실패해도 런 미중단)
```

두 개의 엔트리포인트:
- `src/index.ts` — CLI + `runTracker()` 라이브러리 함수 (exported)
- `src/server.ts` — Hono HTTP 서버 (`src/api.ts` 라우터 마운트)

### 스코어링 모드 자동 전환

`src/scoring.ts`는 이전 히스토리 유무에 따라 가중치 프리셋을 자동 선택한다:
- **3-metric** (첫 실행, 히스토리 없음): `acceleration 0.50 + avgViews 0.30 + subscribers 0.20`
- **5-metric** (히스토리 존재): `acceleration 0.35 + avgViews 0.20 + subscribers 0.15 + subscriberDelta 0.20 + viewDelta 0.10`

모든 지표는 **min-max 정규화** 후 합산하므로 채널 규모가 달라도 공정하게 비교된다.

### 채널 설정 우선순위

`loadChannelIds()` 함수가 아래 순서로 채널 ID를 로드한다:
1. `runTracker(channelIds)` 인자 직접 전달
2. `CHANNEL_IDS` 환경 변수 (쉼표 구분)
3. `channels.json` → `groups` 객체의 모든 그룹 flatten

### Supabase 테이블 구조 (3개)

| 테이블 | 역할 | 주요 키 |
|--------|------|---------|
| `youtube_rankings` | 최신 스냅샷 (upsert) | `channel_id` PK |
| `youtube_rankings_history` | 날짜별 누적 | `(channel_id, snapshot_date)` UNIQUE |
| `run_logs` | 실행 이력/관찰성 | `id` PK |

RLS가 활성화되어 있고, `service_role` 키로만 쓰기 가능하다. `SUPABASE_SERVICE_ROLE_KEY`를 사용해야 하며 `anon` 키로는 쓰기가 거부된다.

### REST API 엔드포인트 (`src/api.ts`)

```
GET  /api/rankings
GET  /api/rankings/:channelId
GET  /api/channels/:id/history?days=30
GET  /api/stats/growth?top=3
GET  /api/channels/:id/trend?metric=subscriber_count&days=30
POST /api/rankings/refresh          ← X-Api-Key 헤더 필요 (API_SECRET_KEY)
```

### 에러 처리 규칙

- **QUOTA_EXCEEDED**: `throw`해서 전체 실행 중단. GitHub Actions에서 실패로 기록됨.
- **CHANNEL_NOT_FOUND**: 에러 배열에 수집, 나머지 채널은 계속 처리.
- **Slack/RunLog 실패**: `.catch(() => {})` — 부가 기능 실패가 메인 파이프라인을 막지 않음.

## 환경 변수

| 변수 | 용도 |
|------|------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서버 사이드 쓰기 |
| `SUPABASE_ACCESS_TOKEN` | CLI `db push` 전용 (개인 토큰) |
| `SLACK_WEBHOOK_URL` | 순위 변동/이상 감지 알림 (선택) |
| `API_SECRET_KEY` | `POST /api/rankings/refresh` 인증 (선택) |
| `PORT` | API 서버 포트 (기본 3000) |

`SUPABASE_URL`이 없으면 Supabase 저장을 자동 skip한다 (`shouldSave` 플래그).

## GitHub Actions

`.github/workflows/tracker.yml` — 매일 01:00 UTC (10:00 KST) 자동 실행. `workflow_dispatch`로 수동 트리거 가능. 필요한 Secrets: `YOUTUBE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_WEBHOOK_URL`.
