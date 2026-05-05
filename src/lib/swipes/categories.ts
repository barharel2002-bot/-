'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// הפעלה/השבתה של קטגוריה ב-Style Swipes
export async function toggleShortsCategory(formData: FormData) {
  const categoryId = String(formData.get('category_id') ?? '');
  const action = String(formData.get('action') ?? 'add');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  if (action === 'remove') {
    await supabase
      .from('shorts_categories')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId);
  } else {
    await supabase
      .from('shorts_categories')
      .upsert({ user_id: user.id, category_id: categoryId });
  }
  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}

export async function listSelectedCategories(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shorts_categories')
    .select('category_id')
    .eq('user_id', userId);
  return (data ?? []).map((r: any) => r.category_id);
}
