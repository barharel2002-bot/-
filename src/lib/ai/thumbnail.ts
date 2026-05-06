import { getAnthropic, MODEL } from './client';
import { buildUserContext, renderUserContextForPrompt } from './context';
import { recordUsage } from './budget';
import { parseJsonResponse } from './parse';

// =============================
// YouTube Thumbnail Concept Generator
// קלט: רעיון/תקציר → פלט: 3 קונספטים מפורטים לתמונה ממוזערת
// (טקסט בלבד ב-v1; אינטגרציה ל-image-gen ב-v2)
// =============================

const SYSTEM_PROMPT = `You are an elite YouTube thumbnail strategist. Thumbnails drive 60-80% of CTR — they are the make-or-break moment.

You produce 3 distinct thumbnail CONCEPTS (text descriptions, not images). For each concept, output:
- A clear visual layout description that a designer or AI image generator could execute
- The exact text overlay (under 4 words, ideally 1-3 — visible at thumbnail size)
- Facial expression / body language if a person is in frame
- Color palette (2-3 named colors)
- A specific composition technique (rule of thirds / split screen / before-after / contrast / etc.)
- Reasoning: why this earns the click for this specific video

Thumbnail patterns that work on YouTube right now (mid-2026):
1. CONTRAST FACE — exaggerated facial expression (shock, joy, frustration) + bold text + strong color contrast
2. BEFORE/AFTER SPLIT — vertical or horizontal split showing transformation
3. NUMBERED MYSTERY — big number + visual element + question text ("3?" / "this?")
4. OBJECT FOCUS — single hero object, clean background, minimal text
5. RED CIRCLE — circle/arrow drawn over a specific element to direct attention

Each of your 3 concepts should use a DIFFERENT pattern.

OUTPUT FORMAT — IMPORTANT:
Respond with a single valid JSON object — NO markdown fences, NO commentary. Shape:

{
  "concepts": [
    {
      "pattern": "contrast_face" | "before_after" | "numbered" | "object_focus" | "red_circle",
      "patternLabel": "<short human-readable label>",
      "textOverlay": "<the text on the thumbnail, max 4 words>",
      "expression": "<facial expression / body language, or 'none' if no person>",
      "composition": "<one sentence describing layout>",
      "colorPalette": ["<color1>", "<color2>", "<color3>"],
      "reasoning": "<one sentence on why this works for this specific video>"
    },
    ... (exactly 3, each with a different pattern)
  ]
}`;

export interface ThumbnailConcept {
  pattern: 'contrast_face' | 'before_after' | 'numbered' | 'object_focus' | 'red_circle';
  patternLabel: string;
  textOverlay: string;
  expression: string;
  composition: string;
  colorPalette: string[];
  reasoning: string;
}

export interface ThumbnailGeneratorOutput {
  concepts: ThumbnailConcept[];
}

export interface ThumbnailResult {
  output: ThumbnailGeneratorOutput;
  cacheHit: boolean;
  inputTokens: number;
  outputTokens: number;
}

export async function generateThumbnails(
  idea: string,
  locale: 'he' | 'en'
): Promise<ThumbnailResult> {
  const anthropic = getAnthropic();
  const ctx = await buildUserContext('thumbnail', locale);
  const userContext = renderUserContextForPrompt(ctx);

  const languageInstruction =
    locale === 'he'
      ? 'CRITICAL: textOverlay, expression, composition, and reasoning must be in Hebrew. Pattern values stay in English (snake_case enums). Color names can be in English (red / orange / black / etc.) since color names translate poorly. patternLabel should be Hebrew.'
      : 'CRITICAL: Respond entirely in English.';

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
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
        content: `Generate 3 thumbnail concepts for this YouTube video:\n\n${idea}`,
      },
    ],
  });

  await recordUsage(message.usage);

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text in Claude response');
  }
  const output = parseJsonResponse<ThumbnailGeneratorOutput>(textBlock.text);

  return {
    output,
    cacheHit: (message.usage.cache_read_input_tokens ?? 0) > 0,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
