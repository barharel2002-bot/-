import { useTranslations } from 'next-intl';
import { Sparkles, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { BudgetStatus } from '@/lib/ai/budget';

type Props = {
  budget: BudgetStatus | null;
};

export function BudgetCard({ budget }: Props) {
  const t = useTranslations('budget');

  if (!budget) return null;

  const usedDollars = (budget.usedCents / 100).toFixed(2);
  const totalDollars = (budget.budgetCents / 100).toFixed(0);
  const percentInt = Math.min(100, Math.round(budget.percent * 100));

  const StatusIcon =
    budget.status === 'blocked'
      ? Ban
      : budget.status === 'warning'
        ? AlertTriangle
        : CheckCircle2;

  const statusColor =
    budget.status === 'blocked'
      ? 'text-red-400'
      : budget.status === 'warning'
        ? 'text-amber-400'
        : 'text-emerald-400';

  const barColor =
    budget.status === 'blocked'
      ? 'bg-red-500'
      : budget.status === 'warning'
        ? 'bg-amber-500'
        : 'bg-creator-gradient';

  const statusLabel =
    budget.status === 'blocked'
      ? t('statusBlocked')
      : budget.status === 'warning'
        ? t('statusWarning')
        : t('statusOk');

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-creator-purple" />
        <h2 className="text-base font-semibold">{t('section')}</h2>
      </div>

      {/* Bar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold">${usedDollars}</span>
          <span className="text-sm text-muted-foreground">
            {t('of')} ${totalDollars}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${barColor}`}
            style={{ width: `${percentInt}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
            <span className={statusColor}>{statusLabel}</span>
          </span>
          <span className="text-muted-foreground">{percentInt}%</span>
        </div>
      </div>

      {/* פירוט טוקנים */}
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted-foreground">{t('input')}</p>
          <p className="font-mono text-sm">
            {budget.inputTokens.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('output')}</p>
          <p className="font-mono text-sm">
            {budget.outputTokens.toLocaleString()}
          </p>
        </div>
      </div>

      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        {t('resetInfo')}
      </p>
    </Card>
  );
}
