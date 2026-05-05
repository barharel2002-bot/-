import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { fetchAnalytics } from '@/lib/analytics/queries';
import { AnalyticsPage } from '@/components/analytics/analytics-page';
import { DEMO_ANALYTICS } from '@/lib/demo/data';
import { syncUserYouTubeData } from '@/lib/youtube/sync';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { createClient } from '@/lib/supabase/server';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();

  if (demo) {
    return (
      <div className="space-y-6">
        <Header />
        <DemoBanner />
        <AnalyticsPage data={DEMO_ANALYTICS} />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const syncResult = await syncUserYouTubeData(user.id);

  if (syncResult.status === 'no-channel') {
    const t = await getTranslations('youtube');
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-base mb-4">{t('inline_prompt')}</p>
          <YouTubeChannelInput variant="inline" />
        </div>
      </div>
    );
  }

  const t = await getTranslations('youtube');
  const banner =
    syncResult.status === 'quota-exceeded'
      ? t('quota_exceeded')
      : syncResult.status === 'error'
        ? 'Could not refresh from YouTube. Showing cached data.'
        : null;

  const data = await fetchAnalytics();

  return (
    <div className="space-y-6">
      <Header />
      {banner && (
        <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {banner}
        </div>
      )}
      <AnalyticsPage data={data} />
    </div>
  );
}

function Header() {
  const t = useTranslations('analytics');
  return (
    <div className="space-y-2 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}
