import { setRequestLocale } from 'next-intl/server';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { IdeasBoard } from '@/components/ideas/ideas-board';
import { fetchIdeas } from '@/lib/ideas/queries';
import { DEMO_IDEAS } from '@/lib/demo/data';

export default async function IdeasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const ideas = demo ? DEMO_IDEAS : await fetchIdeas();

  return (
    <>
      {demo && <DemoBanner />}
      <IdeasBoard ideas={ideas} />
    </>
  );
}
