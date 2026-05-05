'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ChannelConnection, ConnectionPlatform } from './types';

// שולף את כל החיבורים של המשתמש המחובר (בלי tokens — רק metadata)
export async function fetchConnections(): Promise<ChannelConnection[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('channel_connections')
    .select(
      'id, platform, external_channel_id, channel_handle, channel_name, channel_thumbnail, token_expires_at, connected_at'
    )
    .eq('user_id', user.id)
    .order('connected_at', { ascending: false });

  if (error) {
    console.error('[connections.fetch] failed:', error.message);
    return [];
  }
  return (data ?? []) as ChannelConnection[];
}

// מחזיר חיבור ספציפי לפלטפורמה — null אם אין
export async function fetchConnectionForPlatform(
  platform: ConnectionPlatform
): Promise<ChannelConnection | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('channel_connections')
    .select(
      'id, platform, external_channel_id, channel_handle, channel_name, channel_thumbnail, token_expires_at, connected_at'
    )
    .eq('user_id', user.id)
    .eq('platform', platform)
    .maybeSingle();

  return (data as ChannelConnection) ?? null;
}

// מסיר חיבור (מחיקת רשומה ב-DB; לא מבטל את ה-tokens אצל המפעיל!)
export async function disconnectPlatform(
  platform: ConnectionPlatform
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('channel_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform);

  if (error) {
    console.error('[connections.disconnect] failed:', error.message);
    return { ok: false };
  }
  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/analytics', 'page');
  return { ok: true };
}
