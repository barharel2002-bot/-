import type { SyncedVideo } from './types';
import { addQuotaUnits } from './quota';
import { parseDurationToSeconds } from './search';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

// Fetch up to maxResults most recent video IDs from an uploads playlist (1 quota unit)
export async function listUploadsPlaylist(
  uploadsPlaylistId: string,
  maxResults = 50
): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  if (!uploadsPlaylistId) return [];

  const params = new URLSearchParams({
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
    key: apiKey,
  });
  const res = await fetch(`${API_BASE}/playlistItems?${params}`, { cache: 'no-store' });
  await addQuotaUnits(1);
  if (!res.ok) throw new Error(`playlistItems.list ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.items ?? [])
    .map((it: any) => it?.contentDetails?.videoId)
    .filter((v: string | undefined): v is string => !!v);
}

// Batched videos.list — up to 50 ids per call (1 quota unit per batch)
export async function fetchVideoDetails(videoIds: string[]): Promise<SyncedVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  if (videoIds.length === 0) return [];

  const out: SyncedVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: batch.join(','),
      key: apiKey,
    });
    const res = await fetch(`${API_BASE}/videos?${params}`, { cache: 'no-store' });
    await addQuotaUnits(1);
    if (!res.ok) throw new Error(`videos.list ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const item of data.items ?? []) {
      const durationSec = parseDurationToSeconds(item?.contentDetails?.duration);
      const description: string = item?.snippet?.description ?? '';
      out.push({
        videoId: item.id,
        title: item?.snippet?.title ?? '',
        description,
        publishedAt: item?.snippet?.publishedAt ?? '',
        durationSeconds: durationSec,
        viewCount: Number(item?.statistics?.viewCount ?? 0),
        likeCount: Number(item?.statistics?.likeCount ?? 0),
        commentCount: Number(item?.statistics?.commentCount ?? 0),
        thumbnailUrl:
          item?.snippet?.thumbnails?.high?.url ??
          item?.snippet?.thumbnails?.medium?.url ??
          '',
        isShort:
          (durationSec > 0 && durationSec <= 60) || /#shorts/i.test(description),
      });
    }
  }
  return out;
}
