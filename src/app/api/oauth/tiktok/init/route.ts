import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildTikTokAuthUrl,
  getTikTokRedirectUri,
  isTikTokOAuthConfigured,
} from '@/lib/oauth/tiktok';
import { createStateForPlatform } from '@/lib/oauth/state';

export const runtime = 'nodejs';

// GET /api/oauth/tiktok/init — scaffold. דורש TikTok App Review להפעלה אמיתית.
export async function GET(request: Request) {
  if (!isTikTokOAuthConfigured()) {
    return NextResponse.json(
      {
        error: 'tiktok_not_configured',
        message:
          'TikTok OAuth requires TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET in .env.local. Requires TikTok for Developers App Review.',
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const state = await createStateForPlatform('tiktok');
  const authUrl = buildTikTokAuthUrl({
    state,
    redirectUri: getTikTokRedirectUri(url.origin),
  });
  return NextResponse.redirect(authUrl);
}
