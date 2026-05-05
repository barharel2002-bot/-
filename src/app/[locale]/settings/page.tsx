import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { fetchProfile, fetchUserEmail } from '@/lib/settings/queries';
import { WhyForm } from '@/components/settings/why-form';
import { PushToggle } from '@/components/settings/push-toggle';
import { AccountCard } from '@/components/settings/account-card';
import { BudgetCard } from '@/components/settings/budget-card';
import { getBudgetStatus } from '@/lib/ai/budget';
import { DEMO_PROFILE } from '@/lib/demo/data';
import type { BudgetStatus } from '@/lib/ai/budget';

const DEMO_BUDGET: BudgetStatus = {
  usedCents: 1820,
  budgetCents: 5000,
  percent: 0.364,
  status: 'ok',
  inputTokens: 124530,
  outputTokens: 18420,
  month: '2026-05',
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const [profile, email, budget] = demo
    ? [DEMO_PROFILE, 'demo@creator-mode.local', DEMO_BUDGET]
    : await Promise.all([fetchProfile(), fetchUserEmail(), getBudgetStatus()]);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  const hasSubscription = !!profile?.push_subscription;

  return (
    <div className="space-y-8 animate-fade-in">
      <Header />
      {demo && <DemoBanner />}

      <WhyForm
        whyInitial={profile?.why_i_create ?? ''}
        forWhomInitial={profile?.for_whom ?? ''}
        frequencyInitial={profile?.reminder_frequency ?? 'daily_morning'}
      />

      <PushToggle vapidPublicKey={vapidKey} hasSubscription={hasSubscription} />

      <BudgetCard budget={budget} />

      <AccountCard email={email} />
    </div>
  );
}

function Header() {
  const t = useTranslations('settings');
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}
