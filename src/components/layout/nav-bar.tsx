'use client';

import {
  Home,
  Lightbulb,
  Plus,
  Sparkles,
  Settings as SettingsIcon,
  Video,
  BookOpen,
  PenLine,
  BarChart3,
  ArrowLeftRight,
  TrendingUp,
  Compass,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useQuickCapture } from '@/components/quick-capture/quick-capture-provider';

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof Home;
  primary?: boolean; // FAB מורם — רק ב-bottom nav של מובייל
};

// סדר הסיידבר בדסקטופ — מסודר לפי תדירות שימוש (גבוה למעלה, נמוך למטה).
// הגדרות תמיד אחרון.
const SIDEBAR_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/ideas', labelKey: 'ideas', icon: Lightbulb },
  { href: '/find-next', labelKey: 'findNext', icon: Compass },
  { href: '/title', labelKey: 'yt_titles', icon: Type },
  { href: '/copy', labelKey: 'yt_description', icon: PenLine },
  { href: '/thumbnail', labelKey: 'yt_thumbnail', icon: ImageIcon },
  { href: '/analyze', labelKey: 'analyze', icon: Video },
  { href: '/channels', labelKey: 'channels', icon: TrendingUp },
  { href: '/analytics', labelKey: 'analytics', icon: BarChart3 },
  { href: '/swipe/videos', labelKey: 'swipe', icon: ArrowLeftRight },
  { href: '/learn', labelKey: 'learn', icon: BookOpen },
  { href: '/settings', labelKey: 'settings', icon: SettingsIcon },
];

// ניווט תחתון של מובייל — 5 פריטים בלבד (Home, Ideas, +, FindNext, Settings)
const MOBILE_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/ideas', labelKey: 'ideas', icon: Lightbulb },
  { href: '#add-idea', labelKey: 'addIdea', icon: Plus, primary: true },
  { href: '/find-next', labelKey: 'findNext', icon: Compass },
  { href: '/settings', labelKey: 'settings', icon: SettingsIcon },
];

export function NavBar() {
  const t = useTranslations();
  const pathname = usePathname();
  const quickCapture = useQuickCapture();

  return (
    <>
      {/* ניווט תחתון — מובייל בלבד */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-md md:hidden"
        aria-label={t('nav.home')}
      >
        <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {MOBILE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href.split('?')[0]);

            if (item.primary) {
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => quickCapture.open()}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-creator-gradient text-white shadow-lg shadow-creator-purple/30 transition-transform active:scale-95"
                    aria-label={t('home.addIdea')}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[11px] transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', isActive && 'text-creator-purple')}
                  />
                  <span>{t(`nav.${item.labelKey}` as any)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* סיידבר — דסקטופ בלבד. מסודר לפי תדירות שימוש. */}
      <aside
        className="hidden md:fixed md:inset-y-0 md:start-0 md:z-30 md:block md:w-60 md:border-e md:border-border md:bg-background md:pt-16"
        aria-label={t('nav.home')}
      >
        <ul className="flex flex-col gap-0.5 px-3 py-4">
          {/* כפתור הוספה גרדיאנטי בראש (FAB) — הגישה החשובה ביותר */}
          <li className="mb-2">
            <button
              type="button"
              onClick={() => quickCapture.open()}
              className="flex w-full items-center gap-3 rounded-lg bg-creator-gradient px-3 py-2 text-sm font-medium text-white shadow-lg shadow-creator-purple/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span>{t('home.addIdea')}</span>
            </button>
          </li>

          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const cleanHref = item.href.split('?')[0];
            const isActive =
              cleanHref === '/' ? pathname === '/' : pathname.startsWith(cleanHref);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-card text-foreground'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4', isActive && 'text-creator-purple')}
                  />
                  <span>{t(`nav.${item.labelKey}` as any)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="absolute bottom-4 inset-x-3 rounded-lg bg-card p-3 text-xs text-muted-foreground">
          <Sparkles className="mb-1 h-4 w-4 text-creator-purple" />
          <p className="leading-relaxed">{t('app.tagline')}</p>
        </div>
      </aside>
    </>
  );
}
