import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // השפות הנתמכות באפליקציה
  locales: ['he', 'en'],
  // ברירת מחדל — עברית
  defaultLocale: 'he',
  // הצגת ה-locale בכתובת תמיד (גם לעברית)
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

// Wrappers דקים סביב <Link> וניווט שמכבדים את ה-locale הנוכחי
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
