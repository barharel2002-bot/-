import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Image as ImageIcon } from 'lucide-react';
import { isSupabaseConfigured, isAnthropicConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { ThumbnailForm } from '@/components/thumbnail/thumbnail-form';
import { getBudgetStatus } from '@/lib/ai/budget';

export default async function ThumbnailPage({
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
      <Explainer />
      {demo && <DemoBanner />}
      {!demo && (
        <ThumbnailForm
          budgetBlocked={budget?.status === 'blocked'}
          budgetPercent={budget?.percent ?? 0}
        />
      )}
    </div>
  );
}

function Header() {
  const t = useTranslations('thumbnail');
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-6 w-6 text-creator-purple" />
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      </div>
      <p className="text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}

function Explainer() {
  const t = useTranslations('thumbnail');
  const keys = ['ctr', 'patterns', 'mobile', 'abTest'] as const;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('explainerTitle')}
      </h2>
      <ul className="space-y-2">
        {keys.map((k) => (
          <li key={k} className="flex items-start gap-3 text-sm leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-creator-purple" />
            <span>{t(`explainerBullets.${k}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
