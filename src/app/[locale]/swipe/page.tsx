import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';
import { listTrackedCreators } from '@/lib/swipes/tracked-creators';
import { listSelectedCategories } from '@/lib/swipes/categories';
import {
  fetchShortsFromPlaylists,
  mergeAndDedupe,
  deterministicShuffle,
} from '@/lib/swipes/shorts-feed';
import { SHORTS_CATEGORIES } from '@/config/creators.config';
import { CategoriesPanel } from '@/components/swipes/CategoriesPanel';
import { TrackedCreatorsPanel } from '@/components/swipes/TrackedCreatorsPanel';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { ShortsDeck } from '@/components/swipes/ShortsDeck';

const PAGE_SIZE = 20;

export default async function SwipePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // In demo mode (no Supabase), render a friendly empty state.
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6 p-2 sm:p-4">
        <Header />
        <p className="text-sm text-muted-foreground">
          Demo mode — sign in with Supabase configured to use Style Swipes.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('youtube_channel_id')
    .eq('id', user.id)
    .maybeSingle();

  // Empty state: no channel linked → inline paste form.
  if (!profile?.youtube_channel_id) {
    const t = await getTranslations('youtube');
    return (
      <div className="space-y-6 p-2 sm:p-4">
        <Header />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-base mb-4">{t('inline_prompt')}</p>
          <YouTubeChannelInput variant="inline" />
        </div>
      </div>
    );
  }

  const [activeCats, creators] = await Promise.all([
    listSelectedCategories(user.id),
    listTrackedCreators(user.id),
  ]);

  // Build playlist list: from selected categories + tracked creators.
  const playlistIds: string[] = [];
  for (const c of SHORTS_CATEGORIES) {
    if (activeCats.includes(c.id)) {
      for (const ch of c.channels) playlistIds.push(ch.uploadsPlaylist);
    }
  }
  for (const c of creators) playlistIds.push(c.uploads_playlist);

  let cards: Awaited<ReturnType<typeof fetchShortsFromPlaylists>> = [];
  if (playlistIds.length > 0) {
    cards = await fetchShortsFromPlaylists(playlistIds, 10);
    cards = mergeAndDedupe(cards);

    const today = new Date().toISOString().slice(0, 10);
    const seed = `${user.id}:${today}`;
    cards = deterministicShuffle(cards, seed).slice(0, PAGE_SIZE);
  }

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <Header />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CategoriesLabel />
        </h2>
        <CategoriesPanel categories={SHORTS_CATEGORIES} active={activeCats} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CreatorsLabel />
        </h2>
        <TrackedCreatorsPanel creators={creators} />
      </section>

      <section>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <NoCardsLabel />
          </p>
        ) : (
          <ShortsDeck cards={cards} />
        )}
      </section>
    </div>
  );
}

function Header() {
  const t = useTranslations('swipes');
  return (
    <div className="space-y-2 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
    </div>
  );
}

function CategoriesLabel() {
  const t = useTranslations('swipes');
  return <>{t('categories_label')}</>;
}

function CreatorsLabel() {
  const t = useTranslations('swipes');
  return <>{t('creators_label')}</>;
}

function NoCardsLabel() {
  const t = useTranslations('swipes');
  return <>{t('no_categories_or_creators')}</>;
}
