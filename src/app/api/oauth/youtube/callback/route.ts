import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exchangeYouTubeCodeForTokens,
  fetchYouTubeChannelInfo,
  getYouTubeRedirectUri,
  saveYouTubeConnection,
} from '@/lib/oauth/youtube';
import { consumeStateForPlatform } from '@/lib/oauth/state';

export const runtime = 'nodejs';

// GET /api/oauth/youtube/callback — Google מפנה לכאן אחרי אישור המשתמש
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const origin = url.origin;

  // לקוח דחה / שגיאת Google
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/he/settings?oauth=youtube_${errorParam}`, origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/he/settings?oauth=youtube_invalid', origin)
    );
  }

  // אימות state CSRF
  const validState = await consumeStateForPlatform('youtube', state);
  if (!validState) {
    return NextResponse.redirect(
      new URL('/he/settings?oauth=youtube_state', origin)
    );
  }

  // אימות שהמשתמש עדיין מחובר
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/he/auth', origin));
  }

  try {
    // החלפת code ל-tokens
    const tokens = await exchangeYouTubeCodeForTokens({
      code,
      redirectUri: getYouTubeRedirectUri(origin),
    });

    if (!tokens.refresh_token) {
      // אם כבר אישרת קודם, Google לא ישלח refresh_token חדש
      // אבל ביקשנו prompt=consent ולכן זה לא אמור לקרות. נטפל בזהירות:
      console.warn('[oauth.youtube] no refresh_token in response');
    }

    // טעינת פרטי הערוץ
    const channel = await fetchYouTubeChannelInfo(tokens.access_token);

    // שמירה ב-DB
    const saved = await saveYouTubeConnection({
      channelId: channel.id,
      channelName: channel.title,
      channelHandle: channel.handle,
      channelThumbnail: channel.thumbnail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? '',
      expiresInSeconds: tokens.expires_in,
      scope: tokens.scope,
    });

    if (!saved.ok) {
      return NextResponse.redirect(
        new URL('/he/settings?oauth=youtube_save_failed', origin)
      );
    }

    return NextResponse.redirect(
      new URL('/he/analytics?connected=youtube', origin)
    );
  } catch (err: any) {
    console.error('[oauth.youtube.callback] failed:', err.message);
    return NextResponse.redirect(
      new URL('/he/settings?oauth=youtube_failed', origin)
    );
  }
}
