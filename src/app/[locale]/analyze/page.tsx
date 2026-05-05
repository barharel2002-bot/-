import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured, isAnthropicConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { VideoAnalyzer } from '@/components/analyze/video-analyzer';
import { AnalyzeDemo } from '@/components/analyze/analyze-demo';
import { getBudgetStatus } from '@/lib/ai/budget';
import { DEMO_VIDEO_ANALYSIS } from '@/lib/demo/data';

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured() || !isAnthropicConfigured();
  const budget = demo ? null : await getBudgetStatus();

  return (
    <div className="space-y-6 animate-fade-in">
      <Header />
      {demo && <DemoBanner />}
      {demo ? (
        <AnalyzeDemo result={DEMO_VIDEO_ANALYSIS} />
      ) : (
        <VideoAnalyzer
          budgetBlocked={budget?.status === 'blocked'}
          budgetPercent={budget?.percent ?? 0}
        />
      )}
    </div>
  );
}

function Header() {
  const t = useTranslations('analyze');
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}
