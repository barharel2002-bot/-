// =====================================
// CSRF State Token — להגנה על OAuth callbacks
// יוצרים מחרוזת אקראית לכל init, שומרים ב-cookie httpOnly,
// ובודקים שהיא תואמת ב-callback
// =====================================

import { cookies } from 'next/headers';

const STATE_COOKIE_PREFIX = 'oauth_state_';
const STATE_MAX_AGE_SECONDS = 600; // 10 דקות

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createStateForPlatform(
  platform: 'youtube' | 'instagram' | 'tiktok'
): Promise<string> {
  const state = generateState();
  const cookieStore = await cookies();
  cookieStore.set(`${STATE_COOKIE_PREFIX}${platform}`, state, {
    httpOnly: true,
    sameSite: 'lax', // OAuth redirects חוזרים מ-domain חיצוני
    secure: process.env.NODE_ENV === 'production',
    maxAge: STATE_MAX_AGE_SECONDS,
    path: '/',
  });
  return state;
}

export async function consumeStateForPlatform(
  platform: 'youtube' | 'instagram' | 'tiktok',
  receivedState: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieName = `${STATE_COOKIE_PREFIX}${platform}`;
  const stored = cookieStore.get(cookieName)?.value;
  cookieStore.delete(cookieName);
  if (!stored) return false;
  if (stored.length !== receivedState.length) return false;
  // השוואה אבטחתית — אורך זהה ערך-בערך, לא משתמשים ב-=== למנוע timing
  let diff = 0;
  for (let i = 0; i < stored.length; i++) {
    diff |= stored.charCodeAt(i) ^ receivedState.charCodeAt(i);
  }
  return diff === 0;
}
