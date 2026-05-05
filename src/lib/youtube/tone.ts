import { getAnthropic, MODEL } from '@/lib/ai/client';
import { checkBudgetAllowed, recordUsage } from '@/lib/ai/budget';
import { parseJsonResponse } from '@/lib/ai/parse';
import type { SyncedVideo, ToneAnalysis } from './types';

// סיווג הטון של סרטוני המשתמש — פלט מצורף ל-Mirror + Analytics
// קריאה אחת ל-Sonnet מסווגת את כל הסרטונים + מחזירה טון דומיננטי לשבוע
export async function analyzeTone(videos: SyncedVideo[]): Promise<ToneAnalysis> {
  const empty: ToneAnalysis = { perVideo: {}, dominant: { tone: 'unknown', rationale: '' } };
  if (videos.length === 0) return empty;

  // gating על תקציב AI חודשי — אם חסום, מחזיר ריק (Mirror יציג את הסרטונים בלי טון)
  const { allowed } = await checkBudgetAllowed();
  if (!allowed) return empty;

  const anthropic = getAnthropic();

  const videoList = videos
    .map(
      (v, i) =>
        `${i + 1}. [${v.videoId}] "${v.title}" — ${v.description.slice(0, 200)}`
    )
    .join('\n');

  const systemPrompt = `You classify the *tone* of short-form social video posts.
Allowed tone labels (English, single word): authoritative, playful, inspirational,
educational, humorous, vulnerable, hype, contemplative, contrarian, calm.

For each video return one label. Then state the week's *dominant* tone with a
one-sentence rationale.

Output ONLY a JSON object with this exact shape:
{
  "perVideo": { "<videoId>": "<tone>", ... },
  "dominant": { "tone": "<tone>", "rationale": "<one sentence>" }
}`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Classify these videos:\n\n${videoList}\n\nReturn JSON only.`,
        },
      ],
    });

    await recordUsage(message.usage);

    const textBlock = message.content.find((b: any) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return empty;

    const parsed = parseJsonResponse<ToneAnalysis>(textBlock.text);
    return {
      perVideo: parsed.perVideo ?? {},
      dominant: parsed.dominant ?? { tone: 'unknown', rationale: '' },
    };
  } catch (err: any) {
    console.error('[youtube.tone] failed:', err.message);
    return empty;
  }
}
