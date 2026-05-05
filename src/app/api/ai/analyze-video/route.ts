import { NextResponse } from 'next/server';
import { analyzeVideo } from '@/lib/ai/video';
import { checkBudgetAllowed } from '@/lib/ai/budget';
import { isAnthropicConfigured } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // עד 60 שניות לעיבוד

interface RequestBody {
  frames: { mediaType: 'image/jpeg' | 'image/png'; data: string }[];
  durationSec: number;
  locale: 'he' | 'en';
  fileName?: string;
  fileSizeBytes?: number;
}

export async function POST(request: Request) {
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { error: 'anthropic_not_configured' },
      { status: 503 }
    );
  }

  // אימות
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // תקציב
  const { allowed, status } = await checkBudgetAllowed();
  if (!allowed) {
    return NextResponse.json(
      { error: 'budget_blocked', percent: status?.percent ?? 1 },
      { status: 402 }
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!Array.isArray(body.frames) || body.frames.length === 0) {
    return NextResponse.json({ error: 'no_frames' }, { status: 400 });
  }

  // הגנה: מקסימום 8 פריימים, כל אחד עד ~1MB base64
  if (body.frames.length > 8) {
    return NextResponse.json({ error: 'too_many_frames' }, { status: 400 });
  }
  for (const f of body.frames) {
    if (typeof f.data !== 'string' || f.data.length > 1_500_000) {
      return NextResponse.json({ error: 'frame_too_large' }, { status: 400 });
    }
  }

  try {
    const { result, inputTokens, outputTokens } = await analyzeVideo({
      frames: body.frames,
      durationSec: body.durationSec ?? 0,
      locale: body.locale === 'en' ? 'en' : 'he',
    });

    // שמירת רשומה ב-DB
    await supabase.from('video_analyses').insert({
      user_id: user.id,
      file_name: body.fileName ?? null,
      file_size_bytes: body.fileSizeBytes ?? null,
      duration_seconds: body.durationSec ?? null,
      analysis_result: result,
    });

    return NextResponse.json({
      ok: true,
      result,
      tokens: { input: inputTokens, output: outputTokens },
    });
  } catch (err: any) {
    console.error('[analyze-video] failed:', err.message);
    return NextResponse.json(
      { error: 'analysis_failed', message: err.message },
      { status: 500 }
    );
  }
}
