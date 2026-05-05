'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ReminderFrequency } from '@/types';

const VALID_FREQUENCIES: ReminderFrequency[] = [
  'daily_morning',
  'daily_evening',
  'twice_week',
  'weekly',
];

// עדכון השדות "למה אני יוצר" ו"בשביל מי" + תדירות תזכורות
export async function updateProfile(formData: FormData) {
  const why = String(formData.get('why_i_create') || '').trim();
  const forWhom = String(formData.get('for_whom') || '').trim();
  const frequency = String(formData.get('reminder_frequency') || 'daily_morning');

  if (!VALID_FREQUENCIES.includes(frequency as ReminderFrequency)) {
    return { ok: false as const, error: 'Invalid frequency' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      why_i_create: why || null,
      for_whom: forWhom || null,
      reminder_frequency: frequency,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('[settings.update] failed:', error.message);
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/[locale]/settings', 'page');
  return { ok: true as const };
}
