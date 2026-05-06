import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Zap } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { SubscriptionInfo } from '@/lib/billing/subscription';

const TIER_ICON = {
  free: Sparkles,
  creator: Zap,
  pro: Crown,
} as const;

interface Props {
  sub: SubscriptionInfo;
  locale: 'he' | 'en';
}

// Shows current tier, status, period end. Links to pricing for upgrade,
// or to LS customer portal (when configured) for management.
export function SubscriptionCard({ sub, locale }: Props) {
  const Icon = TIER_ICON[sub.tier];
  const isHebrew = locale === 'he';
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  const tierLabel = isHebrew
    ? { free: 'חינם', creator: 'Creator', pro: 'Pro' }[sub.tier]
    : { free: 'Free', creator: 'Creator', pro: 'Pro' }[sub.tier];

  const statusLabel = (() => {
    if (!sub.status) return null;
    if (isHebrew) {
      return {
        active: 'פעיל',
        on_trial: 'בתקופת ניסיון',
        paused: 'מושהה',
        past_due: 'בפיגור תשלום',
        cancelled: 'יבוטל בסוף התקופה',
        expired: 'הסתיים',
      }[sub.status as string] ?? sub.status;
    }
    return sub.status.replace('_', ' ');
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isHebrew ? 'מנוי' : 'Subscription'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-creator-gradient-soft">
            <Icon className="h-5 w-5 text-creator-purple" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold">{tierLabel}</p>
            {statusLabel && (
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            )}
            {periodEnd && (
              <p className="text-xs text-muted-foreground">
                {sub.cancelAtPeriodEnd
                  ? isHebrew
                    ? `יסתיים ב-${periodEnd.toLocaleDateString(locale)}`
                    : `Ends on ${periodEnd.toLocaleDateString(locale)}`
                  : isHebrew
                    ? `יתחדש ב-${periodEnd.toLocaleDateString(locale)}`
                    : `Renews on ${periodEnd.toLocaleDateString(locale)}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sub.tier === 'free' && (
            <Link href="/pricing">
              <Button>{isHebrew ? 'שדרג' : 'Upgrade'}</Button>
            </Link>
          )}
          {sub.tier !== 'free' && (
            <>
              <Link href="/pricing">
                <Button variant="outline">
                  {isHebrew ? 'שנה תוכנית' : 'Change plan'}
                </Button>
              </Link>
              {/* LS customer portal — opens email-based magic link.
                  User clicks → LS sends an email with a one-time link to manage. */}
              <a
                href={`https://app.lemonsqueezy.com/billing`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="ghost">
                  {isHebrew ? 'נהל מנוי ב-Lemon Squeezy' : 'Manage in Lemon Squeezy'}
                </Button>
              </a>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
