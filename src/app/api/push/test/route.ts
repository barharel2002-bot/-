import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { isPushConfigured } from '@/lib/config';

// שליחת התראת בדיקה למשתמש המחובר
// מציג את הטקסט "למה אני יוצר" שלו, או הודעת ברירת מחדל
export async function POST() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // שליפת הפרופיל
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('push_subscription, why_i_create, preferred_locale')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const subscription = profile.push_subscription as PushSubscriptionJSON | null;
  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  }

  // הגדרת web-push עם VAPID
  webpush.setVapidDetails(
    'mailto:noreply@creator-mode.local',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const isHebrew = profile.preferred_locale === 'he';
  const title = isHebrew ? 'מצב יוצר' : 'Creator Mode';
  const body =
    profile.why_i_create ||
    (isHebrew ? 'תזכורת: מה תיצור היום?' : 'Reminder: what will you create today?');

  try {
    await webpush.sendNotification(
      subscription as unknown as webpush.PushSubscription,
      JSON.stringify({ title, body, url: `/${profile.preferred_locale}` })
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[push.test] send failed:', err.message);
    // אם ה-subscription פג תוקף — מחק אותו מה-DB
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', user.id);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
