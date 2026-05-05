import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

// באנר עליון לדפים שמציגים נתוני הדגמה (כשאין Supabase מוגדר)
// מסביר את המצב + לינק לאשף ההגדרה
export function DemoBanner() {
  const t = useTranslations('demo');
  const locale = useLocale();
  const Arrow = locale === 'he' ? ArrowLeft : ArrowRight;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-creator-purple/30 bg-creator-gradient-soft p-4">
      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-creator-purple" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold">{t('title')}</p>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>
      <Link
        href="/setup"
        className="flex items-center gap-1.5 self-center rounded-lg bg-creator-gradient px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-creator-purple/20 transition-transform hover:scale-105"
      >
        <span>{t('ctaSetup')}</span>
        <Arrow className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
