import { setRequestLocale } from 'next-intl/server';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { SwipePage } from '@/components/swipes/swipe-page';
import { fetchSwipeQueue, fetchSwipeStats } from '@/lib/swipes/queries';
import { makeDemoSwipeQueue, DEMO_SWIPE_STATS } from '@/lib/demo/data';

export default async function SwipePhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const [queue, stats] = demo
    ? [makeDemoSwipeQueue('photos'), DEMO_SWIPE_STATS]
    : await Promise.all([fetchSwipeQueue('photos'), fetchSwipeStats('photos')]);

  return (
    <>
      {demo && <DemoBanner />}
      <SwipePage category="photos" queue={queue} stats={stats} />
    </>
  );
}
