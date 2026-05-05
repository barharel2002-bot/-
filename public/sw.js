// Service Worker — מצב יוצר
// אחראי על: התראות push, app shell caching, offline fallback
// Bumping גרסה גורם ל-update כשמורידים גרסה חדשה

const VERSION = 'v2';
const SHELL_CACHE = `creator-shell-${VERSION}`;
const RUNTIME_CACHE = `creator-runtime-${VERSION}`;

// משאבים ש-precache בעת התקנה — חייבים להיות נתיבים ציבוריים
const SHELL_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  // התקנה מיידית, בלי המתנה
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // ניקוי caches ישנים
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('creator-') && !k.endsWith(`-${VERSION}`))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// =====================================
// אסטרטגיית fetch — נבדל לפי סוג בקשה
// =====================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // רק GET — POST/PUT/DELETE עוברים ישירות ל-network
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // לא לעצור בקשות חיצוניות (YouTube, Supabase, וכו')
  if (url.origin !== self.location.origin) return;

  // API routes — תמיד network, אין cache (מידע דינמי + אבטחה)
  if (url.pathname.startsWith('/api/')) return;

  // Static Next.js assets — cache-first (immutable hashes)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // SVG icons + manifest — cache-first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // HTML navigation — network-first עם fallback ל-cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // אחר — network עם fallback ל-cache
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // נפילה אחורה — דף הבית מ-cache (אם יש), או 503
    const fallback = await cache.match('/he');
    if (fallback) return fallback;
    return new Response('Offline', { status: 503 });
  }
}

// =====================================
// Push notifications (פיצ'ר 6)
// =====================================
self.addEventListener('push', (event) => {
  let payload = { title: 'מצב יוצר', body: 'תזכורת', url: '/' };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    dir: 'auto',
    data: { url: payload.url || '/' },
    tag: 'creator-mode-reminder',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
