// =============================
// סוכן פיתוח רעיונות — שיחה רב-תורית
// קלט: רעיון + היסטוריית שיחה
// פלט: תגובה זורמת + שמירה ב-DB
// =============================

import { getAnthropic, MODEL } from './client';
import { buildUserContext, renderUserContextForPrompt } from './context';
import { recordUsage } from './budget';
import type { ClaudeUsage } from './pricing';

const DEVELOP_SYSTEM_INSTRUCTIONS = `You are the user's content creation collaborator. They have given you a raw idea — a spark, a fleeting thought. Your job is to help them turn it into something publishable.

How you work:
1. **Be a partner, not a lecturer.** 2-4 sentences usually. No long monologues.
2. **Push for specificity.** If the idea is vague, ask one focused question that unlocks it.
3. **Suggest concrete formats** when ready: a Reel script (open / tension / payoff), a caption hook, a 3-slide carousel, a 30-second TikTok beat.
4. **Match the user's voice** based on their style preferences and past feedback. Don't push your aesthetic.
5. **Keep momentum.** End each message with a question or invitation to act, not a recap.

Tone: like a sharp creative partner over coffee. Direct, warm, opinionated. No corporate fluff. No bullet point lectures.

Whenever you produce a script or copy, format it cleanly with line breaks.`;

const FIRST_MESSAGE_INSTRUCTION = `This is the first message in the conversation. The user has just opened the conversation with the idea above. Your job NOW: react to the idea, ask the single most useful clarifying question that unlocks direction (or if the idea is already specific, propose a concrete format and ask for thumbs up/down).

Keep it 2-4 sentences. Skip pleasantries — start in the middle.`;

export interface DevelopMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DevelopStreamInput {
  idea: { id: string; content: string; tags: string[] };
  conversation: DevelopMessage[]; // היסטוריית השיחה (לא כולל הודעת user נוכחית)
  userMessage: string | null; // null = first message — AI יוזם
  locale: 'he' | 'en';
}

// יוצר ReadableStream שזורם תגובה ל-client.
// בסוף — שומר את התגובה המלאה ב-DB דרך callback.
export async function streamDevelopReply(
  input: DevelopStreamInput,
  onComplete: (fullText: string, usage: ClaudeUsage) => Promise<void>
): Promise<ReadableStream<Uint8Array>> {
  const anthropic = getAnthropic();
  const ctx = await buildUserContext('develop', input.locale);
  const userContext = renderUserContextForPrompt(ctx);

  const languageInstruction =
    input.locale === 'he'
      ? 'CRITICAL: Respond entirely in Hebrew with natural fluent style.'
      : 'CRITICAL: Respond entirely in English with natural fluent style.';

  // בונה את ההודעות לקלוד:
  //  user message ראשונה: הצגת הרעיון + הוראת התחלה
  //  אחר כך — ההיסטוריה המלאה
  //  אחרון — ההודעה החדשה של המשתמש (אם יש)
  const messages: DevelopMessage[] = [
    {
      role: 'user',
      content: `Idea: ${input.idea.content}\n\nTags: ${input.idea.tags.join(', ') || '(none)'}\n\n${input.userMessage === null ? FIRST_MESSAGE_INSTRUCTION : 'Continue the conversation with me.'}`,
    },
  ];

  for (const m of input.conversation) {
    messages.push({ role: m.role, content: m.content });
  }

  // אם זו לא הודעת AI ראשונה — הוסף את ההודעה החדשה של המשתמש
  if (input.userMessage !== null) {
    messages.push({ role: 'user', content: input.userMessage });
  }

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: DEVELOP_SYSTEM_INSTRUCTIONS,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: `${userContext}\n\n${languageInstruction}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  let fullText = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }
        const final = await stream.finalMessage();
        await onComplete(fullText, final.usage);
        controller.close();
      } catch (err: any) {
        console.error('[develop] stream failed:', err.message);
        controller.error(err);
      }
    },
  });
}
