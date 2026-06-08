-- YouTube 랭킹 스냅샷 테이블
-- channel_id를 PK로 사용하여 매 실행마다 최신값으로 upsert됨
CREATE TABLE IF NOT EXISTS youtube_rankings (
  rank                integer        NOT NULL,
  channel_id          text           PRIMARY KEY,
  title               text           NOT NULL,
  subscriber_count    bigint         NOT NULL DEFAULT 0,
  view_count          bigint         NOT NULL DEFAULT 0,
  video_count         integer        NOT NULL DEFAULT 0,
  acceleration        numeric(14,4)  NOT NULL DEFAULT 0,
  avg_views_per_video numeric(14,4)  NOT NULL DEFAULT 0,
  score               numeric(8,4)   NOT NULL DEFAULT 0,
  fetched_at          timestamptz    NOT NULL DEFAULT now()
);

-- 랭킹 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_youtube_rankings_rank    ON youtube_rankings (rank);
CREATE INDEX IF NOT EXISTS idx_youtube_rankings_score   ON youtube_rankings (score DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_rankings_fetched ON youtube_rankings (fetched_at DESC);

-- Row Level Security (Supabase 기본값 활성화)
ALTER TABLE youtube_rankings ENABLE ROW LEVEL SECURITY;

-- service_role 키로 insert/update 허용 (백엔드 전용)
CREATE POLICY "service role full access"
  ON youtube_rankings
  FOR ALL
  USING (auth.role() = 'service_role');
