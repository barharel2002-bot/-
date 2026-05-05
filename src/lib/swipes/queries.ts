import { createClient } from '@/lib/supabase/server';
import type { SwipeCategory, SwipeDecision } from '@/types';

export interface SwipeItemRow {
  id: string;
  user_id: string;
  category: SwipeCategory;
  source_url: string;
  platform: 'instagram' | 'tiktok' | 'other' | null;
  thumbnail_url: string | null;
  title: string | null;
  author_name: string | null;
  embed_html: string | null;
  decision: SwipeDecision;
  decided_at: string | null;
  created_at: string;
}

// שליפת תור הסוויפ — פריטים שעוד לא קיבלו החלטה
export async function fetchSwipeQueue(
  category: SwipeCategory
): Promise<SwipeItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('swipe_items')
    .select('*')
    .eq('category', category)
    .is('decision', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[swipes.queue] failed:', error.message);
    return [];
  }
  return (data ?? []) as SwipeItemRow[];
}

// כמות פריטים ש-decided (להצגה ב-empty state)
export async function fetchSwipeStats(category: SwipeCategory): Promise<{
  liked: number;
  skipped: number;
}> {
  const supabase = await createClient();
  const [liked, skipped] = await Promise.all([
    supabase
      .from('swipe_items')
      .select('id', { count: 'exact', head: true })
      .eq('category', category)
      .eq('decision', 'liked'),
    supabase
      .from('swipe_items')
      .select('id', { count: 'exact', head: true })
      .eq('category', category)
      .eq('decision', 'skipped'),
  ]);
  return {
    liked: liked.count ?? 0,
    skipped: skipped.count ?? 0,
  };
}
