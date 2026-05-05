// =====================================
// Instagram OAuth — SCAFFOLD בלבד.
// API דורש Meta App Review (שבועות-חודשים) + Instagram Business account
// + Facebook Page מחוברת. עד שזה קורה, OAuth לא יעבוד.
// =====================================

export const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
];

const INSTAGRAM_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';

export function isInstagramOAuthConfigured(): boolean {
  return (
    !!process.env.META_APP_ID &&
    !!process.env.META_APP_SECRET
  );
}

export function getInstagramRedirectUri(origin: string): string {
  return `${origin}/api/oauth/instagram/callback`;
}

export function buildInstagramAuthUrl(opts: {
  state: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? 'NOT_CONFIGURED',
    redirect_uri: opts.redirectUri,
    state: opts.state,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
  });
  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

// TODO: האימוץ של exchangeInstagramCodeForTokens יושלם אחרי App Review של Meta
