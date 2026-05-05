import { listUploadsPlaylist, fetchVideoDetails } from '@/lib/youtube/videos';

export interface ShortCard {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
}

export function mergeAndDedupe(items: ShortCard[]): ShortCard[] {
  const seen = new Set<string>();
  const out: ShortCard[] = [];
  for (const i of items) {
    if (seen.has(i.videoId)) continue;
    seen.add(i.videoId);
    out.push(i);
  }
  return out;
}

// Mulberry32-based PRNG seeded from a string
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  const rand = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pull Shorts from a list of uploads playlists, return cards.
// Each uploads playlist costs 1 quota unit (playlistItems.list) + 1 unit
// per 50 video IDs (videos.list, batched to filter by duration).
export async function fetchShortsFromPlaylists(
  uploadsPlaylistIds: string[],
  perPlaylist = 10
): Promise<ShortCard[]> {
  const all: ShortCard[] = [];
  for (const pid of uploadsPlaylistIds) {
    try {
      const ids = await listUploadsPlaylist(pid, perPlaylist);
      if (ids.length === 0) continue;
      const details = await fetchVideoDetails(ids);
      for (const d of details) {
        if (!d.isShort) continue;
        all.push({
          videoId: d.videoId,
          title: d.title,
          thumbnailUrl: d.thumbnailUrl,
          channelTitle: '',
        });
      }
    } catch (err: any) {
      console.error('[shorts-feed] playlist failed:', pid, err.message);
      // continue to next playlist
    }
  }
  return all;
}
