import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LocaleToggle } from './locale-toggle';

// כותרת עליונה — שם האפליקציה + החלפת שפה
export function Header() {
  const t = useTranslations('app');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-creator-gradient transition-transform group-hover:scale-105" />
          <span className="text-base font-semibold tracking-tight">{t('name')}</span>
        </Link>
        <LocaleToggle />
      </div>
    </header>
  );
}
