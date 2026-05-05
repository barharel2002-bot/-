import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { MirrorView } from '@/components/mirror/mirror-view';
import { fetchMirrorData } from '@/lib/mirror/queries';
import { DEMO_MIRROR } from '@/lib/demo/data';
import { syncUserYouTubeData } from '@/lib/youtube/sync';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { createClient } from '@/lib/supabase/server';

export default async function MirrorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();

  // Demo mode: render with seed data, no sync.
  if (demo) {
    return (
      <div className="space-y-6">
        <Header />
        <DemoBanner />
        <MirrorView data={DEMO_MIRROR} />
      </div>
    );
  }

  // Real mode: trigger sync (24h cache) and render based on result.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Middleware should redirect, but guard anyway.
    return null;
  }

  const syncResult = await syncUserYouTubeData(user.id);

  // No channel linked → inline paste form, no other sections.
  if (syncResult.status === 'no-channel') {
    const t = await getTranslations('youtube');
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-base mb-4">{t('inline_prompt')}</p>
          <YouTubeChannelInput variant="inline" />
        </div>
      </div>
    );
  }

  // Banner copy for non-fatal sync states (we still serve cached data below).
  const t = await getTranslations('youtube');
  const banner =
    syncResult.status === 'quota-exceeded'
      ? t('quota_exceeded')
      : syncResult.status === 'error'
        ? 'Could not refresh from YouTube. Showing cached data.'
        : null;

  const data = await fetchMirrorData();

  return (
    <div className="space-y-6">
      <Header />
      {banner && (
        <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {banner}
        </div>
      )}
      {data && <MirrorView data={data} />}
    </div>
  );
}

function Header() {
  const t = useTranslations('mirror');
  return (
    <div className="space-y-2 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}
