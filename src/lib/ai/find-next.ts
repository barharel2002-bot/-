import { getAnthropic, MODEL } from './client';
import { recordUsage } from './budget';
import { parseJsonResponse } from './parse';

// =============================
// Find Your Next Video — סוכן כיוון תוכן
// פיצ'ר חדש: מקבל הקשר מהמשתמש ומחזיר 5 רעיונות מותאמים + פורמט מומלץ + טיפים
// =============================

const SYSTEM_PROMPT = `You are a content strategy advisor for a video creator who is stuck and looking for direction. The creator gives you context about their niche, audience, what worked recently, what's blocking them, and their preferred format.

Your job: deliver 5 SPECIFIC, ACTIONABLE video ideas they can shoot tomorrow. Not generic ("post a tutorial") — concrete, with a real hook line and a real reason it fits THEM.

Output requirements:
- 1-2 sentence summary of the strategic direction you're recommending and why
- A recommended primary format ("Shorts" / "Long-form" / "Mix") given their context
- EXACTLY 5 video ideas, each with:
  - title: short, scroll-stopping (under 12 words)
  - hook: the actual opening line they should say in the first 2 seconds (under 18 words)
  - format: "Short" / "Long-form"
  - whyItFits: one sentence about why THIS idea fits THIS creator's context (reference their inputs)
- 2-3 general tips that are tailored to their blocker, not clichés

OUTPUT FORMAT:
Respond with a single valid JSON object — NO markdown fences, NO commentary. Shape:

{
  "summary": "<1-2 sentences>",
  "recommendedFormat": "Shorts" | "Long-form" | "Mix",
  "ideas": [
    {
      "title": "<short scroll-stopper>",
      "hook": "<first 2-second line>",
      "format": "Short" | "Long-form",
      "whyItFits": "<one sentence>"
    },
    ... (5 total)
  ],
  "generalTips": ["<tip>", "<tip>", "<tip>"]
}`;

export interface FindNextInput {
  niche: string;
  audience: string;
  whatWorked: string;
  whatBlocks: string;
  preferredFormat: 'short' | 'long' | 'both';
  locale: 'he' | 'en';
}

export interface FindNextIdea {
  title: string;
  hook: string;
  format: string;
  whyItFits: string;
}

export interface FindNextOutput {
  summary: string;
  recommendedFormat: string;
  ideas: FindNextIdea[];
  generalTips: string[];
}

export async function findNextVideo(
  input: FindNextInput
): Promise<{ output: FindNextOutput; inputTokens: number; outputTokens: number }> {
  const anthropic = getAnthropic();

  const language =
    input.locale === 'he'
      ? 'CRITICAL: Respond in Hebrew. All titles, hooks, whyItFits, summary, generalTips — in Hebrew.'
      : 'CRITICAL: Respond in English.';

  const userBlock = `Creator context:
- Niche / what I create: ${input.niche || '(not specified)'}
- Target audience: ${input.audience || '(not specified)'}
- What worked recently: ${input.whatWorked || '(not specified)'}
- What's blocking me / what I am stuck on: ${input.whatBlocks || '(not specified)'}
- Preferred format: ${input.preferredFormat}

${language}

Return JSON only.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userBlock }],
  });

  await recordUsage(message.usage);

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text in Claude response');
  }
  const output = parseJsonResponse<FindNextOutput>(textBlock.text);

  return {
    output,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
