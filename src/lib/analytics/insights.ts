import { getAnthropic, MODEL } from '@/lib/ai/client';
import { checkBudgetAllowed, recordUsage } from '@/lib/ai/budget';
import { parseJsonResponse } from '@/lib/ai/parse';
import type { SyncedVideo, InsightsBullet } from '@/lib/youtube/types';

// יוצר 3-4 תובנות AI מנתוני האנליטיקה — מוצג בראש דף Analytics
// קלט: 30 הסרטונים האחרונים + הקשר רעיונות מלוח הרעיונות
export async function generateInsights(
  videos: SyncedVideo[],
  ideasContext: string
): Promise<InsightsBullet[]> {
  if (videos.length === 0) return [];

  const { allowed } = await checkBudgetAllowed();
  if (!allowed) return [];

  const anthropic = getAnthropic();
  const recent = videos.slice(0, 30);

  const summary = recent
    .map(
      (v) =>
        `[${v.videoId}] "${v.title}" — ${v.isShort ? 'Short' : 'Long'} — ${new Date(
          v.publishedAt
        )
          .toISOString()
          .slice(0, 10)} ${new Date(v.publishedAt).getHours()}:00 — views=${
          v.viewCount
        } likes=${v.likeCount} tone=${v.tone ?? '?'}`
    )
    .join('\n');

  const systemPrompt = `You analyze a content creator's last ~30 videos and surface 3-4
ACTIONABLE insights. Each insight is one short sentence (≤ 18 words) about what
performs well, what doesn't, and one concrete suggestion. No fluff. No hedging.
Each insight starts with a fitting emoji.

Output ONLY a JSON array of objects with this exact shape:
[
  { "emoji": "🚀", "text": "Your Shorts average 3× the views of long-form." },
  { "emoji": "⏰", "text": "Tuesday 19:00 is your strongest publishing slot." }
]`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Recent videos:\n${summary}\n\nIdeas board context (titles only):\n${ideasContext}\n\nReturn 3-4 insights as JSON.`,
        },
      ],
    });

    await recordUsage(message.usage);

    const textBlock = message.content.find((b: any) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return [];

    return parseJsonResponse<InsightsBullet[]>(textBlock.text) ?? [];
  } catch (err: any) {
    console.error('[analytics.insights] failed:', err.message);
    return [];
  }
}
