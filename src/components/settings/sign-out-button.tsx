'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/actions';

export function SignOutButton() {
  const t = useTranslations('settings.account');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      onClick={() => startTransition(() => signOut(locale))}
      disabled={isPending}
    >
      <LogOut className="h-4 w-4" />
      {t('signOut')}
    </Button>
  );
}
