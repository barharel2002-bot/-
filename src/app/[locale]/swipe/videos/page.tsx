import { setRequestLocale } from 'next-intl/server';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { SwipePage } from '@/components/swipes/swipe-page';
import { fetchSwipeQueue, fetchSwipeStats } from '@/lib/swipes/queries';
import { makeDemoSwipeQueue, DEMO_SWIPE_STATS } from '@/lib/demo/data';

export default async function SwipeVideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const [queue, stats] = demo
    ? [makeDemoSwipeQueue('videos'), DEMO_SWIPE_STATS]
    : await Promise.all([fetchSwipeQueue('videos'), fetchSwipeStats('videos')]);

  return (
    <>
      {demo && <DemoBanner />}
      <SwipePage category="videos" queue={queue} stats={stats} />
    </>
  );
}
