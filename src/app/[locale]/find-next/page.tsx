import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Compass } from 'lucide-react';
import { isSupabaseConfigured, isAnthropicConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { FindNextForm } from '@/components/find-next/find-next-form';
import { fetchProfile } from '@/lib/settings/queries';
import { getBudgetStatus } from '@/lib/ai/budget';

export default async function FindNextPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured() || !isAnthropicConfigured();
  const [profile, budget] = demo
    ? [null, null]
    : await Promise.all([fetchProfile(), getBudgetStatus()]);

  const defaultAudience = profile?.for_whom ?? '';

  return (
    <div className="space-y-6 animate-fade-in">
      <Header />
      <Explainer />
      {demo && <DemoBanner />}
      {!demo && (
        <FindNextForm
          defaultAudience={defaultAudience}
          budgetBlocked={budget?.status === 'blocked'}
          budgetPercent={budget?.percent ?? 0}
        />
      )}
    </div>
  );
}

function Header() {
  const t = useTranslations('findNext');
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Compass className="h-6 w-6 text-creator-purple" />
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      </div>
      <p className="text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}

function Explainer() {
  const t = useTranslations('findNext');
  const keys = ['stuck', 'specific', 'tailored', 'fast'] as const;
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
