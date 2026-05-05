// קונפיגורציה של ספריית ההדרכה (פיצ'ר 3)
// נערך כאן ידנית — האפליקציה משתמשת בו כדי למשוך סרטונים מ-YouTube
// ערוצים ושאילתות חיפוש מומלצים, מקובצים לפי קטגוריות

export type LearnCategory =
  | 'creating_content'
  | 'spotting_opportunities'
  | 'persistence'
  | 'on_camera_confidence'
  | 'social_strategy';

export interface CreatorConfig {
  category: LearnCategory;
  searchQueries: string[];      // שאילתות חיפוש ל-YouTube Search
  channelHandles?: string[];    // ערוצים מומלצים (Handle, לא ID)
  shortsOnly?: boolean;         // אם רוצים רק Shorts
}

export const CREATORS_LIBRARY: CreatorConfig[] = [
  {
    category: 'creating_content',
    searchQueries: [
      'content creation tips for instagram reels',
      'how to make engaging short videos',
    ],
  },
  {
    category: 'spotting_opportunities',
    searchQueries: [
      'how creators spot viral content ideas',
      'finding content opportunities daily',
    ],
  },
  {
    category: 'persistence',
    searchQueries: [
      'creator burnout how to overcome',
      'consistency for content creators',
    ],
  },
  {
    category: 'on_camera_confidence',
    searchQueries: [
      'on camera confidence tips creators',
      'how to look natural on video',
    ],
  },
  {
    category: 'social_strategy',
    searchQueries: [
      'instagram growth strategy creators',
      'tiktok algorithm explained',
    ],
  },
];

// =============================
// SHORTS_CATEGORIES — Style Swipes (Source A)
// Curated channel lists per niche. Each entry must have channelId resolved
// once via channels.list?forHandle=@... and uploadsPlaylist = 'UU' + channelId.slice(2).
//
// IMPORTANT: The channelIds below are placeholders. Before shipping to users,
// resolve each handle to its real channelId via:
//   curl "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@AliAbdaal&key=$YT_KEY"
// Then update the channelId + uploadsPlaylist (which is 'UU' + channelId.slice(2)).
// =============================

import type { ShortsCategoryConfig } from '@/types';

export const SHORTS_CATEGORIES: ShortsCategoryConfig[] = [
  {
    id: 'productivity',
    label: { he: 'פרודוקטיביות', en: 'Productivity' },
    channels: [
      // Placeholders — resolve before shipping (see header comment).
      { handle: '@AliAbdaal', channelId: 'UCoOae5nYA7VqaXzerajD0lg', uploadsPlaylist: 'UUoOae5nYA7VqaXzerajD0lg' },
      { handle: '@MattDAvella', channelId: 'UCJ24N4O0bP7LGLBDvye7oCA', uploadsPlaylist: 'UUJ24N4O0bP7LGLBDvye7oCA' },
      { handle: '@ThomasFrank', channelId: 'UCG-KntY7aVnIGXYEBQvmBAQ', uploadsPlaylist: 'UUG-KntY7aVnIGXYEBQvmBAQ' },
    ],
  },
  {
    id: 'creator_mindset',
    label: { he: 'מיינדסט יוצרים', en: 'Creator mindset' },
    channels: [
      { handle: '@TheFutur', channelId: 'UC-b3c7kxa5vU-bnmaROgvog', uploadsPlaylist: 'UU-b3c7kxa5vU-bnmaROgvog' },
      { handle: '@RogerWakefieldPlumber', channelId: 'UC-N0RPRC2_pgHsrxnyGwZjA', uploadsPlaylist: 'UU-N0RPRC2_pgHsrxnyGwZjA' },
      { handle: '@PeterMcKinnon', channelId: 'UC3DkFux8Iv-aYnTRWzwaiBA', uploadsPlaylist: 'UU3DkFux8Iv-aYnTRWzwaiBA' },
    ],
  },
  {
    id: 'storytelling',
    label: { he: 'סטוריטלינג', en: 'Storytelling' },
    channels: [
      { handle: '@RyanHigaProductions', channelId: 'UCSAUGyc_xA8uYzaIVG6MESQ', uploadsPlaylist: 'UUSAUGyc_xA8uYzaIVG6MESQ' },
      { handle: '@CaseyNeistat', channelId: 'UCtinbF-Q-fVthA0qrFQTgXQ', uploadsPlaylist: 'UUtinbF-Q-fVthA0qrFQTgXQ' },
    ],
  },
  {
    id: 'short_form',
    label: { he: 'סרטונים קצרים', en: 'Short-form' },
    channels: [
      { handle: '@MrBeast', channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA', uploadsPlaylist: 'UUX6OQ3DkcsbYNE6H8uQQuVA' },
      { handle: '@Veritasium', channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA', uploadsPlaylist: 'UUHnyfMqiRRG1u-2MsSQLbXA' },
    ],
  },
];

