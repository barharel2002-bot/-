import { useTranslations } from 'next-intl';
import {
  Eye,
  FileText,
  Heart,
  Lightbulb,
  Send,
  Sparkles,
  TrendingUp,
  Clock,
  Youtube,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import type { MirrorData, ChannelUploadItem } from '@/lib/mirror/queries';

type Props = {
  data: MirrorData;
};

export function MirrorView({ data }: Props) {
  const t = useTranslations('mirror');
  const tBase = t;

  if (!data.hasAnyData) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* השבוע מהערוצים שלך — חדש (link-based) */}
      <Section
        icon={Youtube}
        title={t('sections.channelUploads')}
        countLabel={
          data.channelUploads.length > 0
            ? t('totalUploads', { count: data.channelUploads.length })
            : undefined
        }
      >
        {data.channelUploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noChannelUploads')}</p>
        ) : (
          <ul className="space-y-2">
            {data.channelUploads.slice(0, 12).map((u) => (
              <ChannelUploadRow key={u.videoId} upload={u} />
            ))}
          </ul>
        )}
      </Section>

      {/* פרסומים השבוע */}
      <Section
        icon={Send}
        title={t('sections.posted')}
        countLabel={
          data.posted.total > 0
            ? t('totalPosted', { count: data.posted.total })
            : t('noContentThisWeek')
        }
      >
        {data.posted.total > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.posted.byType.map((b) => (
              <div
                key={b.type}
                className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3"
              >
                <span className="text-sm">
                  {tBase(`contentTypes.${b.type}` as any)}
                </span>
                <span className="font-mono text-sm font-bold text-creator-purple">
                  {b.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* טון דומיננטי */}
      {data.toneDistribution.length > 0 && (
        <Section icon={TrendingUp} title={t('sections.tone')}>
          <div className="space-y-2">
            {data.toneDistribution.map((td) => {
              const max = data.toneDistribution[0].count;
              const pct = (td.count / max) * 100;
              return (
                <div key={td.tone} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{tBase(`tones.${td.tone}` as any)}</span>
                    <span className="text-muted-foreground">{td.count}</span>
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
        </Section>
      )}

      {/* שעות פעילות */}
      {data.posted.total > 0 && (
        <Section icon={Clock} title={t('sections.activity')}>
          <ActivityChart hours={data.activityHours} />
        </Section>
      )}

      {/* טיוטות תקועות */}
      <Section
        icon={FileText}
        title={t('sections.drafts')}
        countLabel={data.drafts.length === 0 ? t('noDrafts') : undefined}
      >
        {data.drafts.length > 0 && (
          <ul className="space-y-2">
            {data.drafts.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 text-sm"
              >
                <span className="rounded-full bg-creator-gradient-soft px-2 py-0.5 text-xs text-creator-purple">
                  {tBase(`contentTypes.${d.type}` as any)}
                </span>
                <span className="flex-1 truncate text-muted-foreground">
                  {d.title ?? '(no title)'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* רעיונות שלא פותחו */}
      <Section
        icon={Lightbulb}
        title={t('sections.ideasToDevelop')}
        countLabel={data.ideasToDevelop.length === 0 ? t('noIdeas') : undefined}
      >
        {data.ideasToDevelop.length > 0 && (
          <div className="space-y-2">
            {data.ideasToDevelop.map((idea) => (
              <Link
                key={idea.id}
                href="/ideas"
                className="block rounded-lg border border-border bg-card/50 p-3 text-sm transition-colors hover:border-creator-purple/40"
              >
                <p className="line-clamp-2 leading-relaxed">{idea.content}</p>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* סגנונות שאהבת (סוויפים) */}
      <Section
        icon={Heart}
        title={t('sections.likedStyles')}
        countLabel={data.likedSwipes.length === 0 ? t('noSwipes') : undefined}
      >
        {data.likedSwipes.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.likedSwipes.slice(0, 8).map((s, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                {s.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnail}
                    alt={s.title ?? ''}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {s.title ?? '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ChannelUploadRow({ upload }: { upload: ChannelUploadItem }) {
  const t = useTranslations('mirror');
  const date = format(new Date(upload.publishedAt), 'dd/MM');
  return (
    <li>
      <a
        href={`https://www.youtube.com/watch?v=${upload.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2 transition-colors hover:border-creator-purple/40"
      >
        {upload.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={upload.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-24 flex-shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-14 w-24 flex-shrink-0 rounded bg-muted" />
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{upload.channelName}</span>
            {upload.isShort && (
              <span className="rounded bg-red-500/15 px-1 text-[9px] text-red-300">
                {t('shortLabel')}
              </span>
            )}
            <span>· {date}</span>
          </div>
          <p className="line-clamp-2 text-sm leading-snug">{upload.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {upload.views.toLocaleString()} {t('viewsLabel')}
          </p>
        </div>
      </a>
    </li>
  );
}

function Section({
  icon: Icon,
  title,
  countLabel,
  children,
}: {
  icon: typeof Eye;
  title: string;
  countLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-creator-purple" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            {title}
          </h2>
        </div>
        {countLabel && (
          <span className="text-xs text-muted-foreground">{countLabel}</span>
        )}
      </div>
      {children}
    </Card>
  );
}

function ActivityChart({
  hours,
}: {
  hours: { hour: number; count: number }[];
}) {
  const max = Math.max(...hours.map((h) => h.count), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5" style={{ height: 60 }}>
        {hours.map((h) => {
          const height = h.count > 0 ? (h.count / max) * 100 : 0;
          return (
            <div
              key={h.hour}
              className="flex-1"
              title={`${h.hour}:00 — ${h.count}`}
            >
              <div
                className={
                  'w-full rounded-sm transition-all ' +
                  (h.count > 0 ? 'bg-creator-gradient' : 'bg-muted/40')
                }
                style={{ height: `${Math.max(height, 4)}%` }}
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
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('mirror.empty');
  const promptKeys = ['p1', 'p2', 'p3'] as const;

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-creator-gradient-soft">
        <Eye className="h-8 w-8 text-creator-purple" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-base text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Sparkles className="h-4 w-4 text-creator-purple/50" />
      <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {promptKeys.map((k) => (
          <Link
            key={k}
            href="/ideas?new=1"
            className="rounded-xl border border-border bg-card p-4 text-start text-sm text-muted-foreground transition-all hover:border-creator-purple/40 hover:bg-card/80 hover:text-foreground"
          >
            {t(`prompts.${k}`)}
          </Link>
        ))}
      </div>
    </div>
  );
}
