import { getAnthropic, MODEL } from './client';
import { buildUserContext, renderUserContextForPrompt } from './context';
import { recordUsage } from './budget';
import { parseJsonResponse } from './parse';

// =============================
// YouTube Title Generator
// קלט: רעיון/תקציר → פלט: 5 כותרות עם זווית, אורך, מילות מפתח, ונימוק
// =============================

const SYSTEM_PROMPT = `You are an elite YouTube titles strategist. You generate 5 title variations
optimized for YouTube — which behaves like a search engine PLUS an entertainment feed.

YouTube title rules (non-negotiable):
- 50-65 characters is the sweet spot. Mobile truncates around 60.
- Front-load the keyword (first 3-4 words). Searches scan left-to-right.
- Emotional hook + curiosity gap or contrarian angle. NO clickbait that doesn't deliver.
- ALL CAPS only on 1-2 power words MAXIMUM. Sentence case otherwise.
- Avoid clichés ("you won't believe", "this changed my life") unless genuinely earned.

Provide 5 titles spanning different ANGLES so the user can A/B test:
1. CURIOSITY GAP — "I tried X for 30 days. Here's what I didn't expect."
2. AUTHORITY / NUMBERED — "The 3 mistakes destroying your channel growth"
3. CONTRARIAN — "Stop posting daily. Here's what to do instead."
4. STORY / PERSONAL — "How I went from 0 to 10K subs without ads"
5. DATA / RESULT — "I posted 100 videos. Only 3 patterns mattered."

OUTPUT FORMAT:
Respond with a single valid JSON object — NO markdown fences, NO commentary. Shape:

{
  "titles": [
    {
      "text": "<the title>",
      "length": <number of chars>,
      "angle": "curiosity" | "authority" | "contrarian" | "story" | "data",
      "seoKeywords": ["<keyword1>", "<keyword2>"],
      "reasoning": "<one sentence on why this title earns the click>"
    },
    ... (exactly 5)
  ]
}`;

export interface TitleVariation {
  text: string;
  length: number;
  angle: 'curiosity' | 'authority' | 'contrarian' | 'story' | 'data';
  seoKeywords: string[];
  reasoning: string;
}

export interface TitleGeneratorOutput {
  titles: TitleVariation[];
}

export interface TitleResult {
  output: TitleGeneratorOutput;
  cacheHit: boolean;
  inputTokens: number;
  outputTokens: number;
}

export async function generateTitles(
  idea: string,
  locale: 'he' | 'en'
): Promise<TitleResult> {
  const anthropic = getAnthropic();
  const ctx = await buildUserContext('title', locale);
  const userContext = renderUserContextForPrompt(ctx);

  const languageInstruction =
    locale === 'he'
      ? 'CRITICAL: Respond in Hebrew. All title text and reasoning must be in Hebrew. SEO keywords can stay in English (or Hebrew transliteration if more appropriate for the niche).'
      : 'CRITICAL: Respond in English.';

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
        content: `Generate 5 YouTube titles for this video idea:\n\n${idea}`,
      },
    ],
  });

  await recordUsage(message.usage);

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text in Claude response');
  }
  const output = parseJsonResponse<TitleGeneratorOutput>(textBlock.text);

  return {
    output,
    cacheHit: (message.usage.cache_read_input_tokens ?? 0) > 0,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
