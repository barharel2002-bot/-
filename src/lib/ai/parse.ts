// ===========================
// Parse JSON מתשובת Claude
// Claude יכול לפעמים להחזיר טקסט עם markdown fence או הקדמה.
// ננקה לפני JSON.parse.
// ===========================

export function parseJsonResponse<T>(text: string): T {
  // הסר ```json ... ``` אם קיים
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // אם יש טקסט לפני ה-{ הראשון, חתוך אותו
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error('[parse] failed to parse JSON:', text.slice(0, 500));
    throw new Error('AI_RESPONSE_NOT_JSON');
  }
}
