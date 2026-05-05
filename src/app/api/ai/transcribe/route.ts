import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isOpenAIConfigured } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB — מגבלת Whisper API

// POST /api/ai/transcribe
// Body: multipart/form-data עם audio file ב-field "audio"
// קלט: ייצור הקלטה אצל הלקוח (MediaRecorder)
// פלט: { ok: true, text: '...' } או { error: ... }
export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: 'openai_not_configured' },
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

  // קלט מהבקשה
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const audio = formData.get('audio');
  const locale = String(formData.get('locale') || 'he');
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'no_audio' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  // בנייה של FormData ל-OpenAI
  const openaiForm = new FormData();
  openaiForm.append('file', audio, audio.name || 'recording.webm');
  openaiForm.append('model', 'whisper-1');
  // עברית או אנגלית — ל-Whisper לפי שפת המשתמש
  openaiForm.append('language', locale === 'en' ? 'en' : 'he');
  openaiForm.append('response_format', 'json');

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiForm,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[whisper] HTTP', res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: 'transcription_failed' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const transcribedText = String(data.text ?? '').trim();
    return NextResponse.json({ ok: true, text: transcribedText });
  } catch (err: any) {
    console.error('[whisper] failed:', err.message);
    return NextResponse.json({ error: 'transcription_failed' }, { status: 500 });
  }
}
