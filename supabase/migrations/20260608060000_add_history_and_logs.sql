-- Phase 1: 시계열 히스토리, 실행 로그, 델타 컬럼 추가

-- 1. youtube_rankings에 델타 컬럼 추가
ALTER TABLE youtube_rankings
  ADD COLUMN IF NOT EXISTS subscriber_delta      bigint        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_delta            bigint        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscriber_delta_rate numeric(8,4)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_delta_rate       numeric(8,4)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_previous_data     boolean       NOT NULL DEFAULT false;

-- 2. 날짜별 누적 스냅샷 테이블
CREATE TABLE IF NOT EXISTS youtube_rankings_history (
  id                    bigserial     PRIMARY KEY,
  channel_id            text          NOT NULL,
  title                 text          NOT NULL,
  rank                  integer       NOT NULL,
  subscriber_count      bigint        NOT NULL DEFAULT 0,
  view_count            bigint        NOT NULL DEFAULT 0,
  video_count           integer       NOT NULL DEFAULT 0,
  acceleration          numeric(14,4) NOT NULL DEFAULT 0,
  avg_views_per_video   numeric(14,4) NOT NULL DEFAULT 0,
  score                 numeric(8,4)  NOT NULL DEFAULT 0,
  subscriber_delta      bigint        NOT NULL DEFAULT 0,
  view_delta            bigint        NOT NULL DEFAULT 0,
  subscriber_delta_rate numeric(8,4)  NOT NULL DEFAULT 0,
  view_delta_rate       numeric(8,4)  NOT NULL DEFAULT 0,
  has_previous_data     boolean       NOT NULL DEFAULT false,
  snapshot_date         date          NOT NULL DEFAULT CURRENT_DATE,
  fetched_at            timestamptz   NOT NULL DEFAULT now()
);

-- 같은 날 같은 채널 중복 방지 (재실행 시 upsert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_history_channel_date
  ON youtube_rankings_history (channel_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_history_channel_id
  ON youtube_rankings_history (channel_id);
CREATE INDEX IF NOT EXISTS idx_history_snapshot_date
  ON youtube_rankings_history (snapshot_date DESC);

ALTER TABLE youtube_rankings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON youtube_rankings_history
  FOR ALL USING (auth.role() = 'service_role');

-- 3. 실행 이력 테이블
CREATE TABLE IF NOT EXISTS run_logs (
  id            bigserial   PRIMARY KEY,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text        NOT NULL DEFAULT 'running', -- running | success | failed
  channel_count integer     NOT NULL DEFAULT 0,
  success_count integer     NOT NULL DEFAULT 0,
  error_count   integer     NOT NULL DEFAULT 0,
  error_details jsonb,
  duration_ms   integer
);

ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON run_logs
  FOR ALL USING (auth.role() = 'service_role');
