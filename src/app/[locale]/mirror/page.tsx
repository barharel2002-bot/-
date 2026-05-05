import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { isSupabaseConfigured } from '@/lib/config';
import { DemoBanner } from '@/components/shared/demo-banner';
import { MirrorView } from '@/components/mirror/mirror-view';
import { fetchMirrorData } from '@/lib/mirror/queries';
import { DEMO_MIRROR } from '@/lib/demo/data';

export default async function MirrorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const demo = !isSupabaseConfigured();
  const data = demo ? DEMO_MIRROR : await fetchMirrorData();

  return (
    <div className="space-y-6">
      <Header />
      {demo && <DemoBanner />}
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
