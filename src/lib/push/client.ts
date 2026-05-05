// פונקציות עזר לרישום ל-Web Push בצד הלקוח

// המרת VAPID public key מ-base64 ל-Uint8Array (נדרש ע"י ה-API)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// רושם service worker, מבקש הרשאה, ויוצר subscription
// מחזיר את הסאבסקריפשן או null אם נכשל
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  // 1. רשום SW
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // 2. בקש הרשאה
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  // 3. בדוק אם כבר יש subscription
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) return subscription;

  // 4. צור חדש
  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return true;
  return sub.unsubscribe();
}
