import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Heebo } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Header } from '@/components/layout/header';
import { NavBar } from '@/components/layout/nav-bar';
import { RegisterSW } from '@/components/shared/register-sw';
import { OfflineIndicator } from '@/components/shared/offline-indicator';
import { QuickCaptureProvider } from '@/components/quick-capture/quick-capture-provider';
import {
  isSupabaseConfigured,
  isOpenAIConfigured,
} from '@/lib/config';
import type { ReactNode } from 'react';

// פונטים — Inter לאנגלית, Heebo לעברית
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'מצב יוצר',
  description: 'כל רגע הוא הזדמנות',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'מצב יוצר',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// יצירת מסלולים סטטיים לכל locale בזמן build
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // ולידציה — אם השפה לא נתמכת, 404
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // הפעלת locale עבור Server Components
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  // ערכי קונפיג שיכלו ב-QuickCaptureProvider
  const quickEnabled = isSupabaseConfigured();
  const whisperEnabled = isOpenAIConfigured();

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${heebo.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          {/* Suspense boundary required because QuickCaptureProvider uses
              useSearchParams() — without it, every page bails out of static
              prerendering during build. */}
          <Suspense fallback={null}>
            <QuickCaptureProvider
              enabled={quickEnabled}
              whisperEnabled={whisperEnabled}
            >
              <Header />
              <NavBar />
              <OfflineIndicator />
              <RegisterSW />

              {/* תוכן ראשי — ריווח לסיידבר בדסקטופ ולניווט תחתון במובייל */}
              <main className="md:ps-60">
                <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-10 md:pt-10">
                  {children}
                </div>
              </main>
            </QuickCaptureProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
