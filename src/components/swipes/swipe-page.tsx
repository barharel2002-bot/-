import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card } from '@/components/ui/card';
import { Heart, X as XIcon } from 'lucide-react';
import { AddLinkForm } from './add-link-form';
import { SwipeDeck } from './swipe-deck';
import type { SwipeItemRow } from '@/lib/swipes/queries';
import type { SwipeCategory } from '@/types';

type Props = {
  category: SwipeCategory;
  queue: SwipeItemRow[];
  stats: { liked: number; skipped: number };
};

const CATEGORY_TO_SLUG: Record<SwipeCategory, string> = {
  videos: 'videos',
  edit_styles: 'styles',
  photos: 'photos',
};

export function SwipePage({ category, queue, stats }: Props) {
  const t = useTranslations('swipes');
  const subKey =
    category === 'videos'
      ? 'videos'
      : category === 'edit_styles'
        ? 'styles'
        : 'photos';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* כותרת */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-base text-muted-foreground">
          {t(`subtitle.${subKey}` as any)}
        </p>
      </div>

      {/* טאבים בין שלושת הקטגוריות */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Tab href="/swipe/videos" labelKey="videos" active={category === 'videos'} />
        <Tab
          href="/swipe/styles"
          labelKey="styles"
          active={category === 'edit_styles'}
        />
        <Tab href="/swipe/photos" labelKey="photos" active={category === 'photos'} />
      </div>

      {/* טופס הוספת קישור */}
      <AddLinkForm category={category} />

      {/* ספירות (אם יש) */}
      {(stats.liked > 0 || stats.skipped > 0) && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            count={stats.liked}
            label={t('decided.liked')}
            tone="like"
          />
          <StatCard
            count={stats.skipped}
            label={t('decided.skipped')}
            tone="skip"
          />
        </div>
      )}

      {/* הדק */}
      <SwipeDeck initialQueue={queue} />
    </div>
  );
}

function Tab({
  href,
  labelKey,
  active,
}: {
  href: string;
  labelKey: string;
  active: boolean;
}) {
  const t = useTranslations('swipes.tabs');
  return (
    <Link
      href={href}
      className={
        'whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ' +
        (active
          ? 'bg-creator-gradient text-white'
          : 'border border-border text-muted-foreground hover:text-foreground')
      }
    >
      {t(labelKey as any)}
    </Link>
  );
}

function StatCard({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'like' | 'skip';
}) {
  const Icon = tone === 'like' ? Heart : XIcon;
  const colorClass = tone === 'like' ? 'text-emerald-400' : 'text-muted-foreground';
  return (
    <Card className="flex items-center gap-3 p-3">
      <Icon className={`h-4 w-4 ${colorClass}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{count}</p>
      </div>
    </Card>
  );
}
