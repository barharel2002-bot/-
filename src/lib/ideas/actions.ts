'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { IdeaTag } from '@/types';

const VALID_TAGS: IdeaTag[] = [
  'story',
  'reel',
  'tiktok',
  'spontaneous',
  'develop',
  'post',
];

// יצירת רעיון חדש
// קלט: FormData עם content + tags (string[]) + imageUrl? + voiceTranscript?
export async function createIdea(formData: FormData) {
  const content = String(formData.get('content') || '').trim();
  const tagsRaw = formData.getAll('tags').map(String);
  const tags = tagsRaw.filter((t): t is IdeaTag => VALID_TAGS.includes(t as IdeaTag));
  const imageUrl = String(formData.get('imageUrl') || '').trim() || null;
  const voiceTranscript =
    String(formData.get('voiceTranscript') || '').trim() || null;

  if (!content) {
    return { ok: false as const, error: 'Content is required' };
  }

  // ולידציה של URL לתמונה — חייב להיות HTTP(S) חיצוני
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    return { ok: false as const, error: 'Invalid image URL' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ideas')
    .insert({
      user_id: user.id,
      content,
      tags,
      status: 'new',
      image_url: imageUrl,
      voice_transcript: voiceTranscript,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ideas.create] failed:', error.message);
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/[locale]/ideas', 'page');
  return { ok: true as const, id: data.id };
}

// עדכון רעיון קיים
export async function updateIdea(id: string, formData: FormData) {
  const content = String(formData.get('content') || '').trim();
  const tagsRaw = formData.getAll('tags').map(String);
  const tags = tagsRaw.filter((t): t is IdeaTag => VALID_TAGS.includes(t as IdeaTag));

  if (!content) {
    return { ok: false as const, error: 'Content is required' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  // defense-in-depth: גם RLS תופס את זה, אבל user_id filter מפורש
  // מבטיח שלא נקרא לעדכן ID שלא שלנו ונקבל success מטעה
  const { error } = await supabase
    .from('ideas')
    .update({
      content,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[ideas.update] failed:', error.message);
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/[locale]/ideas', 'page');
  return { ok: true as const };
}

// מחיקת רעיון
export async function deleteIdea(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { error } = await supabase
    .from('ideas')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[ideas.delete] failed:', error.message);
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/[locale]/ideas', 'page');
  return { ok: true as const };
}
