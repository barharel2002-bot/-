'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { LearnCategory } from '@/config/creators.config';

interface SaveVideoInput {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  category: LearnCategory;
  isUseful?: boolean;
}

// שומר/מעדכן סרטון — upsert בלי כפילויות
export async function saveLearnVideo(input: SaveVideoInput): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // upsert לפי (user_id, video_id) — קיים constraint unique בסכמה
  const { error } = await supabase.from('youtube_saved').upsert(
    {
      user_id: user.id,
      video_id: input.videoId,
      title: input.title,
      channel_name: input.channelName,
      thumbnail_url: input.thumbnailUrl,
      category: input.category,
      is_watched: false,
      is_useful: input.isUseful ?? false,
    },
    { onConflict: 'user_id,video_id' }
  );

  if (error) {
    console.error('[learn.save] failed:', error.message);
    return { ok: false };
  }

  revalidatePath('/[locale]/learn', 'page');
  return { ok: true };
}

// סימון סרטון כצפיתי בו (נשמר אוטומטית כשפותחים)
export async function markVideoWatched(input: SaveVideoInput): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from('youtube_saved').upsert(
    {
      user_id: user.id,
      video_id: input.videoId,
      title: input.title,
      channel_name: input.channelName,
      thumbnail_url: input.thumbnailUrl,
      category: input.category,
      is_watched: true,
    },
    { onConflict: 'user_id,video_id' }
  );

  if (error) {
    console.error('[learn.watched] failed:', error.message);
    return { ok: false };
  }
  return { ok: true };
}

// הסרה מהשמורים (toggle)
export async function unsaveLearnVideo(videoId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('youtube_saved')
    .delete()
    .eq('user_id', user.id)
    .eq('video_id', videoId);

  if (error) {
    console.error('[learn.unsave] failed:', error.message);
    return { ok: false };
  }

  revalidatePath('/[locale]/learn', 'page');
  return { ok: true };
}

// שינוי is_useful — רק עבור סרטון שכבר שמור
export async function toggleVideoUseful(
  input: SaveVideoInput
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // upsert עם הערך החדש
  const { error } = await supabase.from('youtube_saved').upsert(
    {
      user_id: user.id,
      video_id: input.videoId,
      title: input.title,
      channel_name: input.channelName,
      thumbnail_url: input.thumbnailUrl,
      category: input.category,
      is_useful: input.isUseful ?? true,
    },
    { onConflict: 'user_id,video_id' }
  );

  if (error) return { ok: false };
  revalidatePath('/[locale]/learn', 'page');
  return { ok: true };
}
