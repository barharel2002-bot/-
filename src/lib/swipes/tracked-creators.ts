'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseChannelInput } from '@/lib/youtube/parse-url';
import { resolveChannel } from '@/lib/youtube/channels';

// הוסף יוצר למעקב — מקבל URL, מאשר מול YouTube, שומר ב-DB
export async function addTrackedCreator(formData: FormData) {
  const raw = String(formData.get('channel_url') ?? '').trim();
  if (!raw) return { ok: false as const, error: 'Empty input' };

  let resolved;
  try {
    resolved = await resolveChannel(parseChannelInput(raw));
  } catch {
    return { ok: false as const, error: 'Could not resolve channel' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { error } = await supabase.from('tracked_creators').upsert({
    user_id: user.id,
    channel_id: resolved.channelId,
    channel_url: raw,
    channel_title: resolved.title,
    uploads_playlist: resolved.uploadsPlaylistId,
    thumbnail_url: resolved.thumbnailUrl,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}

export async function removeTrackedCreator(formData: FormData) {
  const channelId = String(formData.get('channel_id') ?? '');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  await supabase
    .from('tracked_creators')
    .delete()
    .eq('user_id', user.id)
    .eq('channel_id', channelId);

  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}

export interface TrackedCreatorRow {
  channel_id: string;
  channel_url: string;
  channel_title: string;
  uploads_playlist: string;
  thumbnail_url: string | null;
  added_at: string;
}

export async function listTrackedCreators(
  userId: string
): Promise<TrackedCreatorRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tracked_creators')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return (data ?? []) as TrackedCreatorRow[];
}
