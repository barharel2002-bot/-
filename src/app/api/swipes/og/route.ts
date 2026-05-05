import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUrlMetadata } from '@/lib/swipes/og-fetch';

export const runtime = 'nodejs';

// POST /api/swipes/og — שולף metadata לקישור
// משמש את ה-add-link-form בעת הוספה לתור
export async function POST(request: Request) {
  // אימות
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'no_url' }, { status: 400 });
  }

  const result = await fetchUrlMetadata(body.url);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'fetch_failed' },
      { status: 400 }
    );
  }
  return NextResponse.json(result);
}
