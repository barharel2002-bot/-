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
  // Repurposed: this is now the user's own recent uploads from the linked
  // YouTube channel — what was previously "tracked competitors" is gone.
  channelUploads: ChannelUploadItem[];
  hasAnyData: boolean;
  dominantTone: { tone: string; rationale: string } | null;
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

  // נריץ הכל במקביל
  const [videosThisWeekRes, ideasRes, likedRes, profileRes] =
    await Promise.all([
      // הסרטונים שלך השבוע — מהמטמון של YouTube
      supabase
        .from('youtube_videos')
        .select(
          'video_id, title, thumbnail_url, published_at, view_count, like_count, is_short, tone'
        )
        .eq('user_id', user.id)
        .gte('published_at', weekStart)
        .order('published_at', { ascending: false }),
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
      // פרופיל — לטון השבועי + פרטי הערוץ
      supabase
        .from('profiles')
        .select(
          'youtube_tone_cache, youtube_channel_title, youtube_channel_thumbnail'
        )
        .eq('id', user.id)
        .maybeSingle(),
    ]);

  const videoRows = videosThisWeekRes.data ?? [];
  const ideasRows = ideasRes.data ?? [];
  const likedRows = likedRes.data ?? [];
  const profile = profileRes.data ?? null;

  // אגרגציות מסרטוני YouTube
  const byTypeMap = new Map<ContentType, number>();
  const toneMap = new Map<Tone, number>();
  const hourMap = new Map<number, number>();
  for (const row of videoRows) {
    const type: ContentType = row.is_short ? 'short_video' : 'long_video';
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

  // ChannelUploadItem now = your own videos this week
  const channelUploads: ChannelUploadItem[] = videoRows.map((r: any) => ({
    videoId: r.video_id,
    channelName: profile?.youtube_channel_title ?? '',
    channelHandle: null,
    channelThumbnail: profile?.youtube_channel_thumbnail ?? null,
    title: r.title,
    thumbnail: r.thumbnail_url ?? '',
    publishedAt: r.published_at,
    views: Number(r.view_count ?? 0),
    likes: Number(r.like_count ?? 0),
    isShort: !!r.is_short,
  }));

  const dominantTone =
    (profile?.youtube_tone_cache as { tone: string; rationale: string } | null) ??
    null;

  const hasAnyData =
    videoRows.length > 0 ||
    ideasRows.length > 0 ||
    likedRows.length > 0 ||
    !!profile?.youtube_channel_title;

  return {
    weekStart,
    weekEnd,
    posted: {
      total: videoRows.length,
      byType,
      items: videoRows.map((r: any) => ({
        id: r.video_id,
        type: r.is_short ? 'short_video' : 'long_video',
        platform: null,
        title: r.title,
        tone: (r.tone ?? null) as Tone | null,
        publishedAt: r.published_at,
      })),
    },
    drafts: [], // לא רלוונטי אחרי המעבר ל-YouTube — ממשיכים מ-ideas
    ideasToDevelop: ideasRows.map((r: any) => ({
      id: r.id,
      content: r.content,
      tags: (r.tags ?? []) as IdeaTag[],
      createdAt: r.created_at,
    })),
    likedSwipes: likedRows.map((r: any) => ({
      title: r.title,
      authorName: r.author_name,
      thumbnail: r.thumbnail_url,
      category: r.category as 'videos' | 'edit_styles' | 'photos',
    })),
    toneDistribution,
    activityHours,
    channelUploads,
    hasAnyData,
    dominantTone,
  };
}
