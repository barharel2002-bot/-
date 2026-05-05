'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

const MAX_RECORDING_SEC = 120; // 2 דקות מקסימום — תמיכה ב-Whisper limit

type Phase = 'unsupported' | 'idle' | 'recording' | 'transcribing';

type Props = {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
  enabled: boolean; // האם OpenAI מוגדר בכלל
};

export function VoiceRecorder({ onTranscribed, disabled, enabled }: Props) {
  const t = useTranslations('ideas.voice');
  const locale = useLocale() as Locale;
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  // בדיקת תמיכה
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.MediaRecorder ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setPhase('unsupported');
    }
  }, []);

  // ניקוי בעת unmount
  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAndCleanup() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        /* swallow */
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    setErrorKey(null);
    if (!enabled) {
      setErrorKey('needsOpenAI');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        await transcribe(blob);
      };

      recorder.start();
      setPhase('recording');

      // טיימר — מציג זמן + עוצר אוטומטית במגבלה
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= MAX_RECORDING_SEC) stopRecording();
      }, 250);
    } catch (err: any) {
      console.error('[voice] permission denied', err);
      setErrorKey('permissionDenied');
      setPhase('idle');
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase('transcribing');
  }

  async function transcribe(blob: Blob) {
    if (blob.size === 0) {
      setPhase('idle');
      return;
    }
    try {
      const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
      const file = new File([blob], `recording.${ext}`, { type: blob.type });
      const fd = new FormData();
      fd.append('audio', file);
      fd.append('locale', locale);

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'openai_not_configured') {
          setErrorKey('needsOpenAI');
        } else {
          setErrorKey('transcribeFailed');
        }
        setPhase('idle');
        return;
      }

      const data = await res.json();
      if (data.text) onTranscribed(data.text);
      setPhase('idle');
    } catch (err) {
      console.error('[voice] transcribe failed', err);
      setErrorKey('transcribeFailed');
      setPhase('idle');
    }
  }

  // UI
  if (phase === 'unsupported') return null;

  const isBusy = phase === 'recording' || phase === 'transcribing';

  return (
    <div className="flex items-center gap-2">
      {phase === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled || !enabled}
          aria-label={enabled ? t('start') : t('needsOpenAI')}
          title={enabled ? t('start') : t('needsOpenAI')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors',
            !enabled || disabled
              ? 'cursor-not-allowed opacity-40'
              : 'hover:border-creator-purple hover:text-creator-purple'
          )}
        >
          <Mic className="h-4 w-4" />
        </button>
      )}

      {phase === 'recording' && (
        <button
          type="button"
          onClick={stopRecording}
          aria-label={t('stop')}
          className="flex h-9 items-center gap-2 rounded-full border-2 border-red-400 bg-red-500/10 px-3 text-sm font-medium text-red-300"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          <Square className="h-3.5 w-3.5" fill="currentColor" />
          <span className="font-mono text-xs">{formatTime(duration)}</span>
        </button>
      )}

      {phase === 'transcribing' && (
        <span className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('transcribing')}
        </span>
      )}

      {errorKey && !isBusy && (
        <span className="text-xs text-amber-300">{t(errorKey as any)}</span>
      )}
    </div>
  );
}

function pickMimeType(): string {
  // mp4 לא תמיד נתמך ב-MediaRecorder; webm/opus הכי בטוח
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
