// =============================
// YouTube Data API v3 — חיפוש סרטונים
// משתמש ב-Next.js fetch cache (revalidate=86400)
// כדי לא לבזבז quota על אותן שאילתות
// =============================

import type { LearnCategory } from '@/config/creators.config';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_REVALIDATE_SECONDS = 60 * 60 * 24; // 24 שעות

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  duration: string | null; // ISO 8601 (PT1M30S)
  durationSeconds: number;
  viewCount: number | null;
  isShort: boolean;
}

interface SearchOptions {
  maxResults?: number;
  videoDuration?: 'short' | 'medium' | 'long' | 'any';
}

// המרת ISO 8601 duration לשניות
export function parseDurationToSeconds(iso: string | null | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    (parseInt(m[1] ?? '0') * 3600) +
    (parseInt(m[2] ?? '0') * 60) +
    parseInt(m[3] ?? '0')
  );
}

// פורמט קריא: "12:34" או "1:23:45"
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function searchOne(
  query: string,
  options: SearchOptions
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');

  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(options.maxResults ?? 8),
    key: apiKey,
  });
  if (options.videoDuration && options.videoDuration !== 'any') {
    searchParams.set('videoDuration', options.videoDuration);
  }

  // שלב 1: חיפוש
  const searchRes = await fetch(`${API_BASE}/search?${searchParams}`, {
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
  });
  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`YouTube search failed: ${searchRes.status} ${text.slice(0, 200)}`);
  }
  const searchData = await searchRes.json();

  const videoIds: string[] = (searchData.items ?? [])
    .map((it: any) => it?.id?.videoId)
    .filter((id: string | undefined): id is string => !!id);
  if (videoIds.length === 0) return [];

  // שלב 2: פרטים נוספים (משך, סטטיסטיקות)
  const detailParams = new URLSearchParams({
    part: 'contentDetails,statistics',
    id: videoIds.join(','),
    key: apiKey,
  });
  const detailRes = await fetch(`${API_BASE}/videos?${detailParams}`, {
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
  });
  if (!detailRes.ok) return [];
  const detailData = await detailRes.json();

  const detailMap = new Map<string, any>();
  for (const item of detailData.items ?? []) {
    detailMap.set(item.id, item);
  }

  return (searchData.items ?? [])
    .filter((it: any) => it?.id?.videoId)
    .map((it: any): YouTubeVideo => {
      const id: string = it.id.videoId;
      const details = detailMap.get(id);
      const duration: string | null = details?.contentDetails?.duration ?? null;
      const durationSec = parseDurationToSeconds(duration);
      const isShort = durationSec > 0 && durationSec <= 60;
      const viewCount = details?.statistics?.viewCount
        ? Number(details.statistics.viewCount)
        : null;
      return {
        id,
        title: it.snippet?.title ?? '',
        channelTitle: it.snippet?.channelTitle ?? '',
        thumbnail:
          it.snippet?.thumbnails?.high?.url ??
          it.snippet?.thumbnails?.medium?.url ??
          '',
        publishedAt: it.snippet?.publishedAt ?? '',
        duration,
        durationSeconds: durationSec,
        viewCount,
        isShort,
      };
    });
}

// dedup לפי id (אם 2 שאילתות החזירו את אותו סרטון)
function dedupVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  const seen = new Set<string>();
  const out: YouTubeVideo[] = [];
  for (const v of videos) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out;
}

// נקודת כניסה ראשית — חיפוש לקטגוריה
// משלב Shorts וסרטונים ארוכים ב-50/50
export async function fetchLearnVideos(
  searchQueries: string[]
): Promise<{ ok: true; videos: YouTubeVideo[] } | { ok: false; error: string }> {
  if (!process.env.YOUTUBE_API_KEY) {
    return { ok: false, error: 'YOUTUBE_API_KEY missing' };
  }
  if (searchQueries.length === 0) {
    return { ok: true, videos: [] };
  }

  try {
    // בכל שאילתה: 4 קצרים + 4 ארוכים, ואז dedup
    const allVideos: YouTubeVideo[] = [];
    for (const q of searchQueries) {
      const [shorts, longs] = await Promise.all([
        searchOne(q, { maxResults: 4, videoDuration: 'short' }),
        searchOne(q, { maxResults: 4, videoDuration: 'long' }),
      ]);
      // ערבוב — short, long, short, long...
      const interleaved: YouTubeVideo[] = [];
      const max = Math.max(shorts.length, longs.length);
      for (let i = 0; i < max; i++) {
        if (shorts[i]) interleaved.push(shorts[i]);
        if (longs[i]) interleaved.push(longs[i]);
      }
      allVideos.push(...interleaved);
    }

    return { ok: true, videos: dedupVideos(allVideos) };
  } catch (err: any) {
    console.error('[youtube] fetch failed:', err.message);
    return { ok: false, error: err.message };
  }
}
