'use client';

import { useEffect } from 'react';

// רושם את ה-Service Worker בטעינת האפליקציה — רק ב-production.
// בפיתוח (HMR) ה-SW יכול לחבל ברענון אוטומטי.
// אם יש SW רשום מקודם בפיתוח — נסיר אותו.
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // נקה SW קיים בפיתוח כדי לא לחבל ב-HMR
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      // נקה caches שלנו אם נשארו
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys
            .filter((k) => k.startsWith('creator-'))
            .forEach((k) => caches.delete(k));
        });
      }
      return;
    }

    function register() {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('[SW] registration failed:', err);
        });
    }

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
