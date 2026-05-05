import Anthropic from '@anthropic-ai/sdk';

// Singleton — חוסך יצירה בכל קריאה
let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

// המודל בו האפליקציה משתמשת
// Sonnet 4.6 — איזון אופטימלי בין איכות לעלות לתקציב $50/חודש
// ניתן להחליף ב-claude-opus-4-7 לאיכות מקסימלית, או claude-haiku-4-5 לחיסכון
export const MODEL =
  process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
