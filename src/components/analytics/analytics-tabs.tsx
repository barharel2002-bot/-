'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Edit3, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { AnalyticsPage } from './analytics-page';
import { CompetitorForm } from './competitor-form';
import { CompetitorChannelCard } from './competitor-channel-card';
import type { AnalyticsData } from '@/lib/analytics/queries';
import type { TrackedChannelRow } from '@/lib/channels/types';

// "own" was OAuth-based and is gone. Channel analysis is now URL-based for any channel
// (yours or anyone else's), and the "Manual" tab still exists for hand-entered metrics.
type Tab = 'channels' | 'manual';

type Props = {
  manualData: AnalyticsData;
  trackedChannels: TrackedChannelRow[];
};

export function AnalyticsTabs({ manualData, trackedChannels }: Props) {
  const t = useTranslations('analytics.tabs');
  const [tab, setTab] = useState<Tab>('channels');

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-card/40 p-1">
        <TabButton
          active={tab === 'channels'}
          onClick={() => setTab('channels')}
          icon={Sparkles}
          label={t('channels')}
        />
        <TabButton
          active={tab === 'manual'}
          onClick={() => setTab('manual')}
          icon={Edit3}
          label={t('manual')}
        />
      </div>

      {/* Tab content */}
      {tab === 'channels' && <ChannelsTab tracked={trackedChannels} />}
      {tab === 'manual' && <AnalyticsPage data={manualData} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
        active
          ? 'bg-creator-gradient text-white shadow-sm'
          : 'text-muted-foreground hover:bg-card hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function ChannelsTab({ tracked }: { tracked: TrackedChannelRow[] }) {
  const t = useTranslations('analytics.channels');

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-creator-gradient-soft">
            <Youtube className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t('title')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <CompetitorForm />
      </Card>

      {tracked.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {t('emptyState')}
        </Card>
      ) : (
        <div className="space-y-4">
          {tracked.map((row) => (
            <CompetitorChannelCard key={row.id} row={row} />
          ))}
        </div>
      )}

      {/* Hints for IG/TikTok */}
      <div className="space-y-2 text-[11px] text-muted-foreground">
        <p>· {t('instagramHint')}</p>
        <p>· {t('tiktokHint')}</p>
      </div>
    </div>
  );
}
