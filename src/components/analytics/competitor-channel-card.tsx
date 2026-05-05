'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Eye, Users, Video, X, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { untrackChannel } from '@/lib/channels/tracked';
import type { TrackedChannelRow } from '@/lib/channels/types';
import { ChannelInsights } from './channel-insights';

type Props = {
  row: TrackedChannelRow;
};

interface Stats {
  subscribers?: number;
  totalViews?: number;
  totalVideos?: number;
  recentVideos?: Array<{
    id: string;
    title: string;
    publishedAt: string;
    thumbnail: string;
    views: number;
    likes: number;
    isShort: boolean;
  }>;
}

export function CompetitorChannelCard({ row }: Props) {
  const t = useTranslations('analytics.competitor');
  const [isPending, startTransition] = useTransition();
  const stats = (row.latest_stats ?? {}) as Stats;
  const recent = stats.recentVideos ?? [];
  const last = row.latest_fetched_at
    ? format(new Date(row.latest_fetched_at), 'dd/MM HH:mm')
    : null;

  function handleUntrack() {
    startTransition(async () => {
      await untrackChannel(row.id);
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        {row.channel_thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.channel_thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            {row.channel_name ?? '—'}
          </h3>
          {row.channel_handle && (
            <p className="text-xs text-muted-foreground">
              @{row.channel_handle}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUntrack}
          disabled={isPending}
          className="hover:text-red-400"
          title={t('untrack')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <MiniStat
          icon={Users}
          value={stats.subscribers ?? 0}
          label="subs"
        />
        <MiniStat
          icon={Eye}
          value={stats.totalViews ?? 0}
          label="views"
        />
        <MiniStat
          icon={Video}
          value={stats.totalVideos ?? 0}
          label="vids"
        />
      </div>

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            8 סרטונים אחרונים
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recent.slice(0, 8).map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-md border border-border bg-card text-[10px] transition-colors hover:border-creator-purple/40"
              >
                {v.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnail}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full object-cover"
                  />
                )}
                <div className="space-y-0.5 p-1.5">
                  {v.isShort && (
                    <span className="rounded bg-red-500/15 px-1 py-0 text-[9px] text-red-300">
                      SHORT
                    </span>
                  )}
                  <p className="line-clamp-2 leading-tight">{v.title}</p>
                  <p className="text-muted-foreground">
                    {v.views.toLocaleString()} צפיות
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* AI insights — collapsible */}
      <ChannelInsights row={row} />

      {last && (
        <p className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {t('lastUpdated')} {last}
          </span>
          <a
            href={
              row.channel_handle
                ? `https://www.youtube.com/@${row.channel_handle}`
                : `https://www.youtube.com/channel/${row.external_channel_id}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-creator-purple hover:underline"
          >
            פתח ב-YouTube
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/50 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="font-mono text-sm font-semibold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
