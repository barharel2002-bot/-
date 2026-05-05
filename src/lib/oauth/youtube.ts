// =====================================
// YouTube OAuth — Sign in with Google + youtube.readonly + yt-analytics.readonly
// שמירת tokens ב-channel_connections
// =====================================

import { createClient } from '@/lib/supabase/server';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// בודק אם OAuth credentials מוגדרים ב-env
export function isYouTubeOAuthConfigured(): boolean {
  return (
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

// בונה את ה-redirect URI על בסיס ה-host המתבקש (תומך גם בלוקאלהוסט וגם ב-deploy)
export function getYouTubeRedirectUri(origin: string): string {
  return `${origin}/api/oauth/youtube/callback`;
}

// בונה URL התחברות ל-Google
export function buildYouTubeAuthUrl(opts: {
  state: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    access_type: 'offline', // קבל refresh_token
    prompt: 'consent', // אילוץ refresh_token גם בכניסה חוזרת
    state: opts.state,
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// מחליף קוד אישור עם Google ל-tokens
export async function exchangeYouTubeCodeForTokens(opts: {
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: opts.code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: opts.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TokenResponse;
}

// שימוש ב-refresh_token להוצאת access_token חדש
export async function refreshYouTubeAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TokenResponse;
}

// שולף את פרטי הערוץ של המשתמש המחובר ב-Google
export async function fetchYouTubeChannelInfo(accessToken: string) {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Channel fetch failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) throw new Error('No YouTube channel on this Google account');
  return {
    id: channel.id as string,
    title: channel.snippet?.title as string | undefined,
    handle: channel.snippet?.customUrl as string | undefined,
    thumbnail: channel.snippet?.thumbnails?.medium?.url as string | undefined,
  };
}

// שומר את החיבור ב-DB. אם כבר קיים — מחליף.
export async function saveYouTubeConnection(opts: {
  channelId: string;
  channelName?: string;
  channelHandle?: string;
  channelThumbnail?: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scope: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const expiresAt = new Date(
    Date.now() + opts.expiresInSeconds * 1000
  ).toISOString();

  const { error } = await supabase.from('channel_connections').upsert(
    {
      user_id: user.id,
      platform: 'youtube',
      external_channel_id: opts.channelId,
      channel_handle: opts.channelHandle ?? null,
      channel_name: opts.channelName ?? null,
      channel_thumbnail: opts.channelThumbnail ?? null,
      access_token: opts.accessToken,
      refresh_token: opts.refreshToken,
      token_expires_at: expiresAt,
      scope: opts.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' }
  );
  if (error) {
    console.error('[oauth.save] failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
