'use server';

// =====================================
// Channel Insights — AI analysis of a public YouTube channel
// Takes the same PublicChannelData we already fetch for tracked channels
// and uses Claude to produce actionable creator recommendations.
// All types live in ./types so this file can stay 'use server'-clean
// (Next.js requires server-action files to export only async functions).
// =====================================

import { getAnthropic, MODEL } from '@/lib/ai/client';
import { fetchPublicChannel } from './youtube-public';
import type {
  AnalyzeResult,
  ChannelInsights,
  ChannelInsightsError,
  PublicChannelData,
} from './types';

function buildPrompt(data: PublicChannelData, locale: 'he' | 'en'): string {
  const recent = data.recentVideos
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" — ${v.views.toLocaleString()} views, ${v.likes.toLocaleString()} likes, ${v.comments.toLocaleString()} comments, ${v.isShort ? 'SHORT' : `${v.durationSec}s`}, published ${v.publishedAt}`
    )
    .join('\n');

  const channelLine = `${data.title}${data.handle ? ` (@${data.handle})` : ''} — ${data.subscribers.toLocaleString()} subs, ${data.totalVideos} videos, ${data.totalViews.toLocaleString()} total views`;

  const language =
    locale === 'he'
      ? 'Respond in Hebrew. Use casual, direct, creator-to-creator language — no corporate fluff.'
      : 'Respond in English. Use casual, direct, creator-to-creator language — no corporate fluff.';

  return `You are an elite YouTube creator strategist analyzing a channel's public data to give the creator (or someone benchmarking the channel) sharp, actionable insights.

CHANNEL: ${channelLine}
${data.description ? `BIO: ${data.description.slice(0, 400)}` : ''}

RECENT VIDEOS (most recent first, up to 8):
${recent || '(no videos available)'}

Your job: produce a structured analysis. Be specific, reference concrete numbers and titles when relevant. Avoid generic advice. If the data is too thin to draw a conclusion for a section, return a short note instead of speculating.

${language}

Return ONLY a single JSON object with this exact shape — no markdown, no preface, no commentary:
{
  "summary": "2-3 sentences capturing the channel's identity and current trajectory",
  "whatsWorking": ["specific thing 1", "specific thing 2", ...],
  "whatToDrop": ["specific thing 1", "specific thing 2", ...],
  "hookPatterns": ["pattern observed in titles or first-line hooks", ...],
  "hashtagStrategy": ["observation about title keywords / hashtags / SEO patterns", ...],
  "contentThemes": ["theme or content pillar 1", "theme 2", ...],
  "recommendations": ["concrete next step 1 (highest impact first)", "next step 2", ...],
  "postingTime": "natural-language note on cadence/timing or null if not discernible"
}

Each array should have 3-6 items. Each item should be one sharp sentence, not a paragraph.`;
}

function safeParseInsights(raw: string): ChannelInsights | null {
  // Strip code fences if the model added them despite instructions
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Find first { and last } to be defensive against any prose around the JSON
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof parsed.summary !== 'string') return null;
    return {
      summary: parsed.summary,
      whatsWorking: Array.isArray(parsed.whatsWorking) ? parsed.whatsWorking.filter((x: unknown) => typeof x === 'string') : [],
      whatToDrop: Array.isArray(parsed.whatToDrop) ? parsed.whatToDrop.filter((x: unknown) => typeof x === 'string') : [],
      hookPatterns: Array.isArray(parsed.hookPatterns) ? parsed.hookPatterns.filter((x: unknown) => typeof x === 'string') : [],
      hashtagStrategy: Array.isArray(parsed.hashtagStrategy) ? parsed.hashtagStrategy.filter((x: unknown) => typeof x === 'string') : [],
      contentThemes: Array.isArray(parsed.contentThemes) ? parsed.contentThemes.filter((x: unknown) => typeof x === 'string') : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.filter((x: unknown) => typeof x === 'string') : [],
      postingTime: typeof parsed.postingTime === 'string' ? parsed.postingTime : null,
    };
  } catch (err) {
    console.error('[insights] JSON parse failed:', err);
    return null;
  }
}

// Fetch a channel by URL/handle/ID and run AI analysis on it.
// This is the single entry point for the new "analyze any channel" feature.
export async function analyzeChannelByUrl(
  input: string,
  locale: 'he' | 'en' = 'he'
): Promise<AnalyzeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'anthropic_api_key_missing' };
  }

  const channelRes = await fetchPublicChannel(input);
  if (!channelRes.ok) {
    return { ok: false, error: channelRes.error as ChannelInsightsError };
  }

  return analyzeChannelData(channelRes.data, locale);
}

// Run AI analysis on already-fetched channel data (used when a tracked channel
// already has fresh data cached and we don't want to re-hit YouTube).
export async function analyzeChannelData(
  data: PublicChannelData,
  locale: 'he' | 'en' = 'he'
): Promise<AnalyzeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'anthropic_api_key_missing' };
  }

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      // System prompt tightens the JSON-only contract. Prefill (passing an
      // assistant message with '{') was tried and rejected by the SDK in this
      // setup, so we rely on instructions plus a tolerant parser instead.
      system:
        'You are a creator-strategy analyst. You ALWAYS respond with a single valid JSON object and nothing else. Start your response with "{" and end it with "}". No markdown fences, no prose before or after, no comments. Use double quotes for all strings. Escape any internal double quotes. Never break JSON across multiple top-level objects.',
      messages: [{ role: 'user', content: buildPrompt(data, locale) }],
    });

    const text = response.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .filter(Boolean)
      .join('\n');

    const parsed = safeParseInsights(text);
    if (!parsed) {
      console.error('[insights] could not parse model output:', text.slice(0, 1500));
      return { ok: false, error: 'parse_failed' };
    }

    return { ok: true, data: parsed };
  } catch (err) {
    console.error('[insights] anthropic call failed:', err);
    return { ok: false, error: 'ai_failed' };
  }
}
