'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchPublicChannel } from './youtube-public';
import type { TrackedChannelRow } from './types';

// הוספת ערוץ למעקב מתחרים (YouTube בלבד כרגע)
export async function trackYouTubeChannel(input: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  if (!input.trim()) return { ok: false, error: 'empty' };

  const result = await fetchPublicChannel(input.trim());
  if (!result.ok) return { ok: false, error: result.error };
  const data = result.data;

  const { error } = await supabase.from('tracked_channels').upsert(
    {
      user_id: user.id,
      platform: 'youtube',
      external_channel_id: data.id,
      channel_handle: data.handle,
      channel_name: data.title,
      channel_thumbnail: data.thumbnail,
      latest_stats: {
        subscribers: data.subscribers,
        totalViews: data.totalViews,
        totalVideos: data.totalVideos,
        recentVideos: data.recentVideos,
      },
      latest_fetched_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform,external_channel_id' }
  );

  if (error) {
    console.error('[tracked.add] failed:', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/[locale]/analytics', 'page');
  return { ok: true };
}

export async function untrackChannel(
  trackedId: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('tracked_channels')
    .delete()
    .eq('id', trackedId)
    .eq('user_id', user.id);

  if (error) return { ok: false };
  revalidatePath('/[locale]/analytics', 'page');
  return { ok: true };
}

export async function fetchTrackedChannels(): Promise<TrackedChannelRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tracked_channels')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as TrackedChannelRow[];
}
