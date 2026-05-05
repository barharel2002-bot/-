import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { fetchAnalytics } from '@/lib/analytics/queries';
import { AnalyticsPage } from '@/components/analytics/analytics-page';
import { DEMO_ANALYTICS } from '@/lib/demo/data';

// Manual-entry analytics for the user's own posts. URL-based YouTube channel
// analysis and AI insights live on /channels (separate page, separate sidebar
// entry).
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const data = demo ? DEMO_ANALYTICS : await fetchAnalytics();

  return (
    <div className="space-y-6">
      <Header />
      {demo && <DemoBanner />}
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
