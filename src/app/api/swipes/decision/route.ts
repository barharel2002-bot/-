import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// קצה לקליטת החלטות swipe (liked/skipped) — נכתב ל-swipe_items הקיים.
// משאיר את category='videos' כדי שה-AI agents הקיימים ימשיכו לקרוא ממנו.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { error } = await supabase.from('swipe_items').insert({
    user_id: user.id,
    category: 'videos',
    source_url: `https://youtube.com/shorts/${body.video_id}`,
    platform: 'other',
    thumbnail_url: body.thumbnail_url ?? null,
    title: body.title ?? null,
    decision: body.decision === 'liked' ? 'liked' : 'skipped',
    decided_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
