import { setRequestLocale } from 'next-intl/server';
import { isSupabaseConfigured, isYouTubeConfigured } from '@/lib/config';
import { SetupGate } from '@/components/shared/setup-gate';
import { CREATORS_LIBRARY, type LearnCategory } from '@/config/creators.config';
import { fetchLearnVideos } from '@/lib/youtube/search';
import { fetchSavedVideos, fetchSavedVideoMap } from '@/lib/learn/queries';
import { LearnPage } from '@/components/learn/learn-page';

const VALID_CATEGORIES: LearnCategory[] = [
  'creating_content',
  'spotting_opportunities',
  'persistence',
  'on_camera_confidence',
  'social_strategy',
];

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const missing: string[] = [];
  if (!isSupabaseConfigured()) missing.push('Supabase');
  if (!isYouTubeConfigured()) missing.push('YouTube');
  if (missing.length > 0) return <SetupGate missing={missing} />;

  const sp = await searchParams;
  const requestedCategory = sp.category as LearnCategory | undefined;
  const category: LearnCategory =
    requestedCategory && VALID_CATEGORIES.includes(requestedCategory)
      ? requestedCategory
      : 'creating_content';

  const config = CREATORS_LIBRARY.find((c) => c.category === category);
  const queries = config?.searchQueries ?? [];

  const [fetchResult, savedMap, savedList] = await Promise.all([
    fetchLearnVideos(queries),
    fetchSavedVideoMap(),
    fetchSavedVideos(),
  ]);

  return (
    <LearnPage
      initialCategory={category}
      initialVideos={fetchResult.ok ? fetchResult.videos : []}
      initialError={fetchResult.ok ? null : fetchResult.error}
      savedMap={savedMap}
      savedList={savedList}
    />
  );
}
