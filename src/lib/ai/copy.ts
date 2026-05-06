import { getAnthropic, MODEL } from './client';
import { buildUserContext, renderUserContextForPrompt } from './context';
import { recordUsage } from './budget';
import { parseJsonResponse } from './parse';

// =============================
// YouTube Description Writer
// קלט: רעיון/תקציר → פלט: תיאור YouTube מלא + 3 הוקים פותחים + tags + תגובה מצומדת
// =============================

const COPY_SYSTEM_INSTRUCTIONS = `You are an expert YouTube creator content writer. You produce ready-to-publish YouTube descriptions, opening hooks, tags, and pinned comments.

YouTube descriptions are NOT Instagram captions:
- The first 1-2 sentences appear ABOVE THE FOLD (before "Show more"). They must hook the viewer and tell them what they'll get.
- Length: 250-400 words is the sweet spot. Long enough for SEO, short enough that viewers actually read.
- Include keywords naturally. YouTube indexes the description for search.
- Add a clear value proposition. Not just "thanks for watching".
- End with a soft CTA — subscribe, watch related, follow on social. NOT spammy.

Output requirements:
- ONE description: 250-400 words. Use line breaks for scannability. The first 2 sentences must work standalone (above-fold preview).
- THREE alternative HOOKS: each is a 2-line opener for the description. Different angles (curiosity / authority / contrarian / personal). Test in YouTube to see which gets the click-through.
- 10-15 TAGS: lowercase, no commas, mix of broad-niche keywords and specific long-tail. YouTube tags are still indexed, even if downweighted vs title.
- ONE pinned-comment text: 100-180 characters, encourages an authentic engagement question or signposts a specific moment in the video. NOT begging for likes.

OUTPUT FORMAT — IMPORTANT:
Respond with a single valid JSON object and NOTHING else (no markdown fences, no commentary, no preamble). The JSON must follow this exact shape:

{
  "description": "<full description text>",
  "hooks": ["<hook 1>", "<hook 2>", "<hook 3>"],
  "tags": ["<tag1>", "<tag2>", ...],
  "pinnedComment": "<pinned comment text>"
}

Tags must be lowercase strings without # symbol.`;

export interface CopyOutput {
  description: string;
  hooks: string[];
  tags: string[];
  pinnedComment: string;
}

export interface CopyResult {
  output: CopyOutput;
  cacheHit: boolean;
  inputTokens: number;
  outputTokens: number;
}

// יוצר תיאור YouTube על בסיס רעיון. הפלט בשפה של המשתמש.
export async function generateCopy(
  idea: string,
  locale: 'he' | 'en'
): Promise<CopyResult> {
  const anthropic = getAnthropic();
  const ctx = await buildUserContext('copy', locale);

  const userContext = renderUserContextForPrompt(ctx);
  const languageInstruction =
    locale === 'he'
      ? 'CRITICAL: Respond entirely in Hebrew. Description, hooks, tags, and pinned comment must all be in Hebrew. Tags should be lowercase Hebrew words.'
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
        content: `Generate a YouTube description package for this video idea:\n\n${idea}`,
      },
    ],
  });

  await recordUsage(message.usage);

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
