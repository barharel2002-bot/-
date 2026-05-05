'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Eye,
  Heart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { InsightsCard } from './InsightsCard';
import { GrowthChart } from './GrowthChart';
import type {
  AnalyticsData,
  PostWithMetrics,
} from '@/lib/analytics/queries';

type Props = {
  data: AnalyticsData;
};

export function AnalyticsPage({ data }: Props) {
  const t = useTranslations('analytics');

  if (data.posts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI insights summary (top) */}
      <InsightsCard bullets={data.insights} />

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Eye}
          label={t('metrics.avgViews')}
          value={data.totals.avgViews.toLocaleString()}
        />
        <StatCard
          icon={Sparkles}
          label={t('metrics.totalPosts')}
          value={data.totals.posts.toLocaleString()}
        />
        <StatCard
          icon={Heart}
          label={t('metrics.totalEngagement')}
          value={data.totals.totalEngagement.toLocaleString()}
        />
      </div>

      {/* Growth-over-time */}
      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('growth_30d')}
        </h2>
        <GrowthChart series={data.growthSeries} />
      </Card>

      {/* Comparison charts */}
      {data.hasAnyMetrics ? (
        <div className="space-y-6">
          <ChartCard
            icon={BarChart3}
            title={t('charts.byType')}
            data={data.byType}
            tKey="contentTypes"
          />
          {data.byTone.length > 0 && (
            <ChartCard
              icon={TrendingUp}
              title={t('charts.byTone')}
              data={data.byTone}
              tKey="tones"
            />
          )}
          <HourChart hours={data.byHour} title={t('charts.byHour')} />
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {t('charts.noData')}
        </Card>
      )}

      {/* Posts list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('metrics.totalPosts')}
        </h2>
        {data.posts.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <Card className="space-y-1.5 p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[11px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-mono text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function ChartCard({
  icon: Icon,
  title,
  data,
  tKey,
}: {
  icon: typeof BarChart3;
  title: string;
  data: { key: string; avgViews: number; postCount: number }[];
  tKey: 'contentTypes' | 'tones';
}) {
  const tMirror = useTranslations('mirror');

  if (data.length === 0) return null;
  const max = data[0].avgViews;

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-creator-purple" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-2.5">
        {data.map((row) => {
          const pct = max > 0 ? (row.avgViews / max) * 100 : 0;
          return (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{tMirror(`${tKey}.${row.key}` as any)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.avgViews.toLocaleString()} · {row.postCount}p
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-creator-gradient transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function HourChart({
  hours,
  title,
}: {
  hours: { hour: number; avgViews: number; postCount: number }[];
  title: string;
}) {
  const max = Math.max(...hours.map((h) => h.avgViews), 1);
  const hasData = hours.some((h) => h.postCount > 0);
  if (!hasData) return null;

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-creator-purple" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="flex items-end gap-0.5" style={{ height: 80 }}>
        {hours.map((h) => {
          const heightPct = h.avgViews > 0 ? (h.avgViews / max) * 100 : 0;
          return (
            <div
              key={h.hour}
              className="flex-1"
              title={`${h.hour}:00 — ${h.avgViews.toLocaleString()} avg views (${h.postCount} posts)`}
            >
              <div
                className={
                  'w-full rounded-sm transition-all ' +
                  (h.postCount > 0 ? 'bg-creator-gradient' : 'bg-muted/30')
                }
                style={{ height: `${Math.max(heightPct, 4)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </Card>
  );
}

function PostRow({ post }: { post: PostWithMetrics }) {
  const t = useTranslations('analytics');
  const tMirror = useTranslations('mirror');
  const date = format(new Date(post.publishedAt), 'dd/MM');

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="rounded-full bg-creator-gradient-soft px-2 py-0.5 text-creator-purple">
              {tMirror(`contentTypes.${post.type}` as any)}
            </span>
            <span className="text-muted-foreground">· {date}</span>
          </div>
          {post.title && (
            <p className="line-clamp-2 text-sm leading-snug">{post.title}</p>
          )}
        </div>
      </div>

      {post.metrics ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Views" value={post.metrics.views} />
          <Metric label="Likes" value={post.metrics.likes} />
          <Metric label="Comments" value={post.metrics.comments} />
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">{t('noMetricsYet')}</p>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-sm font-medium">
        {value.toLocaleString()}
        {suffix}
      </p>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('analytics.empty');
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-creator-gradient-soft">
        <BarChart3 className="h-7 w-7 text-creator-purple" />
      </div>
      <h2 className="max-w-md text-2xl font-semibold tracking-tight">
        {t('title')}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}
