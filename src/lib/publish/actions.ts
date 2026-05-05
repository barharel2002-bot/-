'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ContentType, Tone } from '@/types';

const VALID_TYPES: ContentType[] = [
  'story',
  'short_video',
  'long_video',
  'post',
  'carousel',
];
const VALID_PLATFORMS = ['instagram', 'tiktok', 'both'] as const;
const VALID_TONES: Tone[] = [
  'inspirational',
  'educational',
  'personal',
  'funny',
  'value',
];

interface PublishInput {
  ideaId: string | null;
  contentType: ContentType;
  platform: 'instagram' | 'tiktok' | 'both';
  tone: Tone | null;
  title: string | null;
}

// תיעוד פרסום — יוצר rec ב-published_content ומעדכן את הרעיון אם רלוונטי
export async function markPublished(input: PublishInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!VALID_TYPES.includes(input.contentType))
    return { ok: false, error: 'invalid_type' };
  if (!VALID_PLATFORMS.includes(input.platform))
    return { ok: false, error: 'invalid_platform' };
  if (input.tone && !VALID_TONES.includes(input.tone))
    return { ok: false, error: 'invalid_tone' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  // אם הרעיון מועבר — נטען אותו ונשתמש בתוכן ככותרת ברירת מחדל
  let title = input.title?.trim() || null;
  if (!title && input.ideaId) {
    const { data } = await supabase
      .from('ideas')
      .select('content')
      .eq('id', input.ideaId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.content) {
      // 80 תווים מקסימום ל-title
      title = data.content.slice(0, 80) + (data.content.length > 80 ? '…' : '');
    }
  }

  // יצירת רשומת published_content
  const { error: insertError } = await supabase.from('published_content').insert({
    user_id: user.id,
    content_type: input.contentType,
    platform: input.platform,
    title,
    tone: input.tone,
    is_draft: false,
    idea_id: input.ideaId,
    published_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[publish] failed:', insertError.message);
    return { ok: false, error: 'failed' };
  }

  // עדכון הרעיון אם קיים
  if (input.ideaId) {
    await supabase
      .from('ideas')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', input.ideaId)
      .eq('user_id', user.id);
  }

  revalidatePath('/[locale]/ideas', 'page');
  revalidatePath('/[locale]/mirror', 'page');
  return { ok: true };
}
