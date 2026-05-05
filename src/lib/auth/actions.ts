'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// שליחת קישור קסם (magic link) למייל
// קלט: FormData עם 'email' ו-'locale'
// פלט: { ok: boolean, error?: string }
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const locale = String(formData.get('locale') || 'he');

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'errorInvalidEmail' as const };
  }

  // ולידציה של locale (מפת ידני בלבד — מונע injection ב-redirect URL)
  const safeLocale = locale === 'en' ? 'en' : 'he';

  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/${safeLocale}`,
    },
  });

  if (error) {
    console.error('[auth] magic link failed:', error.message);
    return { ok: false, error: 'error' as const };
  }

  return { ok: true };
}

// התנתקות — קוראים מה-Server Action בכפתור
export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(`/${locale}/auth`);
}
