-- Migration: channel_connections + tracked_channels
-- הרץ את הסקריפט הזה ב-Supabase SQL Editor כדי להוסיף תמיכה ב-OAuth של ערוצים + ניתוח מתחרים

CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  external_channel_id TEXT NOT NULL,
  channel_handle TEXT,
  channel_name TEXT,
  channel_thumbnail TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS tracked_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  external_channel_id TEXT NOT NULL,
  channel_handle TEXT,
  channel_name TEXT,
  channel_thumbnail TEXT,
  latest_stats JSONB,
  latest_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, external_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_user ON channel_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_channels_user ON tracked_channels(user_id);

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own channel_connections" ON channel_connections;
CREATE POLICY "Users manage own channel_connections" ON channel_connections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own tracked_channels" ON tracked_channels;
CREATE POLICY "Users manage own tracked_channels" ON tracked_channels FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
