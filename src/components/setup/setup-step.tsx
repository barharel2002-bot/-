import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description: string;
  configured: boolean;
  required?: boolean;
  externalUrl?: string;
  externalLabel?: string;
  children?: React.ReactNode;
};

// קלף עבור כל שלב באשף ההגדרה.
// סטטוס ירוק/כתום, כפתור לפתיחת ה-dashboard החיצוני, וגוף עם הוראות
export function SetupStep({
  title,
  description,
  configured,
  required = true,
  externalUrl,
  externalLabel,
  children,
}: Props) {
  const t = useTranslations('setup.wizard');
  const StatusIcon = configured ? CheckCircle2 : AlertCircle;

  return (
    <Card
      className={cn(
        'space-y-4 p-6 transition-colors',
        configured && 'border-emerald-500/30'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            configured
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-amber-500/15 text-amber-400'
          )}
        >
          <StatusIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                required
                  ? 'bg-creator-purple/20 text-creator-purple'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {required ? t('required') : t('optional')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p
            className={cn(
              'text-xs font-medium',
              configured ? 'text-emerald-400' : 'text-amber-400'
            )}
          >
            {configured ? `✓ ${t('configured')}` : `⚠ ${t('missing')}`}
          </p>
        </div>
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-creator-purple hover:text-creator-purple"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{externalLabel ?? t('openDashboard')}</span>
          </a>
        )}
      </div>

      {!configured && children && (
        <div className="space-y-3 border-t border-border pt-4">{children}</div>
      )}
    </Card>
  );
}

// משמש להצגת רשימה ממוספרת של צעדים בתוך setup-step
export function StepList({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-creator-gradient-soft text-[11px] font-bold text-creator-purple">
            {i + 1}
          </span>
          <div className="flex-1 leading-relaxed">{item}</div>
        </li>
      ))}
    </ol>
  );
}
