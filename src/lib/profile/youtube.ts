'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseChannelInput } from '@/lib/youtube/parse-url';
import { resolveChannel } from '@/lib/youtube/channels';

// שמירת קישור הערוץ — נקרא מ-Settings ומכל empty-state
export async function setYouTubeChannel(formData: FormData) {
  const raw = String(formData.get('youtube_url') ?? '').trim();
  if (!raw) return { ok: false as const, error: 'אנא הדבק קישור לערוץ YouTube' };

  let parsed;
  try {
    parsed = parseChannelInput(raw);
  } catch {
    return {
      ok: false as const,
      error: 'הקישור לא תקין — בדוק שזה כתובת ערוץ YouTube',
    };
  }

  let resolved;
  try {
    resolved = await resolveChannel(parsed);
  } catch {
    return {
      ok: false as const,
      error: 'לא הצלחנו למצוא את הערוץ. בדוק את הקישור.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      youtube_channel_url: raw,
      youtube_channel_id: resolved.channelId,
      youtube_uploads_playlist_id: resolved.uploadsPlaylistId,
      youtube_channel_title: resolved.title,
      youtube_channel_thumbnail: resolved.thumbnailUrl,
      youtube_synced_at: null, // force a sync next page load
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/mirror', 'page');
  revalidatePath('/[locale]/analytics', 'page');
  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const, channelTitle: resolved.title };
}

// ניתוק הערוץ — מנקה גם את המטמון של הסרטונים והסטטיסטיקות
export async function clearYouTubeChannel() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  await supabase
    .from('profiles')
    .update({
      youtube_channel_url: null,
      youtube_channel_id: null,
      youtube_uploads_playlist_id: null,
      youtube_channel_title: null,
      youtube_channel_thumbnail: null,
      youtube_synced_at: null,
      youtube_tone_cache: null,
      youtube_insights_cache: null,
    })
    .eq('id', user.id);

  await supabase.from('youtube_videos').delete().eq('user_id', user.id);
  await supabase.from('youtube_video_stats_history').delete().eq('user_id', user.id);

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/mirror', 'page');
  revalidatePath('/[locale]/analytics', 'page');
  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}
