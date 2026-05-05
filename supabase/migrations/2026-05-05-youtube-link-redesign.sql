-- ===================================================================
-- YouTube Channel Link Redesign
-- Drops the old multi-platform OAuth tables, adds a single-tenant
-- YouTube link + cache + history schema.
-- Run in Supabase SQL Editor: SQL Editor → New query → paste → Run.
-- ===================================================================

-- 1. Drop the obsolete OAuth-based tables (replaced by paste-URL design)
DROP TABLE IF EXISTS channel_connections CASCADE;
DROP TABLE IF EXISTS tracked_channels CASCADE;

-- 2. Profiles: 8 new columns (5 channel info + sync timestamp + 2 AI caches)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS youtube_channel_url         TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_id          TEXT,
  ADD COLUMN IF NOT EXISTS youtube_uploads_playlist_id TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_title       TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_thumbnail   TEXT,
  ADD COLUMN IF NOT EXISTS youtube_synced_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS youtube_tone_cache          JSONB,
  ADD COLUMN IF NOT EXISTS youtube_insights_cache      JSONB;

-- 3. Cached video table (Mirror + Analytics + Style Swipes share this)
CREATE TABLE IF NOT EXISTS youtube_videos (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id         TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  published_at     TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL,
  view_count       BIGINT NOT NULL DEFAULT 0,
  like_count       BIGINT NOT NULL DEFAULT 0,
  comment_count    BIGINT NOT NULL DEFAULT 0,
  thumbnail_url    TEXT,
  is_short         BOOLEAN NOT NULL DEFAULT FALSE,
  tone             TEXT,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS youtube_videos_user_published_idx
  ON youtube_videos (user_id, published_at DESC);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see only their videos" ON youtube_videos;
CREATE POLICY "users see only their videos" ON youtube_videos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Daily snapshots — fuels the growth-over-time chart in Analytics
CREATE TABLE IF NOT EXISTS youtube_video_stats_history (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id       TEXT NOT NULL,
  snapshot_date  DATE NOT NULL,
  view_count     BIGINT NOT NULL,
  like_count     BIGINT NOT NULL,
  comment_count  BIGINT NOT NULL,
  PRIMARY KEY (video_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS yt_stats_user_date_idx
  ON youtube_video_stats_history (user_id, snapshot_date DESC);

ALTER TABLE youtube_video_stats_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see only their history" ON youtube_video_stats_history;
CREATE POLICY "users see only their history" ON youtube_video_stats_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Style Swipes — categories the user opted into
CREATE TABLE IF NOT EXISTS shorts_categories (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL,
  PRIMARY KEY (user_id, category_id)
);
ALTER TABLE shorts_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users own their categories" ON shorts_categories;
CREATE POLICY "users own their categories" ON shorts_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Style Swipes — tracked creators the user wants to study
CREATE TABLE IF NOT EXISTS tracked_creators (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id       TEXT NOT NULL,
  channel_url      TEXT NOT NULL,
  channel_title    TEXT NOT NULL,
  uploads_playlist TEXT NOT NULL,
  thumbnail_url    TEXT,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);
ALTER TABLE tracked_creators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users own their creators" ON tracked_creators;
CREATE POLICY "users own their creators" ON tracked_creators
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Daily YouTube quota counter (singleton row per date, resets implicitly via PK)
CREATE TABLE IF NOT EXISTS youtube_quota_daily (
  date        DATE PRIMARY KEY,
  units_used  INT NOT NULL DEFAULT 0
);

-- 8. Atomic quota increment RPC (avoids read-modify-write races)
CREATE OR REPLACE FUNCTION increment_youtube_quota(p_date DATE, p_units INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO youtube_quota_daily(date, units_used)
  VALUES (p_date, p_units)
  ON CONFLICT (date) DO UPDATE
    SET units_used = youtube_quota_daily.units_used + EXCLUDED.units_used;
END;
$$ LANGUAGE plpgsql;
