'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/routing';

// אייקון להחלפת שפה — שומר את המסלול הנוכחי, רק מחליף locale
export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next: Locale = locale === 'he' ? 'en' : 'he';
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={isPending}
      aria-label={t('switch')}
      title={t('switch')}
    >
      <Languages className="h-5 w-5" />
    </Button>
  );
}
