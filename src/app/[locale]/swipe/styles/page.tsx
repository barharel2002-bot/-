import { setRequestLocale } from 'next-intl/server';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { SwipePage } from '@/components/swipes/swipe-page';
import { fetchSwipeQueue, fetchSwipeStats } from '@/lib/swipes/queries';
import { makeDemoSwipeQueue, DEMO_SWIPE_STATS } from '@/lib/demo/data';

export default async function SwipeStylesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const [queue, stats] = demo
    ? [makeDemoSwipeQueue('edit_styles'), DEMO_SWIPE_STATS]
    : await Promise.all([
        fetchSwipeQueue('edit_styles'),
        fetchSwipeStats('edit_styles'),
      ]);

  return (
    <>
      {demo && <DemoBanner />}
      <SwipePage category="edit_styles" queue={queue} stats={stats} />
    </>
  );
}
