import { setRequestLocale } from 'next-intl/server';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Tier {
  id: 'free' | 'creator' | 'pro';
  icon: typeof Sparkles;
  accent: string;
  href: string; // internal route OR external LS checkout URL (set via env)
  external: boolean;
  bullets: string[];
  highlight?: boolean;
}

function buildTiers(): Tier[] {
  // External checkout URLs come from env. If not set yet, fall back to /auth so
  // the button still works (user lands on the auth page; we'll redirect them
  // through checkout once env is wired).
  const creatorCheckout = process.env.NEXT_PUBLIC_LS_CHECKOUT_CREATOR;
  const proCheckout = process.env.NEXT_PUBLIC_LS_CHECKOUT_PRO;

  return [
    {
      id: 'free',
      icon: Sparkles,
      accent: 'border-border',
      href: '/auth',
      external: false,
      bullets: ['ai5', 'titles', 'community', 'noCard'],
    },
    {
      id: 'creator',
      icon: Zap,
      accent: 'border-creator-purple ring-1 ring-creator-purple/20',
      href: creatorCheckout ?? '/auth?intent=creator',
      external: !!creatorCheckout,
      bullets: ['ai50', 'allFeatures', 'channelLink', 'priority', 'cancel'],
      highlight: true,
    },
    {
      id: 'pro',
      icon: Crown,
      accent: 'border-creator-orange',
      href: proCheckout ?? '/auth?intent=pro',
      external: !!proCheckout,
      bullets: ['unlimited', 'multiChannel', 'alerts', 'earlyAccess', 'cancel'],
    },
  ];
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Content />;
}

function Content() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const tiers = buildTiers();

  return (
    <div className="space-y-12 animate-fade-in pt-4">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t('heading')}</h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
          {t('sub')}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <Card
              key={tier.id}
              className={`flex flex-col p-6 ${tier.accent} ${tier.highlight ? 'relative' : ''}`}
            >
              {tier.highlight && (
                <span className="absolute top-3 inset-x-0 mx-auto w-fit rounded-full bg-creator-gradient px-3 py-0.5 text-[11px] font-semibold text-white">
                  {t('mostPopular')}
                </span>
              )}
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-creator-gradient-soft">
                  <Icon className="h-5 w-5 text-creator-purple" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t(`tiers.${tier.id}.name`)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`tiers.${tier.id}.tagline`)}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {t(`tiers.${tier.id}.price`)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(`tiers.${tier.id}.period`)}
                  </span>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm leading-relaxed">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>{t(`bullets.${b}`)}</span>
                  </li>
                ))}
              </ul>
              {tier.external ? (
                <a href={tier.href} className="mt-6 block" rel="noreferrer">
                  <Button
                    className="w-full"
                    variant={tier.highlight ? 'default' : 'outline'}
                  >
                    {t(`tiers.${tier.id}.cta`)}
                  </Button>
                </a>
              ) : (
                <Link href={tier.href} className="mt-6">
                  <Button
                    className="w-full"
                    variant={tier.highlight ? 'default' : 'outline'}
                  >
                    {t(`tiers.${tier.id}.cta`)}
                  </Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card/40 p-6 text-sm text-muted-foreground space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('faq.heading')}</h2>
        {(['cancel', 'budget', 'upgrade', 'data'] as const).map((q) => (
          <details key={q} className="group">
            <summary className="cursor-pointer font-medium text-foreground transition-colors hover:text-creator-purple">
              {t(`faq.${q}.q`)}
            </summary>
            <p className="mt-2 leading-relaxed">{t(`faq.${q}.a`)}</p>
          </details>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/welcome">{t('back')}</Link>
          <Link href="/privacy">{t('privacy')}</Link>
          <Link href="/terms">{t('terms')}</Link>
        </div>
      </footer>
    </div>
  );
}
