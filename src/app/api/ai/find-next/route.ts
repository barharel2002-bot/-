import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAnthropicConfigured } from '@/lib/config';
import { checkBudgetAllowed } from '@/lib/ai/budget';
import { findNextVideo, type FindNextInput } from '@/lib/ai/find-next';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/ai/find-next — generates next-video direction + 5 ideas
export async function POST(request: Request) {
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'anthropic_not_configured' },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  const { allowed } = await checkBudgetAllowed();
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'budget_blocked' }, { status: 402 });
  }

  let body: FindNextInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'bad_payload' }, { status: 400 });
  }
  if (!['short', 'long', 'both'].includes(body.preferredFormat)) {
    body.preferredFormat = 'both';
  }
  if (body.locale !== 'he' && body.locale !== 'en') {
    body.locale = 'he';
  }

  try {
    const { output } = await findNextVideo(body);
    return NextResponse.json({ ok: true, result: output });
  } catch (err: any) {
    console.error('[find-next] failed:', err.message);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'failed' },
      { status: 500 }
    );
  }
}
