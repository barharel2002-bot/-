import { useTranslations } from 'next-intl';
import { AlertTriangle, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

// מסך שמופיע כשמפתחות סביבה חסרים
// מסביר למה ומפנה ל-README

type Props = {
  missing: string[];
};

export function SetupGate({ missing }: Props) {
  const t = useTranslations('setup');

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-creator-gradient-soft">
        <AlertTriangle className="h-7 w-7 text-creator-purple" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-base text-muted-foreground">{t('missingSupabase')}</p>
      </div>

      <Card className="w-full p-5 text-start">
        <p className="mb-3 text-sm font-medium">{t('showMissing')}:</p>
        <ul className="space-y-1.5">
          {missing.map((m) => (
            <li key={m} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-creator-orange" />
              <span className="font-mono">{m}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{t('instructions')}</span>
      </div>
    </div>
  );
}
