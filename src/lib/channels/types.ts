// Types for channel connections and tracked channels — separated from server-only modules
// כך שאפשר לייבא אותם גם ב-client components

export type ConnectionPlatform = 'youtube' | 'instagram' | 'tiktok';

export interface ChannelConnection {
  id: string;
  platform: ConnectionPlatform;
  external_channel_id: string;
  channel_handle: string | null;
  channel_name: string | null;
  channel_thumbnail: string | null;
  token_expires_at: string | null;
  connected_at: string;
}

export interface TrackedChannelRow {
  id: string;
  platform: string;
  external_channel_id: string;
  channel_handle: string | null;
  channel_name: string | null;
  channel_thumbnail: string | null;
  latest_stats: any;
  latest_fetched_at: string | null;
  created_at: string;
}

export interface YouTubeRecentVideo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  durationSec: number;
  isShort: boolean;
}

export interface YouTubeAnalyticsData {
  channel: {
    id: string;
    title: string | null;
    handle: string | null;
    thumbnail: string | null;
    subscribers: number;
    totalViews: number;
    totalVideos: number;
  };
  recentVideos: YouTubeRecentVideo[];
  daily: Array<{
    date: string;
    views: number;
    watchMinutes: number;
    subscribersGained: number;
  }>;
  totals30d: {
    views: number;
    watchMinutes: number;
    subscribersGained: number;
  };
}

export interface PublicChannelData {
  id: string;
  title: string;
  handle: string | null;
  thumbnail: string | null;
  description: string | null;
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  recentVideos: YouTubeRecentVideo[];
}

// AI-generated creator insights for a channel — produced by lib/channels/insights.ts
export interface ChannelInsights {
  summary: string;
  whatsWorking: string[];
  whatToDrop: string[];
  hookPatterns: string[];
  hashtagStrategy: string[];
  contentThemes: string[];
  recommendations: string[];
  postingTime: string | null;
}

export type ChannelInsightsError =
  | 'youtube_api_key_missing'
  | 'anthropic_api_key_missing'
  | 'not_found'
  | 'invalid_input'
  | 'fetch_failed'
  | 'ai_failed'
  | 'parse_failed';

export type AnalyzeResult =
  | { ok: true; data: ChannelInsights }
  | { ok: false; error: ChannelInsightsError };
