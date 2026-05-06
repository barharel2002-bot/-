'use client';

import { useState, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Upload,
  Video as VideoIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Zap,
  Target,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { extractFrames } from '@/lib/video/extract-frames';
import type { Locale } from '@/i18n/routing';
import type { VideoAnalysisResult } from '@/types';

const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB. The video itself is never uploaded — frames are extracted in the browser. The cap protects against pathological devices running out of memory.

type Phase = 'idle' | 'extracting' | 'uploading' | 'analyzing' | 'done' | 'error';

type Props = {
  budgetBlocked: boolean;
  budgetPercent: number;
};

export function VideoAnalyzer({ budgetBlocked, budgetPercent }: Props) {
  const t = useTranslations('analyze');
  const tCopy = useTranslations('copy');
  const locale = useLocale() as Locale;
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErrorKey(null);
    setResult(null);

    if (file.size > MAX_FILE_BYTES) {
      setErrorKey('tooLarge');
      setPhase('error');
      return;
    }

    try {
      setPhase('extracting');
      const { frames, durationSec } = await extractFrames(file, 5);

      setPhase('uploading');
      const res = await fetch('/api/ai/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          durationSec,
          locale,
          fileName: file.name,
          fileSizeBytes: file.size,
        }),
      });

      setPhase('analyzing');
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorKey(data.error ?? 'analyzeFailed');
        setPhase('error');
        return;
      }

      setResult(data.result);
      setPhase('done');
    } catch (err) {
      console.error(err);
      setErrorKey('extractFailed');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setErrorKey(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  // אם חסום — מסך תקציב (משתמש בטקסטים של copy)
  if (budgetBlocked) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-creator-gradient-soft">
          <Sparkles className="h-6 w-6 text-creator-orange" />
        </div>
        <h2 className="text-xl font-semibold">{tCopy('blockedTitle')}</h2>
        <p className="text-sm text-muted-foreground">{tCopy('blockedSubtitle')}</p>
      </Card>
    );
  }

  const showWarning = budgetPercent >= 0.8 && budgetPercent < 1;
  const isWorking =
    phase === 'extracting' || phase === 'uploading' || phase === 'analyzing';

  return (
    <div className="space-y-6">
      {showWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {tCopy('warningBanner', { percent: Math.round(budgetPercent * 100) })}
        </div>
      )}

      {/* אזור העלאה */}
      {phase === 'idle' && (
        <label
          htmlFor="video-input"
          className="block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center transition-all hover:border-creator-purple/50 hover:bg-card"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-creator-gradient-soft">
            <Upload className="h-7 w-7 text-creator-purple" />
          </div>
          <p className="text-base font-medium">{t('uploadCta')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('uploadHint')}</p>
        </label>
      )}

      <input
        ref={inputRef}
        id="video-input"
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {/* פאזות עבודה */}
      {isWorking && (
        <Card className="flex items-center gap-4 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-creator-purple/20 border-t-creator-purple" />
          <div>
            <p className="font-medium">
              {phase === 'extracting' && t('extracting')}
              {phase === 'uploading' && t('uploading')}
              {phase === 'analyzing' && t('analyzing')}
            </p>
          </div>
        </Card>
      )}

      {/* שגיאה */}
      {phase === 'error' && (
        <Card className="space-y-3 border-red-500/30 p-6">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">{errorKey ? t(errorKey as any) : t('analyzeFailed')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            {t('analyzeAgain')}
          </Button>
        </Card>
      )}

      {/* תוצאות */}
      {phase === 'done' && result && (
        <ResultDisplay result={result} onReset={reset} />
      )}
    </div>
  );
}

// =====================
// תצוגת תוצאות
// =====================
function ResultDisplay({
  result,
  onReset,
}: {
  result: VideoAnalysisResult;
  onReset: () => void;
}) {
  const t = useTranslations('analyze.results');
  const tBase = useTranslations('analyze');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {tBase('analyzeAgain')}
        </Button>
      </div>

      {/* התאמה */}
      <Card className={`flex items-start gap-4 p-5 ${result.suitable ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${result.suitable ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}
        >
          {result.suitable ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('suitable')}
          </p>
          <p className="text-base font-semibold">
            {result.suitable ? t('yes') : t('no')}
          </p>
          {result.reason && (
            <p className="text-sm text-muted-foreground">{result.reason}</p>
          )}
        </div>
      </Card>

      {/* פלטפורמה + זמן + Hook */}
      <div className="grid gap-3 md:grid-cols-3">
        <InfoCard
          icon={Target}
          label={t('platform')}
          value={t(`platforms.${result.platform}` as any)}
        />
        <InfoCard
          icon={Calendar}
          label={t('publishWhen')}
          value={`${result.publishDay}, ${result.publishTime}`}
        />
        <InfoCard
          icon={Zap}
          label={t('hookQuality')}
          value={t(
            result.hookQuality === 'strong'
              ? 'hookStrong'
              : result.hookQuality === 'medium'
                ? 'hookMedium'
                : 'hookWeak'
          )}
          tone={
            result.hookQuality === 'strong'
              ? 'good'
              : result.hookQuality === 'medium'
                ? 'mid'
                : 'bad'
          }
        />
      </div>

      {/* חיבור למסר */}
      <Card className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-creator-purple" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('messageConnection')}
          </h3>
        </div>
        <p className="text-sm leading-relaxed">{result.messageConnection}</p>
      </Card>

      {/* טיפים לשיפור */}
      {result.improvementTips && result.improvementTips.length > 0 && (
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-creator-purple" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('improvementTips')}
            </h3>
          </div>
          <ul className="space-y-2">
            {result.improvementTips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-relaxed"
              >
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-creator-purple" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone?: 'good' | 'mid' | 'bad';
}) {
  const toneClasses =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'mid'
        ? 'text-amber-400'
        : tone === 'bad'
          ? 'text-red-400'
          : 'text-foreground';
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className={`text-base font-semibold ${toneClasses}`}>{value}</p>
    </Card>
  );
}
