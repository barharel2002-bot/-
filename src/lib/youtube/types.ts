// טיפוסים משותפים לכל שכבת ה-YouTube
// כולם נחשפים מחדש דרך @/types

export interface ParsedChannelInput {
  kind: 'handle' | 'id' | 'custom';
  value: string; // raw value extracted (e.g. 'AliAbdaal' for @AliAbdaal)
  raw: string; // original user input
}

export interface ResolvedChannel {
  channelId: string; // UCxxxx
  uploadsPlaylistId: string; // UU... (or as returned by API)
  title: string;
  thumbnailUrl: string;
}

export interface SyncedVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
  isShort: boolean;
  tone?: string | null;
}

export type SyncResult =
  | { status: 'no-channel' }
  | { status: 'cached'; ageMs: number }
  | { status: 'quota-exceeded' }
  | { status: 'synced'; videoCount: number }
  | { status: 'error'; message: string };

export interface ToneAnalysis {
  perVideo: Record<string, string>; // videoId → tone label
  dominant: { tone: string; rationale: string };
}

export interface InsightsBullet {
  emoji: string;
  text: string;
}
