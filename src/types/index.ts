// טיפוסים משותפים לאפליקציה כולה

export type Locale = 'he' | 'en';

export type ContentType = 'story' | 'short_video' | 'long_video' | 'post' | 'carousel';

export type Tone = 'inspirational' | 'educational' | 'personal' | 'funny' | 'value';

export type IdeaTag =
  | 'story'
  | 'reel'
  | 'tiktok'
  | 'spontaneous'
  | 'develop'
  | 'post';

export type IdeaStatus = 'new' | 'in_progress' | 'published' | 'archived';

export type SwipeCategory = 'videos' | 'edit_styles' | 'photos';

export type SwipeDecision = 'liked' | 'skipped' | null;

export type Platform = 'instagram' | 'tiktok' | 'both' | 'other';

export type ReminderFrequency =
  | 'daily_morning'
  | 'daily_evening'
  | 'twice_week'
  | 'weekly';

export type AgentType = 'copy' | 'analyze' | 'develop' | 'title' | 'thumbnail';

// תוצאת ניתוח סרטון מ-Claude
// platform כאן הוא פורמט יעד (לא פלטפורמה כללית): story / reel / tiktok / post
export type VideoFormat = 'story' | 'reel' | 'tiktok' | 'post';

export interface VideoAnalysisResult {
  suitable: boolean;
  reason?: string;
  platform: VideoFormat;
  publishDay: string;
  publishTime: string;
  hookQuality: 'strong' | 'medium' | 'weak';
  messageConnection: string;
  improvementTips?: string[];
}
