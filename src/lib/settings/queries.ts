import { createClient } from '@/lib/supabase/server';
import type { ReminderFrequency } from '@/types';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  why_i_create: string | null;
  for_whom: string | null;
  preferred_locale: string;
  reminder_frequency: ReminderFrequency;
  push_subscription: object | null;
  ai_monthly_budget_cents: number;
  // YouTube channel link (added by 2026-05-05 migration)
  youtube_channel_url: string | null;
  youtube_channel_id: string | null;
  youtube_uploads_playlist_id: string | null;
  youtube_channel_title: string | null;
  youtube_channel_thumbnail: string | null;
  youtube_synced_at: string | null;
  youtube_tone_cache: object | null;
  youtube_insights_cache: object | null;
  created_at: string;
  updated_at: string;
}

// שולף את הפרופיל של המשתמש המחובר. אם לא קיים — יוצר ברירת מחדל
export async function fetchProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[profile.fetch] failed:', error.message);
    return null;
  }

  // אם הטריגר ב-DB לא יצר profile (תרחיש קצה) — צור עכשיו
  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: user.id, display_name: user.email })
      .select('*')
      .single();
    if (insertError) {
      console.error('[profile.create] failed:', insertError.message);
      return null;
    }
    return created as ProfileRow;
  }

  return data as ProfileRow;
}

// שולף email למשתמש המחובר (להצגה ב"חשבון")
export async function fetchUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
