import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured, isAnthropicConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { CopyForm } from '@/components/copy/copy-form';
import { CopyDemo } from '@/components/copy/copy-demo';
import { getBudgetStatus } from '@/lib/ai/budget';
import { DEMO_COPY_OUTPUT } from '@/lib/demo/data';

const DEMO_IDEA_TEXT =
  'TikTok על 3 הטעויות שעשיתי כשהתחלתי. הוק: "אם הייתי יודע את זה לפני שנתיים, לא הייתי מבזבז 200 שעות".';

export default async function CopyPage({
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
      {demo ? (
        <CopyDemo ideaText={DEMO_IDEA_TEXT} output={DEMO_COPY_OUTPUT} />
      ) : (
        <CopyForm
          initialBudgetPercent={budget?.percent ?? 0}
          budgetBlocked={budget?.status === 'blocked'}
        />
      )}
    </div>
  );
}

function Header() {
  const t = useTranslations('copy');
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}

function Explainer() {
  const t = useTranslations('copy');
  const keys = ['speed', 'options', 'memory', 'hashtags'] as const;
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
