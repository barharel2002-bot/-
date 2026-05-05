import { createClient } from '@/lib/supabase/server';
import { listUploadsPlaylist, fetchVideoDetails } from './videos';
import { getQuotaToday, isOverQuotaThreshold } from './quota';
import type { SyncResult, SyncedVideo } from './types';

const SYNC_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Orchestrator: pulls uploads + stats from YouTube into the cache tables.
// Caller should pass the authenticated user id. Returns a SyncResult that
// the page can use to render appropriate empty/error states.
export async function syncUserYouTubeData(
  userId: string,
  force = false
): Promise<SyncResult> {
  const supabase = await createClient();

  // 1. Read profile YT fields
  const { data: profile } = await supabase
    .from('profiles')
    .select('youtube_channel_id,youtube_uploads_playlist_id,youtube_synced_at')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.youtube_channel_id || !profile?.youtube_uploads_playlist_id) {
    return { status: 'no-channel' };
  }

  // 2. Cache check — 24h TTL
  if (!force && profile.youtube_synced_at) {
    const ageMs = Date.now() - new Date(profile.youtube_synced_at).getTime();
    if (ageMs < SYNC_TTL_MS) return { status: 'cached', ageMs };
  }

  // 3. Quota guardrail
  const used = await getQuotaToday();
  if (isOverQuotaThreshold(used)) return { status: 'quota-exceeded' };

  try {
    // 4. Fetch uploads playlist → video IDs
    const ids = await listUploadsPlaylist(profile.youtube_uploads_playlist_id, 50);
    if (ids.length === 0) {
      await supabase
        .from('profiles')
        .update({ youtube_synced_at: new Date().toISOString() })
        .eq('id', userId);
      return { status: 'synced', videoCount: 0 };
    }

    // 5. Fetch full video details
    const videos = await fetchVideoDetails(ids);

    // 6. Upsert into youtube_videos
    const rows = videos.map((v) => ({
      user_id: userId,
      video_id: v.videoId,
      title: v.title,
      description: v.description,
      published_at: v.publishedAt,
      duration_seconds: v.durationSeconds,
      view_count: v.viewCount,
      like_count: v.likeCount,
      comment_count: v.commentCount,
      thumbnail_url: v.thumbnailUrl,
      is_short: v.isShort,
      synced_at: new Date().toISOString(),
    }));
    const { error: upsertErr } = await supabase
      .from('youtube_videos')
      .upsert(rows, { onConflict: 'user_id,video_id' });
    if (upsertErr) throw upsertErr;

    // 7. Stats history snapshot for today (first sync of day wins)
    const today = new Date().toISOString().slice(0, 10);
    const historyRows = videos.map((v) => ({
      user_id: userId,
      video_id: v.videoId,
      snapshot_date: today,
      view_count: v.viewCount,
      like_count: v.likeCount,
      comment_count: v.commentCount,
    }));
    await supabase
      .from('youtube_video_stats_history')
      .upsert(historyRows, {
        onConflict: 'video_id,snapshot_date',
        ignoreDuplicates: true,
      });

    // 8. Mark synced
    await supabase
      .from('profiles')
      .update({ youtube_synced_at: new Date().toISOString() })
      .eq('id', userId);

    return { status: 'synced', videoCount: videos.length };
  } catch (err: any) {
    console.error('[youtube.sync] failed:', err.message);
    return { status: 'error', message: err.message };
  }
}

// Helper for callers: read cached videos
export async function getCachedVideos(userId: string): Promise<SyncedVideo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_videos')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    videoId: r.video_id,
    title: r.title,
    description: r.description ?? '',
    publishedAt: r.published_at,
    durationSeconds: r.duration_seconds,
    viewCount: Number(r.view_count),
    likeCount: Number(r.like_count),
    commentCount: Number(r.comment_count),
    thumbnailUrl: r.thumbnail_url ?? '',
    isShort: r.is_short,
    tone: r.tone,
  }));
}
