import type { ReactNode } from 'react';
import './globals.css';

// Layout שורש — הכול עובר ב-[locale]/layout.tsx
// next-intl מצפה ש-html/body יהיו בתוך [locale]
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
