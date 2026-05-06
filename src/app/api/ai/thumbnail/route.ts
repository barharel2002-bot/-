import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAnthropicConfigured } from '@/lib/config';
import { checkBudgetAllowed } from '@/lib/ai/budget';
import { generateThumbnails } from '@/lib/ai/thumbnail';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  idea: string;
  locale: 'he' | 'en';
}

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

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const idea = String(body?.idea ?? '').trim();
  if (!idea) {
    return NextResponse.json({ ok: false, error: 'empty_idea' }, { status: 400 });
  }
  const locale = body?.locale === 'en' ? 'en' : 'he';

  try {
    const { output } = await generateThumbnails(idea, locale);
    return NextResponse.json({ ok: true, result: output });
  } catch (err: any) {
    console.error('[thumbnail] failed:', err.message);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'failed' },
      { status: 500 }
    );
  }
}
