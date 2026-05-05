import { createClient } from '@/lib/supabase/server';
import type { ContentType, Tone, Platform } from '@/types';

export interface PostWithMetrics {
  id: string;
  type: ContentType;
  platform: Platform | null;
  title: string | null;
  tone: Tone | null;
  publishedAt: string;
  metrics: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
    comments: number;
    avgWatchTimeSec: number | null;
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
}

// שולף את כל הפרסומים (לא טיוטות) עם המדדים האחרונים שלהם
export async function fetchAnalytics(): Promise<AnalyticsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return EMPTY;
  }

  // join published_content + content_metrics (דרך 2 שאילתות)
  const { data: posts } = await supabase
    .from('published_content')
    .select('id, content_type, platform, title, tone, published_at')
    .eq('user_id', user.id)
    .eq('is_draft', false)
    .order('published_at', { ascending: false })
    .limit(100);

  if (!posts || posts.length === 0) return EMPTY;

  const ids = posts.map((p) => p.id);
  const { data: metrics } = await supabase
    .from('content_metrics')
    .select('*')
    .in('content_id', ids)
    .order('recorded_at', { ascending: false });

  // לכל פוסט — קח את הרשומה המאוחרת ביותר
  const metricsByPost = new Map<string, any>();
  for (const m of metrics ?? []) {
    if (!metricsByPost.has(m.content_id)) {
      metricsByPost.set(m.content_id, m);
    }
  }

  const enriched: PostWithMetrics[] = posts.map((p) => {
    const m = metricsByPost.get(p.id);
    return {
      id: p.id,
      type: p.content_type as ContentType,
      platform: (p.platform ?? null) as Platform | null,
      title: p.title,
      tone: (p.tone ?? null) as Tone | null,
      publishedAt: p.published_at,
      metrics: m
        ? {
            views: m.views ?? 0,
            likes: m.likes ?? 0,
            saves: m.saves ?? 0,
            shares: m.shares ?? 0,
            comments: m.comments ?? 0,
            avgWatchTimeSec: m.avg_watch_time_seconds ?? null,
            recordedAt: m.recorded_at,
          }
        : null,
    };
  });

  // אגרגציות: byType, byTone, byHour
  const typeMap = new Map<string, { totalViews: number; totalEng: number; count: number }>();
  const toneMap = new Map<string, { totalViews: number; totalEng: number; count: number }>();
  const hourMap = new Map<number, { totalViews: number; count: number }>();

  let totalViews = 0;
  let totalEngagement = 0;
  let postsWithMetrics = 0;

  for (const post of enriched) {
    if (!post.metrics) continue;
    postsWithMetrics++;
    const eng =
      post.metrics.likes +
      post.metrics.saves +
      post.metrics.shares +
      post.metrics.comments;
    totalViews += post.metrics.views;
    totalEngagement += eng;

    // by type
    const tBucket = typeMap.get(post.type) ?? { totalViews: 0, totalEng: 0, count: 0 };
    tBucket.totalViews += post.metrics.views;
    tBucket.totalEng += eng;
    tBucket.count++;
    typeMap.set(post.type, tBucket);

    // by tone
    if (post.tone) {
      const toneBucket = toneMap.get(post.tone) ?? {
        totalViews: 0,
        totalEng: 0,
        count: 0,
      };
      toneBucket.totalViews += post.metrics.views;
      toneBucket.totalEng += eng;
      toneBucket.count++;
      toneMap.set(post.tone, toneBucket);
    }

    // by hour
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

  return {
    posts: enriched,
    hasAnyMetrics: postsWithMetrics > 0,
    byType,
    byTone,
    byHour,
    totals: {
      posts: enriched.length,
      postsWithMetrics,
      avgViews: postsWithMetrics > 0 ? Math.round(totalViews / postsWithMetrics) : 0,
      totalEngagement,
    },
  };
}

const EMPTY: AnalyticsData = {
  posts: [],
  hasAnyMetrics: false,
  byType: [],
  byTone: [],
  byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, avgViews: 0, postCount: 0 })),
  totals: { posts: 0, postsWithMetrics: 0, avgViews: 0, totalEngagement: 0 },
};
