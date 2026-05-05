import { getAnthropic, MODEL } from './client';
import { buildUserContext, renderUserContextForPrompt } from './context';
import { recordUsage } from './budget';
import { parseJsonResponse } from './parse';

// =============================
// סוכן הקופי — פיצ'ר 7
// =============================

const COPY_SYSTEM_INSTRUCTIONS = `You are an expert content creator specializing in Instagram and TikTok captions, hooks, and hashtags.

When given a raw idea, context, or note, your job is to produce ready-to-publish content tailored to the specific user.

Output requirements:
- ONE caption: 50–200 words. Use line breaks to make it scannable. Use emojis only if they match the user's style. Open with a strong first line that earns the next line.
- THREE hooks: alternative opening lines for the same caption. Each under 15 words. Different angles (curiosity / specificity / contrarian / personal). The hooks should feel like they could each be the first line of a successful reel.
- 10–15 HASHTAGS: lowercase, no # symbol, mix of niche-specific and broader-discovery tags. Skip overused generic tags (#instagood, #love).

OUTPUT FORMAT — IMPORTANT:
Respond with a single valid JSON object and NOTHING else (no markdown fences, no commentary, no preamble, no explanation). The JSON must follow this exact shape:

{
  "caption": "<caption text>",
  "hooks": ["<hook 1>", "<hook 2>", "<hook 3>"],
  "hashtags": ["<tag1>", "<tag2>", ...]
}

Hashtags must be lowercase strings WITHOUT the # symbol.`;

export interface CopyOutput {
  caption: string;
  hooks: string[];
  hashtags: string[];
}

export interface CopyResult {
  output: CopyOutput;
  cacheHit: boolean;
  inputTokens: number;
  outputTokens: number;
}

// יוצר קופי על בסיס רעיון. הפלט בשפה של המשתמש.
export async function generateCopy(
  idea: string,
  locale: 'he' | 'en'
): Promise<CopyResult> {
  const anthropic = getAnthropic();
  const ctx = await buildUserContext('copy', locale);

  // System prompt בנוי משני בלוקים:
  //  1. הוראות הסוכן (יציבות לחלוטין → cacheable מאוד)
  //  2. ההקשר האישי (יציב פר-משתמש → cacheable)
  //  שניהם עם cache_control: ephemeral כדי לחסוך 90% מהעלות בקריאה הבאה
  const userContext = renderUserContextForPrompt(ctx);
  const languageInstruction =
    locale === 'he'
      ? 'CRITICAL: Respond entirely in Hebrew. The caption, hooks, and hashtags must all be in Hebrew (hashtags should still be lowercase Hebrew words without # symbol).'
      : 'CRITICAL: Respond entirely in English.';

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: COPY_SYSTEM_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: `${userContext}\n\n${languageInstruction}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Generate Instagram/TikTok copy for this idea:\n\n${idea}`,
      },
    ],
  });

  // עדכון תקציב
  await recordUsage(message.usage);

  // חילוץ JSON מתוך התשובה
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text in Claude response');
  }
  const output = parseJsonResponse<CopyOutput>(textBlock.text);

  return {
    output,
    cacheHit: (message.usage.cache_read_input_tokens ?? 0) > 0,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
