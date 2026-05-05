import { useTranslations } from 'next-intl';
import { Sparkles, type LucideIcon } from 'lucide-react';

// Placeholder אחיד לכל פיצ'ר שעוד לא נבנה
// כך שלמשתמש תהיה תחושה של מערכת מלאה כבר באבן דרך 1
type Props = {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  milestone: string;
  bullets?: string[];
};

export function FeaturePlaceholder({
  icon: Icon,
  titleKey,
  descriptionKey,
  milestone,
  bullets = [],
}: Props) {
  const t = useTranslations();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-creator-gradient-soft">
          <Icon className="h-6 w-6 text-creator-purple" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t(titleKey as any)}</h1>
        <p className="text-base text-muted-foreground">
          {t(descriptionKey as any)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-creator-purple" />
          <span className="font-medium">{t('common.comingSoon')}</span>
          <span className="text-muted-foreground">— {milestone}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('common.underConstruction')}</p>
        {bullets.length > 0 && (
          <ul className="mt-4 space-y-2">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-creator-purple" />
                <span className="text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
