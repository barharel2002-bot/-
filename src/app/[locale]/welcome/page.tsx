import { setRequestLocale } from 'next-intl/server';
import { useTranslations, useLocale } from 'next-intl';
import {
  Sparkles,
  Type,
  Image as ImageIcon,
  Compass,
  Eye,
  ArrowRight,
  ArrowLeft,
  Zap,
  Check,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Content />;
}

function Content() {
  const locale = useLocale();
  const t = useTranslations('welcome');
  const Arrow = locale === 'he' ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Type, key: 'titles', href: '/title' },
    { icon: ImageIcon, key: 'thumbnails', href: '/thumbnail' },
    { icon: Compass, key: 'findNext', href: '/find-next' },
    { icon: Eye, key: 'analyze', href: '/analyze' },
  ] as const;

  return (
    <div className="space-y-20 animate-fade-in pt-8">
      {/* Hero */}
      <section className="space-y-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-creator-purple" />
          <span className="text-muted-foreground">{t('hero.badge')}</span>
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          <span className="text-gradient-creator">{t('hero.titleA')}</span>
          <br />
          {t('hero.titleB')}
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          {t('hero.subtitle')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth">
            <Button size="lg" className="gap-2">
              {t('hero.ctaPrimary')}
              <Arrow className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              {t('hero.ctaSecondary')}
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">{t('hero.noCard')}</p>
      </section>

      {/* Features */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold md:text-3xl">{t('features.heading')}</h2>
          <p className="text-muted-foreground">{t('features.sub')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.key}
                className="group rounded-xl border border-border bg-card/40 p-5 transition-colors hover:border-creator-purple/40"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-creator-gradient-soft">
                  <Icon className="h-5 w-5 text-creator-purple" />
                </div>
                <h3 className="text-base font-semibold">
                  {t(`features.cards.${f.key}.title`)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {t(`features.cards.${f.key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold md:text-3xl">{t('how.heading')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-creator-gradient text-sm font-bold text-white">
                {n}
              </div>
              <h3 className="font-semibold">{t(`how.step${n}.title`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`how.step${n}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="rounded-2xl border border-border bg-card/40 p-8 text-center">
        <Zap className="mx-auto h-8 w-8 text-creator-orange" />
        <h2 className="mt-3 text-2xl font-bold">{t('pricingTeaser.heading')}</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
          {t('pricingTeaser.sub')}
        </p>
        <ul className="mt-6 mx-auto max-w-md space-y-2 text-sm text-start">
          {(['t1', 't2', 't3'] as const).map((k) => (
            <li key={k} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span>{t(`pricingTeaser.bullets.${k}`)}</span>
            </li>
          ))}
        </ul>
        <Link href="/pricing">
          <Button size="lg" className="mt-6 gap-2">
            {t('pricingTeaser.cta')}
            <Arrow className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            {t('footer.pricing')}
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t('footer.privacy')}
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t('footer.terms')}
          </Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} {t('footer.copy')}</p>
      </footer>
    </div>
  );
}
