// =====================================
// TikTok OAuth — SCAFFOLD בלבד.
// API דורש TikTok for Developers App + App Review
// =====================================

export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
];

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';

export function isTikTokOAuthConfigured(): boolean {
  return (
    !!process.env.TIKTOK_CLIENT_KEY &&
    !!process.env.TIKTOK_CLIENT_SECRET
  );
}

export function getTikTokRedirectUri(origin: string): string {
  return `${origin}/api/oauth/tiktok/callback`;
}

export function buildTikTokAuthUrl(opts: {
  state: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY ?? 'NOT_CONFIGURED',
    redirect_uri: opts.redirectUri,
    state: opts.state,
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
  });
  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

// TODO: השלמת token exchange אחרי App Review של TikTok
