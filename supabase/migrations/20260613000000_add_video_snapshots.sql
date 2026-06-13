-- youtube_video_snapshots: one row per video, stats updated on each run
CREATE TABLE IF NOT EXISTS youtube_video_snapshots (
  video_id          TEXT PRIMARY KEY,
  channel_id        TEXT NOT NULL,
  title             TEXT NOT NULL,
  published_at      TIMESTAMPTZ NOT NULL,
  view_count        BIGINT NOT NULL DEFAULT 0,
  like_count        BIGINT NOT NULL DEFAULT 0,
  comment_count     BIGINT NOT NULL DEFAULT 0,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hot_alert_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_snapshots_channel   ON youtube_video_snapshots(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_snapshots_published ON youtube_video_snapshots(published_at);
-- partial index for fast "unalerted recent videos" lookups
CREATE INDEX IF NOT EXISTS idx_video_snapshots_unalerted ON youtube_video_snapshots(published_at)
  WHERE hot_alert_sent_at IS NULL;

ALTER TABLE youtube_video_snapshots ENABLE ROW LEVEL SECURITY;
