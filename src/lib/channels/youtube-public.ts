// =====================================
// YouTube Public Channel — נתונים ציבוריים על ערוץ של מישהו אחר
// משתמש ב-API key (לא OAuth)
// =====================================

import type { PublicChannelData } from './types';

export type { PublicChannelData };

const API_BASE = 'https://www.googleapis.com/youtube/v3';

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    (parseInt(m[1] ?? '0') * 3600) +
    (parseInt(m[2] ?? '0') * 60) +
    parseInt(m[3] ?? '0')
  );
}

// תומך ב-handle (@username), channel ID (UCxxxx), או full URL
function parseChannelInput(input: string): {
  handle?: string;
  id?: string;
} {
  const trimmed = input.trim();
  // URL — ננסה לחלץ
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      // /channel/UCxxx
      const idMatch = url.pathname.match(/\/channel\/(UC[\w-]+)/);
      if (idMatch) return { id: idMatch[1] };
      // /@handle או /handle
      const handleMatch = url.pathname.match(/\/(?:@)?([^/]+)/);
      if (handleMatch) return { handle: handleMatch[1].replace(/^@/, '') };
    } catch {
      /* ignore */
    }
  }
  // @handle
  if (trimmed.startsWith('@')) return { handle: trimmed.slice(1) };
  // UC channel ID
  if (/^UC[\w-]{20,}/.test(trimmed)) return { id: trimmed };
  // אחרת — נתייחס כ-handle
  return { handle: trimmed };
}

export async function fetchPublicChannel(
  input: string
): Promise<{ ok: true; data: PublicChannelData } | { ok: false; error: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ok: false, error: 'youtube_api_key_missing' };

  const parsed = parseChannelInput(input);
  if (!parsed.id && !parsed.handle) {
    return { ok: false, error: 'invalid_input' };
  }

  // שלב 1: מצא את הערוץ
  const params = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    key: apiKey,
  });
  if (parsed.id) params.set('id', parsed.id);
  else if (parsed.handle) params.set('forHandle', `@${parsed.handle}`);

  const channelRes = await fetch(
    `${API_BASE}/channels?${params}`,
    { next: { revalidate: 60 * 60 } } // 1 שעה cache
  );
  if (!channelRes.ok) {
    const text = await channelRes.text();
    console.error('[youtube.public] channel fetch failed:', channelRes.status, text.slice(0, 200));
    return { ok: false, error: 'fetch_failed' };
  }
  const channelData = await channelRes.json();
  const ch = channelData.items?.[0];
  if (!ch) return { ok: false, error: 'not_found' };

  // שלב 2: 8 הסרטונים האחרונים
  const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;
  let recentVideos: PublicChannelData['recentVideos'] = [];

  if (uploadsPlaylistId) {
    const playlistRes = await fetch(
      `${API_BASE}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=8&key=${apiKey}`,
      { next: { revalidate: 60 * 60 } }
    );
    if (playlistRes.ok) {
      const playlistData = await playlistRes.json();
      const videoIds: string[] = (playlistData.items ?? [])
        .map((it: any) => it.contentDetails?.videoId)
        .filter(Boolean);

      if (videoIds.length > 0) {
        const videosRes = await fetch(
          `${API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`,
          { next: { revalidate: 60 * 60 } }
        );
        if (videosRes.ok) {
          const videosData = await videosRes.json();
          recentVideos = (videosData.items ?? []).map((v: any) => {
            const dur = parseIsoDuration(v.contentDetails?.duration ?? 'PT0S');
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
              durationSec: dur,
              isShort: dur > 0 && dur <= 60,
            };
          });
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      id: ch.id,
      title: ch.snippet?.title ?? '',
      handle: ch.snippet?.customUrl ?? null,
      thumbnail:
        ch.snippet?.thumbnails?.medium?.url ??
        ch.snippet?.thumbnails?.default?.url ??
        null,
      description: ch.snippet?.description ?? null,
      subscribers: Number(ch.statistics?.subscriberCount ?? 0),
      totalViews: Number(ch.statistics?.viewCount ?? 0),
      totalVideos: Number(ch.statistics?.videoCount ?? 0),
      recentVideos,
    },
  };
}
