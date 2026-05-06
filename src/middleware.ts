import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

// דפים שלא דורשים authentication (auth, marketing, legal)
const PUBLIC_PATHS = [
  '/auth',
  '/auth/callback',
  '/welcome',
  '/pricing',
  '/privacy',
  '/terms',
];

function isPublicPath(pathname: string): boolean {
  // דפים תחת /[locale]/auth/... וגם /auth/callback
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.endsWith(p) || pathname.includes(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. /auth/callback — לא רוצים שה-intl middleware יחטוף את זה
  if (pathname.startsWith('/auth/callback')) {
    const baseResponse = NextResponse.next();
    if (hasSupabase) {
      const { response } = await updateSession(request, baseResponse);
      return response;
    }
    return baseResponse;
  }

  // 2. ניתוב i18n — מחליט ל-/he או /en, מבצע redirect במידת הצורך
  const response = intlMiddleware(request);

  // 3. אם אין Supabase — אפשר לראות את הדפים (סטטיים), אין auth gate
  if (!hasSupabase) return response;

  // 4. ריענון session + בדיקת user במכה אחת (קודם היו 2 קריאות ל-getUser
  //    על כל ניווט, ~200ms תוספת מיותרת — עכשיו רק אחת)
  if (!(response instanceof NextResponse)) return response;
  const { response: updatedResponse, user } = await updateSession(
    request,
    response
  );

  // 5. בדיקת auth — אם לא בדף ציבורי ולא מחובר, הפנה ל-/auth
  const isPublic = isPublicPath(pathname);
  if (isPublic) return updatedResponse;

  const localeMatch = pathname.match(/^\/(he|en)(?:\/|$)/);
  if (!localeMatch) return updatedResponse;
  const locale = localeMatch[1];

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth`;
    return NextResponse.redirect(url);
  }

  return updatedResponse;
}

export const config = {
  matcher: ['/', '/(he|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
