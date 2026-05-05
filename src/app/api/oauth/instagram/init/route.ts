import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildInstagramAuthUrl,
  getInstagramRedirectUri,
  isInstagramOAuthConfigured,
} from '@/lib/oauth/instagram';
import { createStateForPlatform } from '@/lib/oauth/state';

export const runtime = 'nodejs';

// GET /api/oauth/instagram/init — scaffold. דורש Meta App Review להפעלה אמיתית.
export async function GET(request: Request) {
  if (!isInstagramOAuthConfigured()) {
    return NextResponse.json(
      {
        error: 'instagram_not_configured',
        message:
          'Instagram OAuth requires META_APP_ID + META_APP_SECRET in .env.local. The Meta app must complete App Review for production.',
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
  const state = await createStateForPlatform('instagram');
  const authUrl = buildInstagramAuthUrl({
    state,
    redirectUri: getInstagramRedirectUri(url.origin),
  });
  return NextResponse.redirect(authUrl);
}
