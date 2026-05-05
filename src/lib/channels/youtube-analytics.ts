// =====================================
// YouTube Analytics — נתונים אמיתיים של הערוץ של המשתמש
// קורא ל-YouTube Data API + YouTube Analytics API עם access_token
// =====================================

import { createClient } from '@/lib/supabase/server';
import { refreshYouTubeAccessToken } from '@/lib/oauth/youtube';
import type { YouTubeAnalyticsData } from './types';

export type { YouTubeAnalyticsData };

// מחזיר access_token תקף — רענן אם צריך
async function getValidAccessToken(): Promise<{
  accessToken: string;
  channelId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('channel_connections')
    .select('access_token, refresh_token, token_expires_at, external_channel_id')
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .maybeSingle();

  if (!data) return null;

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at) : null;
  const needsRefresh =
    !expiresAt || expiresAt.getTime() - Date.now() < 60_000; // 1 דקה buffer

  if (needsRefresh && data.refresh_token) {
    try {
      const refreshed = await refreshYouTubeAccessToken(data.refresh_token);
      const newExpiresAt = new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString();
      await supabase
        .from('channel_connections')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', 'youtube');
      return {
        accessToken: refreshed.access_token,
        channelId: data.external_channel_id,
      };
    } catch (err) {
      console.error('[youtube.refresh] failed:', err);
      return null;
    }
  }

  return {
    accessToken: data.access_token,
    channelId: data.external_channel_id,
  };
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    (parseInt(m[1] ?? '0') * 3600) +
    (parseInt(m[2] ?? '0') * 60) +
    parseInt(m[3] ?? '0')
  );
}

// שולף נתונים מלאים על הערוץ של המשתמש
export async function fetchOwnYouTubeAnalytics(): Promise<YouTubeAnalyticsData | null> {
  const auth = await getValidAccessToken();
  if (!auth) return null;
  const { accessToken, channelId } = auth;

  // 1. נתוני ערוץ + סטטיסטיקות כלליות
  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!channelRes.ok) return null;
  const channelData = await channelRes.json();
  const ch = channelData.items?.[0];
  if (!ch) return null;

  // 2. 12 הסרטונים האחרונים — search.list
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=id&forMine=true&type=video&order=date&maxResults=12`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const videoIds: string[] = (searchData.items ?? [])
    .map((it: any) => it.id?.videoId)
    .filter(Boolean);

  // 3. פרטי הסרטונים — videos.list
  let videos: YouTubeAnalyticsData['recentVideos'] = [];
  if (videoIds.length > 0) {
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (videosRes.ok) {
      const videosData = await videosRes.json();
      videos = (videosData.items ?? []).map((v: any) => {
        const durationSec = parseIsoDuration(v.contentDetails?.duration ?? 'PT0S');
        return {
          id: v.id,
          title: v.snippet?.title ?? '',
          publishedAt: v.snippet?.publishedAt ?? '',
          thumbnail:
            v.snippet?.thumbnails?.medium?.url ??
            v.snippet?.thumbnails?.default?.url ??
            '',
          views: Number(v.statistics?.viewCount ?? 0),
          likes: Number(v.statistics?.likeCount ?? 0),
          comments: Number(v.statistics?.commentCount ?? 0),
          durationSec,
          isShort: durationSec > 0 && durationSec <= 60,
        };
      });
    }
  }

  // 4. נתוני 30 ימים מ-Analytics API
  const today = new Date();
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const analyticsUrl = new URL(
    'https://youtubeanalytics.googleapis.com/v2/reports'
  );
  analyticsUrl.searchParams.set('ids', 'channel==MINE');
  analyticsUrl.searchParams.set('startDate', fmt(startDate));
  analyticsUrl.searchParams.set('endDate', fmt(today));
  analyticsUrl.searchParams.set(
    'metrics',
    'views,estimatedMinutesWatched,subscribersGained'
  );
  analyticsUrl.searchParams.set('dimensions', 'day');
  analyticsUrl.searchParams.set('sort', 'day');

  const analyticsRes = await fetch(analyticsUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let daily: YouTubeAnalyticsData['daily'] = [];
  let totals30d = { views: 0, watchMinutes: 0, subscribersGained: 0 };
  if (analyticsRes.ok) {
    const aData = await analyticsRes.json();
    const rows: any[][] = aData.rows ?? [];
    for (const row of rows) {
      const [date, views, minutes, subs] = row;
      daily.push({
        date,
        views: Number(views ?? 0),
        watchMinutes: Number(minutes ?? 0),
        subscribersGained: Number(subs ?? 0),
      });
      totals30d.views += Number(views ?? 0);
      totals30d.watchMinutes += Number(minutes ?? 0);
      totals30d.subscribersGained += Number(subs ?? 0);
    }
  }

  return {
    channel: {
      id: ch.id,
      title: ch.snippet?.title ?? null,
      handle: ch.snippet?.customUrl ?? null,
      thumbnail: ch.snippet?.thumbnails?.medium?.url ?? null,
      subscribers: Number(ch.statistics?.subscriberCount ?? 0),
      totalViews: Number(ch.statistics?.viewCount ?? 0),
      totalVideos: Number(ch.statistics?.videoCount ?? 0),
    },
    recentVideos: videos,
    daily,
    totals30d,
  };
}
