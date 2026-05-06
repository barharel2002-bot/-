import {
  Lightbulb,
  Video,
  ArrowLeftRight,
  BookOpen,
  PenLine,
  BarChart3,
  Settings as SettingsIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Compass,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config';

// שולף את שם התצוגה של המשתמש המחובר. סדר עדיפות:
// 1. user_metadata.full_name (Google OAuth מספק את זה)
// 2. user_metadata.name
// 3. החלק הראשון של המייל ("bar.harel.2002" → "Bar Harel 2002")
// 4. null אם המשתמש לא מחובר (אורח)
async function getDisplayName(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const meta = user.user_metadata ?? {};
    if (typeof meta.full_name === 'string' && meta.full_name.trim())
      return meta.full_name.trim();
    if (typeof meta.name === 'string' && meta.name.trim()) return meta.name.trim();
    const email = user.email ?? '';
    const local = email.split('@')[0] ?? '';
    if (!local) return null;
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  } catch {
    return null;
  }
}

type FeatureKey =
  | 'ideas'
  | 'findNext'
  | 'ytTitles'
  | 'ytDescription'
  | 'ytThumbnail'
  | 'analyze'
  | 'swipe'
  | 'learn'
  | 'analytics'
  | 'settings';

const FEATURES: { key: FeatureKey; href: string; icon: typeof Lightbulb }[] = [
  { key: 'ideas', href: '/ideas', icon: Lightbulb },
  { key: 'findNext', href: '/find-next', icon: Compass },
  { key: 'ytTitles', href: '/title', icon: Type },
  { key: 'ytDescription', href: '/copy', icon: PenLine },
  { key: 'ytThumbnail', href: '/thumbnail', icon: ImageIcon },
  { key: 'analyze', href: '/analyze', icon: Video },
  { key: 'analytics', href: '/analytics', icon: BarChart3 },
  { key: 'swipe', href: '/swipe/videos', icon: ArrowLeftRight },
  { key: 'learn', href: '/learn', icon: BookOpen },
  { key: 'settings', href: '/settings', icon: SettingsIcon },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const displayName = await getDisplayName();
  return <HomeContent displayName={displayName} />;
}

function HomeContent({ displayName }: { displayName: string | null }) {
  const t = useTranslations('home');
  const tApp = useTranslations('app');
  const locale = useLocale();
  const Arrow = locale === 'he' ? ArrowLeft : ArrowRight;
  const greeting = displayName
    ? `${t('greeting')}, ${displayName}`
    : t('greeting');

  return (
    <div className="space-y-10 animate-fade-in">
      {/* גיבור — ברכת השראה */}
      <section className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-creator-purple" />
          <span>{tApp('tagline')}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          {greeting}
        </h1>
        <p className="text-lg text-muted-foreground md:text-xl">
          <span className="text-gradient-creator">{t('subgreeting')}</span>
        </p>
      </section>

      {/* פעולה מהירה — כפתור הוספת רעיון */}
      <section>
        <Link
          href="/ideas?new=1"
          className="group flex items-center justify-between rounded-2xl bg-creator-gradient p-6 text-white shadow-xl shadow-creator-purple/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <div>
            <p className="text-xs uppercase tracking-wider opacity-90">
              {t('quickActions')}
            </p>
            <p className="mt-1 text-2xl font-semibold">{t('addIdea')}</p>
          </div>
          <Arrow className="h-6 w-6 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </section>

      {/* רשת פיצ'רים */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {t('exploreFeatures')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.key} href={feature.href} className="block">
                <Card className="group h-full p-5 transition-all hover:border-creator-purple/40 hover:bg-card/80">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-creator-gradient-soft">
                    <Icon className="h-5 w-5 text-creator-purple" />
                  </div>
                  <CardTitle className="text-base">
                    {t(`features.${feature.key}.title`)}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {t(`features.${feature.key}.description`)}
                  </CardDescription>
                </Card>
                          </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
