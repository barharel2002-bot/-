import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAnthropicConfigured } from '@/lib/config';
import { checkBudgetAllowed, recordUsage } from '@/lib/ai/budget';
import { streamDevelopReply } from '@/lib/ai/develop';
import {
  fetchConversation,
  appendMessage,
  fetchIdeaForChat,
  countMessages,
  MAX_CONVERSATION_MESSAGES,
} from '@/lib/ideas/conversation';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  ideaId: string;
  userMessage: string | null; // null = first message (AI initiates)
  locale: 'he' | 'en';
}

// POST /api/ai/develop — מחזיר תגובה זורמת לפיתוח רעיון
// Body: { ideaId, userMessage, locale }
// Response: text/plain stream of tokens
export async function POST(request: Request) {
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { error: 'anthropic_not_configured' },
      { status: 503 }
    );
  }

  // אימות
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // תקציב
  const { allowed } = await checkBudgetAllowed();
  if (!allowed) {
    return NextResponse.json({ error: 'budget_blocked' }, { status: 402 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.ideaId) {
    return NextResponse.json({ error: 'no_idea_id' }, { status: 400 });
  }

  // ולידציה של locale
  const safeLocale = body.locale === 'en' ? 'en' : 'he';

  // ולידציה של userMessage (null = first message, או טקסט בגבולות)
  let userMessage: string | null = null;
  if (body.userMessage !== null && body.userMessage !== undefined) {
    const trimmed = String(body.userMessage).trim();
    if (!trimmed) return NextResponse.json({ error: 'empty_message' }, { status: 400 });
    if (trimmed.length > 4000) {
      return NextResponse.json({ error: 'message_too_long' }, { status: 400 });
    }
    userMessage = trimmed;
  }

  // טען את הרעיון + ההיסטוריה
  const idea = await fetchIdeaForChat(body.ideaId);
  if (!idea) {
    return NextResponse.json({ error: 'idea_not_found' }, { status: 404 });
  }

  // בדיקת מגבלת אורך שיחה
  const currentCount = await countMessages(body.ideaId);
  if (currentCount >= MAX_CONVERSATION_MESSAGES) {
    return NextResponse.json({ error: 'limit_reached' }, { status: 429 });
  }

  const conversation = await fetchConversation(body.ideaId);

  // שמור את הודעת המשתמש מיד (לפני שה-AI מתחיל)
  if (userMessage !== null) {
    await appendMessage(body.ideaId, 'user', userMessage);
  }

  // סטרים — בסיום נשמור את התשובה ב-DB ונעדכן תקציב
  const stream = await streamDevelopReply(
    {
      idea,
      conversation,
      userMessage,
      locale: safeLocale,
    },
    async (fullText, usage) => {
      await Promise.all([
        appendMessage(body.ideaId, 'assistant', fullText),
        recordUsage(usage),
      ]);
    }
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
