import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Sparkles, Youtube } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { CompetitorForm } from '@/components/analytics/competitor-form';
import { CompetitorChannelCard } from '@/components/analytics/competitor-channel-card';
import { fetchTrackedChannels } from '@/lib/channels/tracked';

// Dedicated "Channel analysis" page — URL-based YouTube analysis + AI insights.
// Lives at /channels and has its own sidebar entry. The /analytics page now
// shows manual metrics only.
export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const tracked = demo ? [] : await fetchTrackedChannels();

  return (
    <div className="space-y-6 animate-fade-in">
      <Header />
      {demo && <DemoBanner />}
      <ChannelsView tracked={tracked} />
    </div>
  );
}

function Header() {
  const t = useTranslations('channels');
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}

function ChannelsView({ tracked }: { tracked: Awaited<ReturnType<typeof fetchTrackedChannels>> }) {
  const t = useTranslations('channels');

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-creator-gradient-soft">
            <Youtube className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{t('cardTitle')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('cardSubtitle')}</p>
          </div>
        </div>
        <CompetitorForm />
      </Card>

      {tracked.length === 0 ? (
        <Card className="space-y-2 p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-creator-purple/50" />
          <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
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
