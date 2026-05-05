import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildYouTubeAuthUrl,
  getYouTubeRedirectUri,
  isYouTubeOAuthConfigured,
} from '@/lib/oauth/youtube';
import { createStateForPlatform } from '@/lib/oauth/state';

export const runtime = 'nodejs';

// GET /api/oauth/youtube/init — מתחיל זרימת OAuth של YouTube
// דורש user מחובר. מפנה ל-Google עם state CSRF.
export async function GET(request: Request) {
  if (!isYouTubeOAuthConfigured()) {
    return NextResponse.json(
      { error: 'youtube_oauth_not_configured' },
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
  const origin = url.origin;
  const state = await createStateForPlatform('youtube');
  const redirectUri = getYouTubeRedirectUri(origin);
  const authUrl = buildYouTubeAuthUrl({ state, redirectUri });

  return NextResponse.redirect(authUrl);
}
