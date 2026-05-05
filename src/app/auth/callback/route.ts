import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// בודק שה-`next` הוא נתיב פנימי בטוח. מונע open redirect:
// `new URL('//evil.com', origin)` מתפרש כ-evil.com — לכן רק נתיבים שמתחילים ב-/<locale>/
function safeNext(value: string | null): string {
  if (!value) return '/he';
  // חייב להתחיל ב-/ ולא להמשיך ב-/ נוסף או \  (// ו-\\ פותרים לדומיין חיצוני)
  if (!/^\/(?!\/)(?!\\)/.test(value)) return '/he';
  // מותר רק /he או /en אחריהם /
  if (!/^\/(he|en)(\/|$)/.test(value)) return '/he';
  return value;
}

// מסלול חזרה אחרי לחיצה על magic link
// Supabase שולח אותנו לכאן עם code, ואנחנו מחליפים לסשן
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error('[auth/callback] exchange failed:', error.message);
  }

  // אם משהו השתבש — חזור לדף ההתחברות עם שגיאה
  // next תמיד /he או /en (validated) — בטוח לצירוף
  const locale = next.split('/')[1]; // 'he' או 'en'
  return NextResponse.redirect(
    new URL(`/${locale}/auth?error=callback`, url.origin)
  );
}
