'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

interface MetricsInput {
  contentId: string;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  comments: number;
  avgWatchTimeSec: number | null;
}

// שמירת מדדים — מוסיף רשומה חדשה ב-content_metrics בכל פעם
// (היסטוריה נשמרת — נוכל לראות מגמות)
export async function saveMetrics(
  input: MetricsInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  // ודא שהפוסט שייך למשתמש
  const { data: post } = await supabase
    .from('published_content')
    .select('id, user_id')
    .eq('id', input.contentId)
    .maybeSingle();

  if (!post || post.user_id !== user.id) {
    return { ok: false, error: 'not_found' };
  }

  // הכנסת רשומה חדשה (לא upsert — היסטוריה)
  const { error } = await supabase.from('content_metrics').insert({
    content_id: input.contentId,
    views: Math.max(0, Math.floor(input.views)),
    likes: Math.max(0, Math.floor(input.likes)),
    saves: Math.max(0, Math.floor(input.saves)),
    shares: Math.max(0, Math.floor(input.shares)),
    comments: Math.max(0, Math.floor(input.comments)),
    avg_watch_time_seconds: input.avgWatchTimeSec,
  });

  if (error) {
    console.error('[analytics.save] failed:', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/[locale]/analytics', 'page');
  revalidatePath('/[locale]/mirror', 'page');
  return { ok: true };
}
