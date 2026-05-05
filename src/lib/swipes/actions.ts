'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SwipeCategory, SwipeDecision } from '@/types';
import { fetchUrlMetadata, type Platform } from './og-fetch';

const VALID_CATEGORIES: SwipeCategory[] = ['videos', 'edit_styles', 'photos'];

interface AddLinkResult {
  ok: boolean;
  error?: 'unauthenticated' | 'invalid_url' | 'duplicate' | 'fetch_failed' | 'failed';
}

// הוספת קישור חדש לתור הסוויפ של קטגוריה ספציפית
export async function addLinkToQueue(
  category: SwipeCategory,
  url: string
): Promise<AddLinkResult> {
  if (!VALID_CATEGORIES.includes(category)) return { ok: false, error: 'failed' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  // בדוק אם הקישור כבר קיים אצל המשתמש (כל קטגוריה)
  const { data: existing } = await supabase
    .from('swipe_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_url', url)
    .maybeSingle();
  if (existing) return { ok: false, error: 'duplicate' };

  // שלוף metadata
  const meta = await fetchUrlMetadata(url);
  if (!meta.ok) {
    return {
      ok: false,
      error: meta.error === 'invalid_url' ? 'invalid_url' : 'fetch_failed',
    };
  }

  // שמור ב-DB
  const platform: Platform = meta.platform ?? 'other';
  const { error } = await supabase.from('swipe_items').insert({
    user_id: user.id,
    category,
    source_url: url,
    platform: platform === 'youtube' ? 'other' : platform, // ה-DB תומך רק ב-instagram/tiktok/other
    thumbnail_url: meta.thumbnail ?? null,
    title: meta.title ?? null,
    author_name: meta.authorName ?? null,
    embed_html: meta.embedHtml ?? null,
  });

  if (error) {
    console.error('[swipes.add] failed:', error.message);
    return { ok: false, error: 'failed' };
  }

  revalidatePath(`/[locale]/swipe/${category === 'edit_styles' ? 'styles' : category}`, 'page');
  return { ok: true };
}

// רישום החלטה (החלקה)
export async function decideSwipe(
  itemId: string,
  decision: SwipeDecision
): Promise<{ ok: boolean }> {
  if (decision !== 'liked' && decision !== 'skipped') return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('swipe_items')
    .update({ decision, decided_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[swipes.decide] failed:', error.message);
    return { ok: false };
  }
  return { ok: true };
}

// ביטול החלטה (Undo)
export async function undoSwipe(itemId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('swipe_items')
    .update({ decision: null, decided_at: null })
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) return { ok: false };
  return { ok: true };
}
