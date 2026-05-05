import { createClient } from '@/lib/supabase/server';
import type { ContentType, Tone, Platform } from '@/types';

export interface PostWithMetrics {
  id: string;
  type: ContentType;
  platform: Platform | null;
  title: string | null;
  tone: Tone | null;
  publishedAt: string;
  thumbnailUrl: string | null;
  metrics: {
    views: number;
    likes: number;
    saves: number; // always 0 — not exposed by YouTube public API
    shares: number; // always 0 — not exposed by YouTube public API
    comments: number;
    avgWatchTimeSec: number | null; // always null — not exposed publicly
    recordedAt: string;
  } | null;
}

export interface AnalyticsData {
  posts: PostWithMetrics[];
  hasAnyMetrics: boolean;
  byType: { key: string; avgViews: number; postCount: number; totalEngagement: number }[];
  byTone: { key: string; avgViews: number; postCount: number; totalEngagement: number }[];
  byHour: { hour: number; avgViews: number; postCount: number }[];
  totals: { posts: number; postsWithMetrics: number; avgViews: number; totalEngagement: number };
  insights: { emoji: string; text: string }[];
  growthSeries: GrowthSeries[];
}

export interface GrowthSeries {
  videoId: string;
  title: string;
  points: { date: string; views: number }[];
}

const EMPTY: AnalyticsData = {
  posts: [],
  hasAnyMetrics: false,
  byType: [],
  byTone: [],
  byHour: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    avgViews: 0,
    postCount: 0,
  })),
  totals: { posts: 0, postsWithMetrics: 0, avgViews: 0, totalEngagement: 0 },
  insights: [],
  growthSeries: [],
};

// שולף analytics מהמטמון של YouTube — נתונים שמתעדכנים כל 24 שעות דרך syncUserYouTubeData
export async function fetchAnalytics(): Promise<AnalyticsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const [videosRes, profileRes] = await Promise.all([
    supabase
      .from('youtube_videos')
      .select(
        'video_id, title, thumbnail_url, published_at, view_count, like_count, comment_count, is_short, tone, synced_at'
      )
      .eq('user_id', user.id)
      .order('published_at', { ascending: false })
      .limit(100),
    supabase
      .from('profiles')
      .select('youtube_insights_cache')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const videos = videosRes.data ?? [];
  if (videos.length === 0) return EMPTY;

  const enriched: PostWithMetrics[] = videos.map((v: any) => ({
    id: v.video_id,
    type: v.is_short ? 'short_video' : 'long_video',
    platform: null,
    title: v.title,
    tone: (v.tone ?? null) as Tone | null,
    publishedAt: v.published_at,
    thumbnailUrl: v.thumbnail_url ?? null,
    metrics: {
      views: Number(v.view_count ?? 0),
      likes: Number(v.like_count ?? 0),
      saves: 0,
      shares: 0,
      comments: Number(v.comment_count ?? 0),
      avgWatchTimeSec: null,
      recordedAt: v.synced_at,
    },
  }));

  // Aggregations
  const typeMap = new Map<string, { totalViews: number; totalEng: number; count: number }>();
  const toneMap = new Map<string, { totalViews: number; totalEng: number; count: number }>();
  const hourMap = new Map<number, { totalViews: number; count: number }>();

  let totalViews = 0;
  let totalEngagement = 0;

  for (const post of enriched) {
    if (!post.metrics) continue;
    const eng = post.metrics.likes + post.metrics.comments;
    totalViews += post.metrics.views;
    totalEngagement += eng;

    const tBucket = typeMap.get(post.type) ?? { totalViews: 0, totalEng: 0, count: 0 };
    tBucket.totalViews += post.metrics.views;
    tBucket.totalEng += eng;
    tBucket.count++;
    typeMap.set(post.type, tBucket);

    if (post.tone) {
      const toneBucket = toneMap.get(post.tone) ?? { totalViews: 0, totalEng: 0, count: 0 };
      toneBucket.totalViews += post.metrics.views;
      toneBucket.totalEng += eng;
      toneBucket.count++;
      toneMap.set(post.tone, toneBucket);
    }

    const hour = new Date(post.publishedAt).getHours();
    const hourBucket = hourMap.get(hour) ?? { totalViews: 0, count: 0 };
    hourBucket.totalViews += post.metrics.views;
    hourBucket.count++;
    hourMap.set(hour, hourBucket);
  }

  const byType = Array.from(typeMap.entries())
    .map(([key, v]) => ({
      key,
      avgViews: Math.round(v.totalViews / v.count),
      postCount: v.count,
      totalEngagement: v.totalEng,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const byTone = Array.from(toneMap.entries())
    .map(([key, v]) => ({
      key,
      avgViews: Math.round(v.totalViews / v.count),
      postCount: v.count,
      totalEngagement: v.totalEng,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const v = hourMap.get(hour);
    return {
      hour,
      avgViews: v ? Math.round(v.totalViews / v.count) : 0,
      postCount: v?.count ?? 0,
    };
  });

  // Growth-over-time: top 5 videos by views, last 30 days of snapshots
  const top5Ids = [...enriched]
    .sort((a, b) => (b.metrics?.views ?? 0) - (a.metrics?.views ?? 0))
    .slice(0, 5)
    .map((p) => p.id);

  let growthSeries: GrowthSeries[] = [];
  if (top5Ids.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: history } = await supabase
      .from('youtube_video_stats_history')
      .select('video_id, snapshot_date, view_count')
      .eq('user_id', user.id)
      .in('video_id', top5Ids)
      .gte('snapshot_date', thirtyDaysAgo)
      .order('snapshot_date', { ascending: true });

    const byVideo = new Map<string, { date: string; views: number }[]>();
    for (const h of history ?? []) {
      const arr = byVideo.get(h.video_id) ?? [];
      arr.push({ date: h.snapshot_date, views: Number(h.view_count) });
      byVideo.set(h.video_id, arr);
    }
    growthSeries = top5Ids.map((id) => {
      const post = enriched.find((p) => p.id === id);
      return {
        videoId: id,
        title: post?.title ?? '',
        points: byVideo.get(id) ?? [],
      };
    });
  }

  const insights = (profileRes.data?.youtube_insights_cache as any[]) ?? [];

  return {
    posts: enriched,
    hasAnyMetrics: enriched.length > 0,
    byType,
    byTone,
    byHour,
    totals: {
      posts: enriched.length,
      postsWithMetrics: enriched.length,
      avgViews:
        enriched.length > 0 ? Math.round(totalViews / enriched.length) : 0,
      totalEngagement,
    },
    insights,
    growthSeries,
  };
}
