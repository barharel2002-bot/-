import type { ParsedChannelInput, ResolvedChannel } from './types';
import { addQuotaUnits } from './quota';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

// resolve user input → canonical channel + uploads playlist
export async function resolveChannel(
  parsed: ParsedChannelInput
): Promise<ResolvedChannel> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    key: apiKey,
  });
  if (parsed.kind === 'id') {
    params.set('id', parsed.value);
  } else if (parsed.kind === 'handle') {
    params.set('forHandle', `@${parsed.value}`);
  } else {
    // 'custom' — YouTube no longer exposes /c/ resolution directly via API.
    // Best effort: search for the channel.
    return resolveByCustomName(parsed.value, apiKey);
  }

  const res = await fetch(`${API_BASE}/channels?${params}`, { cache: 'no-store' });
  await addQuotaUnits(1);
  if (!res.ok) {
    throw new Error(`channels.list ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error('Channel not found');

  return {
    channelId: item.id,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? '',
    title: item.snippet?.title ?? '',
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ??
      '',
  };
}

async function resolveByCustomName(
  name: string,
  apiKey: string
): Promise<ResolvedChannel> {
  // search.list costs 100 units — used only as fallback for /c/ URLs
  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: name,
    type: 'channel',
    maxResults: '1',
    key: apiKey,
  });
  const sRes = await fetch(`${API_BASE}/search?${searchParams}`, { cache: 'no-store' });
  await addQuotaUnits(100);
  if (!sRes.ok) throw new Error(`search.list ${sRes.status}`);
  const sData = await sRes.json();
  const sItem = sData.items?.[0];
  if (!sItem) throw new Error('Channel not found via search');
  const channelId = sItem.snippet?.channelId ?? sItem.id?.channelId;
  if (!channelId) throw new Error('No channelId in search result');
  // Now fetch full details via id-based path
  return resolveChannel({ kind: 'id', value: channelId, raw: name });
}
