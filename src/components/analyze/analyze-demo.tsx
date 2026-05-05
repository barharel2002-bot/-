'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { VideoAnalysisResult } from '@/types';

// תצוגת הדגמה של תוצאת ניתוח סרטון
type Props = {
  result: VideoAnalysisResult;
};

export function AnalyzeDemo({ result }: Props) {
  const t = useTranslations('analyze.results');

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-semibold">{t('title')}</h2>

      <Card
        className={`flex items-start gap-4 p-5 ${result.suitable ? 'border-emerald-500/30' : 'border-amber-500/30'}`}
      >
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
            result.suitable
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-amber-500/15 text-amber-400'
          }`}
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

      <Card className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-creator-purple" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('messageConnection')}
          </h3>
        </div>
        <p className="text-sm leading-relaxed">{result.messageConnection}</p>
      </Card>

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
  icon: typeof Calendar;
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
