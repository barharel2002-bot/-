// =====================================
// שולף Open Graph metadata מקישור
// משולב עם oEmbed של TikTok (יש להם API ציבורי)
// אינסטגרם — מסתמך על OG tags בלבד (אין API חופשי)
// =====================================

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'other';

export interface FetchedMetadata {
  ok: boolean;
  platform?: Platform;
  thumbnail?: string;
  title?: string;
  authorName?: string;
  embedHtml?: string;
  error?: 'invalid_url' | 'fetch_failed' | 'no_metadata';
}

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; CreatorModeBot/1.0; +https://example.com/bot)';

// בדיקת URL — שמירה מפני SSRF בסיסית (לא localhost וכו')
export function isValidPublicUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.2') ||
      host.startsWith('172.30.') ||
      host.startsWith('172.31.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function detectPlatform(url: string): Platform {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (host.includes('tiktok.com') || host.includes('vm.tiktok.com')) return 'tiktok';
  if (host.includes('instagram.com') || host.includes('instagr.am'))
    return 'instagram';
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  return 'other';
}

// פנייה ל-oEmbed הציבורי של TikTok
async function fetchTikTokOembed(url: string): Promise<FetchedMetadata> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ok: true,
      platform: 'tiktok',
      thumbnail: data.thumbnail_url,
      title: data.title,
      authorName: data.author_name,
      embedHtml: data.html,
    };
  } catch {
    return { ok: false, error: 'fetch_failed' };
  }
}

// פנייה ל-oEmbed הציבורי של YouTube
async function fetchYouTubeOembed(url: string): Promise<FetchedMetadata> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ok: true,
      platform: 'youtube',
      thumbnail: data.thumbnail_url,
      title: data.title,
      authorName: data.author_name,
      embedHtml: data.html,
    };
  } catch {
    return { ok: false, error: 'fetch_failed' };
  }
}

// חילוץ OG meta tags מ-HTML
function extractMeta(html: string, prop: string): string | null {
  // תומך גם ב-property וגם ב-name (עם או בלי og: prefix)
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']og:${prop}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:${prop}["']`,
      'i'
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// פנייה כללית: שואב את ה-HTML של הדף, מחפש OG tags
async function fetchOgFromHtml(url: string): Promise<FetchedMetadata> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: 'fetch_failed' };
    }
    const html = await res.text();
    const thumbnail = extractMeta(html, 'image');
    const title = extractMeta(html, 'title');
    const description = extractMeta(html, 'description');
    const platform = detectPlatform(url);

    if (!thumbnail && !title) {
      return { ok: false, error: 'no_metadata' };
    }

    return {
      ok: true,
      platform,
      thumbnail: thumbnail ?? undefined,
      title: title ?? description ?? undefined,
    };
  } catch {
    return { ok: false, error: 'fetch_failed' };
  }
}

// נקודת כניסה ראשית
export async function fetchUrlMetadata(url: string): Promise<FetchedMetadata> {
  if (!isValidPublicUrl(url)) {
    return { ok: false, error: 'invalid_url' };
  }
  const platform = detectPlatform(url);

  // מיטב המאמץ — נתחיל בשירות הספציפי לפלטפורמה אם יש כזה
  if (platform === 'tiktok') {
    const r = await fetchTikTokOembed(url);
    if (r.ok) return r;
  }
  if (platform === 'youtube') {
    const r = await fetchYouTubeOembed(url);
    if (r.ok) return r;
  }

  // נפילה אחורית: OG meta tags
  return fetchOgFromHtml(url);
}
