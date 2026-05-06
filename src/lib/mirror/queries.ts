import { createClient } from '@/lib/supabase/server';
import type { ContentType, IdeaTag, Tone, Platform } from '@/types';

export interface MirrorData {
  weekStart: string; // ISO date
  weekEnd: string;
  posted: PostedSummary;
  drafts: DraftItem[];
  ideasToDevelop: IdeaItem[];
  likedSwipes: LikedSwipe[];
  toneDistribution: { tone: Tone; count: number }[];
  activityHours: { hour: number; count: number }[];
  // New: weekly digest of recent uploads from the user's tracked channels
  // (pulled from tracked_channels.latest_stats.recentVideos, filtered to
  // the last 7 days). Fits the link-based pivot — replaces the OAuth-fed
  // "your own channel" feed.
  channelUploads: ChannelUploadItem[];
  hasAnyData: boolean;
}

export interface ChannelUploadItem {
  videoId: string;
  channelName: string;
  channelHandle: string | null;
  channelThumbnail: string | null;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  isShort: boolean;
}

export interface PostedSummary {
  total: number;
  byType: { type: ContentType; count: number }[];
  items: PostedItem[];
}

export interface PostedItem {
  id: string;
  type: ContentType;
  platform: Platform | null;
  title: string | null;
  tone: Tone | null;
  publishedAt: string;
}

export interface DraftItem {
  id: string;
  type: ContentType;
  title: string | null;
  createdAt: string;
}

export interface IdeaItem {
  id: string;
  content: string;
  tags: IdeaTag[];
  createdAt: string;
}

export interface LikedSwipe {
  title: string | null;
  authorName: string | null;
  thumbnail: string | null;
  category: 'videos' | 'edit_styles' | 'photos';
}

export async function fetchMirrorData(): Promise<MirrorData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 7 ימים אחורה
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = weekAgo.toISOString();
  const weekEnd = now.toISOString();

  // נריץ הכל במקביל — הביצועים מותר לסבול
  const [
    postedRes,
    draftsRes,
    ideasRes,
    likedRes,
    trackedRes,
  ] = await Promise.all([
    // פרסומים השבוע
    supabase
      .from('published_content')
      .select('id, content_type, platform, title, tone, published_at')
      .eq('user_id', user.id)
      .eq('is_draft', false)
      .gte('published_at', weekStart)
      .order('published_at', { ascending: false }),
    // טיוטות (ללא תלות בזמן)
    supabase
      .from('published_content')
      .select('id, content_type, title, created_at')
      .eq('user_id', user.id)
      .eq('is_draft', true)
      .order('created_at', { ascending: false })
      .limit(10),
    // רעיונות חדשים (לא פותחו)
    supabase
      .from('ideas')
      .select('id, content, tags, created_at')
      .eq('user_id', user.id)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(8),
    // סוויפים שאהבת — אחרונים
    supabase
      .from('swipe_items')
      .select('title, author_name, thumbnail_url, category')
      .eq('user_id', user.id)
      .eq('decision', 'liked')
      .order('decided_at', { ascending: false })
      .limit(8),
    // ערוצים במעקב — הטבלה הוסרה במיגרציה של 2026-05-05.
    // עוטפים ב-Promise.resolve כדי שלא יזרוק שגיאה. הסקציה תוצג ריקה.
    Promise.resolve({ data: [] as any[] }),
  ]);

  const postedRows = postedRes.data ?? [];
  const draftsRows = draftsRes.data ?? [];
  const ideasRows = ideasRes.data ?? [];
  const likedRows = likedRes.data ?? [];

  // אגרגציות
  const byTypeMap = new Map<ContentType, number>();
  const toneMap = new Map<Tone, number>();
  const hourMap = new Map<number, number>();

  for (const row of postedRows) {
    const type = row.content_type as ContentType;
    byTypeMap.set(type, (byTypeMap.get(type) ?? 0) + 1);
    if (row.tone) {
      const tone = row.tone as Tone;
      toneMap.set(tone, (toneMap.get(tone) ?? 0) + 1);
    }
    if (row.published_at) {
      const hour = new Date(row.published_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }
  }

  const byType = Array.from(byTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const toneDistribution = Array.from(toneMap.entries())
    .map(([tone, count]) => ({ tone, count }))
    .sort((a, b) => b.count - a.count);
  const activityHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourMap.get(hour) ?? 0,
  }));

  // אסוף את כל ה-recentVideos מערוצים במעקב, סנן ל-7 ימים אחרונים
  const trackedRows = trackedRes.data ?? [];
  const weekAgoMs = weekAgo.getTime();
  const channelUploads: ChannelUploadItem[] = [];
  for (const row of trackedRows) {
    const stats = (row.latest_stats ?? {}) as {
      recentVideos?: Array<{
        id: string;
        title: string;
        publishedAt: string;
        thumbnail: string;
        views: number;
        likes: number;
        isShort: boolean;
      }>;
    };
    for (const v of stats.recentVideos ?? []) {
      if (!v.publishedAt) continue;
      const ts = new Date(v.publishedAt).getTime();
      if (Number.isNaN(ts) || ts < weekAgoMs) continue;
      channelUploads.push({
        videoId: v.id,
        channelName: row.channel_name ?? '',
        channelHandle: row.channel_handle ?? null,
        channelThumbnail: row.channel_thumbnail ?? null,
        title: v.title,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt,
        views: v.views ?? 0,
        likes: v.likes ?? 0,
        isShort: !!v.isShort,
      });
    }
  }
  channelUploads.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Treat "has any data" as true also when the user has tracked channels —
  // even if no uploads happened this week, we want to render the section so
  // the user sees "no new uploads this week" rather than the generic empty
  // state (which would imply the feature isn't working).
  const hasAnyData =
    postedRows.length > 0 ||
    draftsRows.length > 0 ||
    ideasRows.length > 0 ||
    likedRows.length > 0 ||
    trackedRows.length > 0;

  return {
    weekStart,
    weekEnd,
    posted: {
      total: postedRows.length,
      byType,
      items: postedRows.map((r) => ({
        id: r.id,
        type: r.content_type as ContentType,
        platform: (r.platform ?? null) as Platform | null,
        title: r.title,
        tone: (r.tone ?? null) as Tone | null,
        publishedAt: r.published_at,
      })),
    },
    drafts: draftsRows.map((r) => ({
      id: r.id,
      type: r.content_type as ContentType,
      title: r.title,
      createdAt: r.created_at,
    })),
    ideasToDevelop: ideasRows.map((r) => ({
      id: r.id,
      content: r.content,
      tags: (r.tags ?? []) as IdeaTag[],
      createdAt: r.created_at,
    })),
    likedSwipes: likedRows.map((r) => ({
      title: r.title,
      authorName: r.author_name,
      thumbnail: r.thumbnail_url,
      category: r.category as 'videos' | 'edit_styles' | 'photos',
    })),
    toneDistribution,
    activityHours,
    channelUploads,
    hasAnyData,
  };
}
