import { getAnthropic, MODEL } from './client';
import { buildUserContext, renderUserContextForPrompt } from './context';
import { recordUsage } from './budget';
import { parseJsonResponse } from './parse';
import type { VideoAnalysisResult } from '@/types';

// =============================
// ניתוח סרטונים — פיצ'ר 2
// =============================

const VIDEO_SYSTEM_INSTRUCTIONS = `You are an expert content quality analyst for Instagram and TikTok.

You will receive several frames sampled across a video's duration. Analyze the video's potential as social media content for the specific user.

CORE RULES:
1. ALWAYS provide a complete analysis — even if the video isn't suitable for posting. NEVER refuse.
2. If the video is NOT suitable, explain WHY clearly and HOW to fix it. Specifics, not platitudes.
3. Use the user's profile and style preferences to inform every recommendation.

What to evaluate:
- Visual quality (focus, lighting, framing, motion)
- Hook strength (does the first frame earn the next 3 seconds?)
- Style match (does it match the aesthetic the user has been swiping right on?)
- Message connection (does it reinforce what this user is trying to say?)
- Platform fit (story / reel / tiktok / post — pick the strongest single fit)
- Best posting day & time (consider style: educational midday, personal evenings, fast/punchy night)

OUTPUT FORMAT — IMPORTANT:
Respond with a single valid JSON object and NOTHING else (no markdown fences, no commentary, no preamble). The JSON must follow this exact shape:

{
  "suitable": true | false,
  "reason": "<one or two sentence explanation>",
  "platform": "story" | "reel" | "tiktok" | "post",
  "publishDay": "<day of week, e.g., Tuesday>",
  "publishTime": "<HH:MM 24h>",
  "hookQuality": "strong" | "medium" | "weak",
  "messageConnection": "<sentence connecting it to user's overall message>",
  "improvementTips": ["<tip 1>", "<tip 2>", ...]
}

Do NOT include any other fields. Use only the enum values listed for "platform" and "hookQuality".`;

export interface VideoAnalysisInput {
  frames: { mediaType: 'image/jpeg' | 'image/png'; data: string }[]; // base64 ללא prefix
  durationSec: number;
  locale: 'he' | 'en';
}

export interface VideoAnalysisOutput {
  result: VideoAnalysisResult;
  inputTokens: number;
  outputTokens: number;
}

export async function analyzeVideo(
  input: VideoAnalysisInput
): Promise<VideoAnalysisOutput> {
  const anthropic = getAnthropic();
  const ctx = await buildUserContext('analyze', input.locale);
  const userContext = renderUserContextForPrompt(ctx);

  const languageInstruction =
    input.locale === 'he'
      ? 'CRITICAL: Respond entirely in Hebrew. All explanations, reasons, and tips must be in natural fluent Hebrew.'
      : 'CRITICAL: Respond entirely in English.';

  // נבנה את ה-content של ההודעה: כל פריים כתמונה + טקסט מסכם
  const userContent = [
    ...input.frames.map((f) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: f.mediaType,
        data: f.data,
      },
    })),
    {
      type: 'text' as const,
      text: `These are ${input.frames.length} frames sampled across a ${Math.round(input.durationSec)}-second video. Analyze it for social media posting.`,
    },
  ];

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: VIDEO_SYSTEM_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: `${userContext}\n\n${languageInstruction}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  await recordUsage(message.usage);

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text in Claude response');
  }
  const result = parseJsonResponse<VideoAnalysisResult>(textBlock.text);

  return {
    result,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
