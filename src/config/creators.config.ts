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
