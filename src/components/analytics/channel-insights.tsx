'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Hash,
  Layers,
  Rocket,
  Clock,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { analyzeChannelData } from '@/lib/channels/insights';
import type {
  ChannelInsights as ChannelInsightsType,
  PublicChannelData,
  TrackedChannelRow,
} from '@/lib/channels/types';

type Props = {
  row: TrackedChannelRow;
};

// Reconstruct PublicChannelData from a TrackedChannelRow's stored stats.
// `latest_stats` is the same shape we save in tracked.ts.
function rowToPublicChannelData(row: TrackedChannelRow): PublicChannelData {
  const stats = (row.latest_stats ?? {}) as {
    subscribers?: number;
    totalViews?: number;
    totalVideos?: number;
    recentVideos?: PublicChannelData['recentVideos'];
  };
  return {
    id: row.external_channel_id,
    title: row.channel_name ?? '',
    handle: row.channel_handle,
    thumbnail: row.channel_thumbnail,
    description: null,
    subscribers: stats.subscribers ?? 0,
    totalViews: stats.totalViews ?? 0,
    totalVideos: stats.totalVideos ?? 0,
    recentVideos: stats.recentVideos ?? [],
  };
}

export function ChannelInsights({ row }: Props) {
  const t = useTranslations('analytics.insights');
  const locale = useLocale() as 'he' | 'en';
  const [open, setOpen] = useState(false);
  const [insights, setInsights] = useState<ChannelInsightsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setError(null);
    setOpen(true);
    if (insights) return; // already loaded
    startTransition(async () => {
      const data = rowToPublicChannelData(row);
      const result = await analyzeChannelData(data, locale);
      if (result.ok) {
        setInsights(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        variant={open && insights ? 'ghost' : 'default'}
        size="sm"
        onClick={() => {
          if (insights) {
            setOpen((v) => !v);
          } else {
            handleAnalyze();
          }
        }}
        disabled={isPending}
        className={cn(
          'w-full',
          !insights && !open && 'bg-creator-gradient text-white hover:opacity-90'
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t('analyzing')}</span>
          </>
        ) : insights ? (
          <>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                open && 'rotate-180'
              )}
            />
            <span>{open ? t('hide') : t('show')}</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('analyze')}</span>
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{t(`errors.${error}` as any) || t('errors.ai_failed')}</span>
        </div>
      )}

      {open && insights && (
        <div className="space-y-4 rounded-lg border border-creator-purple/20 bg-creator-gradient-soft/30 p-4 animate-fade-in">
          {/* Summary */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-creator-purple">
              <Sparkles className="h-3 w-3" />
              {t('sections.summary')}
            </div>
            <p className="text-sm leading-relaxed">{insights.summary}</p>
          </div>

          <Section
            icon={TrendingUp}
            title={t('sections.whatsWorking')}
            items={insights.whatsWorking}
            tone="positive"
          />
          <Section
            icon={AlertTriangle}
            title={t('sections.whatToDrop')}
            items={insights.whatToDrop}
            tone="negative"
          />
          <Section
            icon={Lightbulb}
            title={t('sections.hookPatterns')}
            items={insights.hookPatterns}
          />
          <Section
            icon={Hash}
            title={t('sections.hashtagStrategy')}
            items={insights.hashtagStrategy}
          />
          <Section
            icon={Layers}
            title={t('sections.contentThemes')}
            items={insights.contentThemes}
          />
          <Section
            icon={Rocket}
            title={t('sections.recommendations')}
            items={insights.recommendations}
            tone="action"
          />

          {insights.postingTime && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-creator-purple">
                <Clock className="h-3 w-3" />
                {t('sections.postingTime')}
              </div>
              <p className="text-sm leading-relaxed">{insights.postingTime}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof Sparkles;
  title: string;
  items: string[];
  tone?: 'positive' | 'negative' | 'action';
}) {
  if (items.length === 0) return null;

  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'negative'
        ? 'text-amber-300'
        : tone === 'action'
          ? 'text-creator-purple'
          : 'text-muted-foreground';

  return (
    <div>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider', toneClass)}>
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={cn('mt-1.5 h-1 w-1 flex-shrink-0 rounded-full', toneClass)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
