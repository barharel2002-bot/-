// =====================================
// נתוני הדגמה — מוצגים כשאין Supabase מוגדר
// מאפשר למשתמש לראות איך האפליקציה נראית עם תוכן אמיתי
// =====================================

import type { IdeaRow } from '@/lib/ideas/queries';
import type { ProfileRow } from '@/lib/settings/queries';
import type { MirrorData } from '@/lib/mirror/queries';
import type { AnalyticsData, PostWithMetrics } from '@/lib/analytics/queries';
import type { SwipeItemRow } from '@/lib/swipes/queries';
import type { VideoAnalysisResult, ContentType, Tone } from '@/types';
import type { CopyOutput } from '@/lib/ai/copy';

const NOW = new Date('2026-05-03T18:30:00Z').toISOString();
const HOURS_AGO = (h: number) =>
  new Date(Date.parse(NOW) - h * 60 * 60 * 1000).toISOString();
const DAYS_AGO = (d: number) =>
  new Date(Date.parse(NOW) - d * 24 * 60 * 60 * 1000).toISOString();

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';

// ===== Ideas =====
export const DEMO_IDEAS: IdeaRow[] = [
  {
    id: 'demo-1',
    user_id: DEMO_USER_ID,
    content:
      'ריל בוקר — לא ההרגלים הסטנדרטיים, אלא 3 דברים שאני עושה ש-99% מהיוצרים מדלגים עליהם בשנה הראשונה.',
    voice_transcript: null,
    image_url: null,
    tags: ['reel', 'develop'],
    status: 'new',
    published_at: null,
    created_at: HOURS_AGO(2),
    updated_at: HOURS_AGO(2),
  },
  {
    id: 'demo-2',
    user_id: DEMO_USER_ID,
    content:
      'TikTok על 3 הטעויות שעשיתי כשהתחלתי. הוק: "אם הייתי יודע את זה לפני שנתיים, לא הייתי מבזבז 200 שעות".',
    voice_transcript: null,
    image_url: null,
    tags: ['tiktok', 'develop'],
    status: 'new',
    published_at: null,
    created_at: HOURS_AGO(8),
    updated_at: HOURS_AGO(8),
  },
  {
    id: 'demo-3',
    user_id: DEMO_USER_ID,
    content:
      'קרוסלה: 5 שיעורים מהחודש האחרון. כל שקופית = שיעור אחד + ציטוט קצר.',
    voice_transcript: null,
    image_url: null,
    tags: ['post', 'develop'],
    status: 'new',
    published_at: null,
    created_at: DAYS_AGO(1),
    updated_at: DAYS_AGO(1),
  },
  {
    id: 'demo-4',
    user_id: DEMO_USER_ID,
    content:
      'מחשבה ספונטנית: למה כולם מלמדים איך להתחיל אבל אף אחד לא מדבר על מה שקורה אחרי 3 חודשים?',
    voice_transcript: null,
    image_url: null,
    tags: ['spontaneous', 'develop'],
    status: 'new',
    published_at: null,
    created_at: DAYS_AGO(2),
    updated_at: DAYS_AGO(2),
  },
  {
    id: 'demo-5',
    user_id: DEMO_USER_ID,
    content:
      'סטורי מאחורי הקלעים של היום — כשעבדתי על העריכה של הריל הקודם.',
    voice_transcript: null,
    image_url: null,
    tags: ['story'],
    status: 'published',
    published_at: DAYS_AGO(1),
    created_at: DAYS_AGO(3),
    updated_at: DAYS_AGO(1),
  },
  {
    id: 'demo-6',
    user_id: DEMO_USER_ID,
    content:
      'סרטון ארוך על איך אני מקבל החלטות ב-72 שעות במקום שבועות. נכון להיום: רק כותרת ו-3 נקודות.',
    voice_transcript: null,
    image_url: null,
    tags: ['develop'],
    status: 'in_progress',
    published_at: null,
    created_at: DAYS_AGO(4),
    updated_at: DAYS_AGO(4),
  },
  {
    id: 'demo-7',
    user_id: DEMO_USER_ID,
    content:
      'ריל קצר על הספר שגרם לי לשנות את הגישה ל-content שלי. שם הספר + 2 משפטים. זהו.',
    voice_transcript: null,
    image_url: null,
    tags: ['reel', 'tiktok'],
    status: 'published',
    published_at: DAYS_AGO(2),
    created_at: DAYS_AGO(5),
    updated_at: DAYS_AGO(2),
  },
];

// ===== Profile =====
export const DEMO_PROFILE: ProfileRow = {
  id: DEMO_USER_ID,
  display_name: 'דמו משתמש',
  why_i_create:
    'כדי לעזור למישהו שעושה צעד שגם אני בעצמי לא ידעתי לעשות פעם. כי כתוב באישון לילה זה מצב צבירה אחר.',
  for_whom:
    'אנשים בתחילת הדרך כיוצרים — שמרגישים שהם לבד, שאף אחד לא מצליח באמת לראות אותם. אני מדבר אליהם.',
  preferred_locale: 'he',
  reminder_frequency: 'daily_morning',
  push_subscription: null,
  ai_monthly_budget_cents: 5000,
  youtube_channel_url: null,
  youtube_channel_id: null,
  youtube_uploads_playlist_id: null,
  youtube_channel_title: null,
  youtube_channel_thumbnail: null,
  youtube_synced_at: null,
  youtube_tone_cache: null,
  youtube_insights_cache: null,
  created_at: DAYS_AGO(60),
  updated_at: DAYS_AGO(1),
};

// ===== Mirror =====
export const DEMO_MIRROR: MirrorData = {
  weekStart: DAYS_AGO(7),
  weekEnd: NOW,
  posted: {
    total: 4,
    byType: [
      { type: 'short_video' as ContentType, count: 2 },
      { type: 'story' as ContentType, count: 1 },
      { type: 'post' as ContentType, count: 1 },
    ],
    items: [
      {
        id: 'demo-p-1',
        type: 'short_video',
        platform: 'instagram',
        title: 'הריל על הטעויות שעשיתי כשהתחלתי',
        tone: 'educational',
        publishedAt: DAYS_AGO(1),
      },
      {
        id: 'demo-p-2',
        type: 'story',
        platform: 'instagram',
        title: 'מאחורי הקלעים של העריכה',
        tone: 'personal',
        publishedAt: DAYS_AGO(2),
      },
      {
        id: 'demo-p-3',
        type: 'short_video',
        platform: 'tiktok',
        title: 'הספר שגרם לי לשנות גישה',
        tone: 'inspirational',
        publishedAt: DAYS_AGO(4),
      },
      {
        id: 'demo-p-4',
        type: 'post',
        platform: 'instagram',
        title: '5 שיעורים מהחודש',
        tone: 'value',
        publishedAt: DAYS_AGO(6),
      },
    ],
  },
  drafts: [
    {
      id: 'demo-d-1',
      type: 'short_video',
      title: 'ריל עריכה — 70% מוכן, צריך B-roll',
      createdAt: DAYS_AGO(3),
    },
    {
      id: 'demo-d-2',
      type: 'carousel',
      title: 'קרוסלה: שלבי הבדיקה של רעיון',
      createdAt: DAYS_AGO(5),
    },
  ],
  ideasToDevelop: DEMO_IDEAS.filter((i) => i.status === 'new')
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      content: i.content,
      tags: i.tags,
      createdAt: i.created_at,
    })),
  likedSwipes: [
    {
      title: 'Top creator hooks that worked in 2026',
      authorName: 'Sara Chen',
      thumbnail: null,
      category: 'videos',
    },
    {
      title: 'Editing transition: smooth zoom + speed ramp',
      authorName: 'CutLab',
      thumbnail: null,
      category: 'edit_styles',
    },
    {
      title: 'Carousel: 5 brand color palettes',
      authorName: 'Visual Diet',
      thumbnail: null,
      category: 'photos',
    },
    {
      title: 'How I plan a week of content in 30min',
      authorName: 'Studio Notes',
      thumbnail: null,
      category: 'videos',
    },
  ],
  toneDistribution: [
    { tone: 'educational' as Tone, count: 2 },
    { tone: 'inspirational' as Tone, count: 1 },
    { tone: 'personal' as Tone, count: 1 },
    { tone: 'value' as Tone, count: 1 },
  ],
  activityHours: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count:
      h === 9 ? 1 : h === 12 ? 1 : h === 18 ? 2 : h === 20 ? 1 : 0,
  })),
  channelUploads: [],
  hasAnyData: true,
  dominantTone: { tone: 'inspirational', rationale: 'Most posts this week leaned into "you can do this" energy.' },
};

// ===== Analytics =====
const DEMO_POSTS: PostWithMetrics[] = [
  {
    id: 'demo-p-1',
    type: 'short_video',
    platform: 'instagram',
    title: 'הריל על הטעויות שעשיתי כשהתחלתי',
    tone: 'educational',
    publishedAt: DAYS_AGO(1),
    metrics: {
      views: 12480,
      likes: 894,
      saves: 312,
      shares: 178,
      comments: 67,
      avgWatchTimeSec: 18,
      recordedAt: HOURS_AGO(2),
    },
  },
  {
    id: 'demo-p-2',
    type: 'story',
    platform: 'instagram',
    title: 'מאחורי הקלעים של העריכה',
    tone: 'personal',
    publishedAt: DAYS_AGO(2),
    metrics: {
      views: 1820,
      likes: 0,
      saves: 0,
      shares: 14,
      comments: 8,
      avgWatchTimeSec: 4,
      recordedAt: HOURS_AGO(4),
    },
  },
  {
    id: 'demo-p-3',
    type: 'short_video',
    platform: 'tiktok',
    title: 'הספר שגרם לי לשנות גישה',
    tone: 'inspirational',
    publishedAt: DAYS_AGO(4),
    metrics: {
      views: 28930,
      likes: 1842,
      saves: 712,
      shares: 405,
      comments: 134,
      avgWatchTimeSec: 22,
      recordedAt: DAYS_AGO(1),
    },
  },
  {
    id: 'demo-p-4',
    type: 'post',
    platform: 'instagram',
    title: '5 שיעורים מהחודש',
    tone: 'value',
    publishedAt: DAYS_AGO(6),
    metrics: {
      views: 4210,
      likes: 312,
      saves: 198,
      shares: 87,
      comments: 41,
      avgWatchTimeSec: null,
      recordedAt: DAYS_AGO(2),
    },
  },
  {
    id: 'demo-p-5',
    type: 'short_video',
    platform: 'instagram',
    title: 'ריל הקרוסלה השבועית',
    tone: 'educational',
    publishedAt: DAYS_AGO(8),
    metrics: null,
  },
];

export const DEMO_ANALYTICS: AnalyticsData = (() => {
  const posts = DEMO_POSTS;
  const withMetrics = posts.filter((p) => p.metrics);
  let totalViews = 0;
  let totalEng = 0;
  for (const p of withMetrics) {
    if (!p.metrics) continue;
    totalViews += p.metrics.views;
    totalEng +=
      p.metrics.likes + p.metrics.saves + p.metrics.shares + p.metrics.comments;
  }
  return {
    posts,
    hasAnyMetrics: true,
    byType: [
      { key: 'short_video', avgViews: 19720, postCount: 2, totalEngagement: 4232 },
      { key: 'post', avgViews: 4210, postCount: 1, totalEngagement: 638 },
      { key: 'story', avgViews: 1820, postCount: 1, totalEngagement: 22 },
    ],
    byTone: [
      { key: 'inspirational', avgViews: 28930, postCount: 1, totalEngagement: 3093 },
      { key: 'educational', avgViews: 12480, postCount: 1, totalEngagement: 1451 },
      { key: 'value', avgViews: 4210, postCount: 1, totalEngagement: 638 },
      { key: 'personal', avgViews: 1820, postCount: 1, totalEngagement: 22 },
    ],
    byHour: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      avgViews:
        h === 9 ? 4210 : h === 18 ? 12480 : h === 20 ? 28930 : h === 12 ? 1820 : 0,
      postCount: h === 9 || h === 12 || h === 18 || h === 20 ? 1 : 0,
    })),
    totals: {
      posts: posts.length,
      postsWithMetrics: withMetrics.length,
      avgViews: Math.round(totalViews / withMetrics.length),
      totalEngagement: totalEng,
    },
  };
})();

// ===== Swipes =====
export function makeDemoSwipeQueue(category: 'videos' | 'edit_styles' | 'photos'): SwipeItemRow[] {
  const seeds: Array<{ title: string; author: string }> = [
    { title: 'Hook structure: question → twist → payoff', author: '@studionotes' },
    { title: 'Editing flow that holds attention 12s+', author: '@cutlab' },
    { title: 'Color palette: warm cream + terra accent', author: '@visualdiet' },
    { title: 'How to write captions people screenshot', author: '@wordcraft' },
  ];
  return seeds.map((s, i) => ({
    id: `demo-swipe-${category}-${i}`,
    user_id: DEMO_USER_ID,
    category,
    source_url: `https://example.com/${category}/${i + 1}`,
    platform: i % 2 === 0 ? 'instagram' : 'tiktok',
    thumbnail_url: null,
    title: s.title,
    author_name: s.author,
    embed_html: null,
    decision: null,
    decided_at: null,
    created_at: HOURS_AGO(i + 1),
  }));
}

export const DEMO_SWIPE_STATS = { liked: 23, skipped: 41 };

// ===== Copy output =====
export const DEMO_COPY_OUTPUT: CopyOutput = {
  caption: `אם הייתי יודע את זה כשהתחלתי — הייתי חוסך לעצמי 200 שעות מבוזבזות.

3 דברים שאף אחד לא מסביר ליוצרים בשנה הראשונה:

1. תוכן טוב לא מתפוצץ אם הוא לא מדבר ל"מי מסוים".
2. עקביות > השלמות. תפרסם רעיון של 70% מאשר תחכה לרעיון של 100%.
3. הסטטיסטיקות לא חשובות יחסית — מה שחשוב זה לאיזה אדם אחד הוא הגיע נכון.

איזה מהשלושה דיבר אליך? כתוב במגיב.`,
  hooks: [
    'אם הייתי יודע את זה כשהתחלתי — הייתי חוסך 200 שעות',
    '3 דברים שאף אחד לא יגיד ליוצר בשנה הראשונה',
    'תוכן טוב לא מתפוצץ. הסיבה אחת.',
  ],
  hashtags: [
    'creator',
    'contentcreator',
    'creatortips',
    'instagramreels',
    'creatorlife',
    'smallcreator',
    'creatorjourney',
    'creatortoolkit',
    'reels',
    'reelsinspiration',
    'contentstrategy',
    'creativetools',
  ],
};

// ===== Video Analysis =====
export const DEMO_VIDEO_ANALYSIS: VideoAnalysisResult = {
  suitable: true,
  reason:
    'הסרטון מובנה היטב — hook חזק ב-2 השניות הראשונות, ריתמוס שמושך, וה-payoff נמסר בזמן. תאורה ויזואלית טובה. אתה נראה רגוע ומרוכז.',
  platform: 'reel',
  publishDay: 'יום שלישי',
  publishTime: '19:30',
  hookQuality: 'strong',
  messageConnection:
    'מתחבר ישירות למסר שלך — אדם בתחילת הדרך שמרגיש לבד. הסיפור האישי שלך כאן מטה את ה-data של ה-AI לכיוון של "תוכן ערכי שמושך מי שזקוק".',
  improvementTips: [
    'הוסף captions גדולים בחלק התחתון — 80% מהצופים בלי אודיו',
    'נסה לחתוך את ה-2 השניות הראשונות לחצי שנייה — תכניס מיד את ה-hook המילולי',
    'CTA בסיום מטשטש את הריתמוס — או מאוד קצר או הסר',
  ],
};
