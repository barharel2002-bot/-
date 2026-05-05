import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SignOutButton } from './sign-out-button';

type Props = {
  email: string | null;
};

export function AccountCard({ email }: Props) {
  const t = useTranslations('settings.account');

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-creator-purple" />
        <h2 className="text-base font-semibold">{t('section')}</h2>
      </div>

      {email && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t('signedInAs')}</p>
          <p dir="ltr" className="font-mono text-sm">
            {email}
          </p>
        </div>
      )}

      <SignOutButton />
    </Card>
  );
}
