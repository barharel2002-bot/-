import { createClient } from '@/lib/supabase/server';
import type { LearnCategory } from '@/config/creators.config';

export interface SavedVideoRow {
  id: string;
  video_id: string;
  title: string | null;
  channel_name: string | null;
  thumbnail_url: string | null;
  category: LearnCategory | null;
  is_watched: boolean;
  is_useful: boolean;
  saved_at: string;
}

// שולף סרטונים שמורים — מועילים תחילה
export async function fetchSavedVideos(): Promise<SavedVideoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('youtube_saved')
    .select('*')
    .order('is_useful', { ascending: false })
    .order('saved_at', { ascending: false });

  if (error) {
    console.error('[learn.fetch] failed:', error.message);
    return [];
  }
  return (data ?? []) as SavedVideoRow[];
}

// מפה של video_id → סטטוס שמירה (לחישוב מהיר ב-UI)
export async function fetchSavedVideoMap(): Promise<
  Map<string, { is_useful: boolean; is_watched: boolean }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_saved')
    .select('video_id, is_useful, is_watched');
  const map = new Map<string, { is_useful: boolean; is_watched: boolean }>();
  for (const row of data ?? []) {
    map.set(row.video_id, {
      is_useful: row.is_useful,
      is_watched: row.is_watched,
    });
  }
  return map;
}
