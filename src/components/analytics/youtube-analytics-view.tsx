'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  Eye,
  Users,
  Video,
  Clock,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { YouTubeAnalyticsData } from '@/lib/channels/youtube-analytics';

type Props = {
  data: YouTubeAnalyticsData;
};

export function YouTubeAnalyticsView({ data }: Props) {
  const t = useTranslations('analytics.ownChannel');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Channel header */}
      <Card className="flex items-center gap-4 p-5">
        {data.channel.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.channel.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">
            {data.channel.title ?? '—'}
          </h2>
          {data.channel.handle && (
            <p className="text-xs text-muted-foreground">
              @{data.channel.handle}
            </p>
          )}
        </div>
      </Card>

      {/* Lifetime stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={Users}
          label={t('subscribers')}
          value={data.channel.subscribers}
        />
        <Stat
          icon={Eye}
          label={t('totalViews')}
          value={data.channel.totalViews}
        />
        <Stat
          icon={Video}
          label={t('totalVideos')}
          value={data.channel.totalVideos}
        />
      </div>

      {/* 30-day stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('last30Days')}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={Eye}
            label={t('viewsTrend')}
            value={data.totals30d.views}
            highlight
          />
          <Stat
            icon={Clock}
            label={t('watchMinutes')}
            value={data.totals30d.watchMinutes}
            highlight
          />
          <Stat
            icon={TrendingUp}
            label={t('subsGained')}
            value={data.totals30d.subscribersGained}
            highlight
          />
        </div>
      </div>

      {/* 30-day chart */}
      {data.daily.length > 0 && <DailyViewsChart daily={data.daily} />}

      {/* Recent videos */}
      {data.recentVideos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('recentVideos')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.recentVideos.slice(0, 6).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card
      className={
        'space-y-1.5 p-4 ' +
        (highlight ? 'border-creator-purple/30 bg-creator-gradient-soft/30' : '')
      }
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[11px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-mono text-2xl font-semibold">
        {value.toLocaleString()}
      </p>
    </Card>
  );
}

function DailyViewsChart({
  daily,
}: {
  daily: { date: string; views: number; watchMinutes: number; subscribersGained: number }[];
}) {
  const max = Math.max(...daily.map((d) => d.views), 1);
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-creator-purple" />
        <h3 className="text-sm font-semibold">צפיות יומיות (30 יום)</h3>
      </div>
      <div className="flex items-end gap-0.5" style={{ height: 80 }}>
        {daily.map((d) => {
          const heightPct = d.views > 0 ? (d.views / max) * 100 : 0;
          return (
            <div
              key={d.date}
              className="flex-1"
              title={`${d.date} — ${d.views.toLocaleString()} צפיות`}
            >
              <div
                className="w-full rounded-sm bg-creator-gradient transition-all"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{daily[0]?.date}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </Card>
  );
}

function VideoCard({
  video,
}: {
  video: {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    views: number;
    likes: number;
    isShort: boolean;
  };
}) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-creator-purple/40"
    >
      {video.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="space-y-1.5 p-3">
        <div className="flex items-center gap-1 text-[10px]">
          {video.isShort && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">
              SHORT
            </span>
          )}
          <span className="text-muted-foreground">
            {format(new Date(video.publishedAt), 'dd/MM')}
          </span>
        </div>
        <p className="line-clamp-2 text-xs font-medium leading-snug">
          {video.title}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {video.views.toLocaleString()}
          </span>
          <span>♥ {video.likes.toLocaleString()}</span>
          <ExternalLink className="ms-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </a>
  );
}
