import { createClient } from '@/lib/supabase/server';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// מספר ההודעות המקסימלי בשיחה (כדי לא לפוצץ context window)
export const MAX_CONVERSATION_MESSAGES = 30;

// שולף את כל ההודעות של רעיון, ממוין מהישנה לחדשה
export async function fetchConversation(
  ideaId: string
): Promise<ConversationMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // ודא שהרעיון שייך למשתמש (defense-in-depth, יש גם RLS)
  const { data: idea } = await supabase
    .from('ideas')
    .select('id')
    .eq('id', ideaId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!idea) return [];

  const { data, error } = await supabase
    .from('idea_conversations')
    .select('id, role, content, created_at')
    .eq('idea_id', ideaId)
    .order('created_at', { ascending: true })
    .limit(MAX_CONVERSATION_MESSAGES);

  if (error) {
    console.error('[conversation.fetch] failed:', error.message);
    return [];
  }
  return (data ?? []) as ConversationMessage[];
}

// שומר הודעה חדשה (user או assistant)
export async function appendMessage(
  ideaId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from('idea_conversations').insert({
    idea_id: ideaId,
    role,
    content,
  });
  if (error) {
    console.error('[conversation.append] failed:', error.message);
    return { ok: false };
  }
  return { ok: true };
}

// סופר הודעות (לבדיקה אם הגענו למגבלה)
export async function countMessages(ideaId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('idea_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('idea_id', ideaId);
  return count ?? 0;
}

// שולף את הרעיון עצמו (לצורך הצגה ב-chat header)
export async function fetchIdeaForChat(
  ideaId: string
): Promise<{ id: string; content: string; tags: string[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('ideas')
    .select('id, content, tags')
    .eq('id', ideaId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    content: data.content,
    tags: (data.tags ?? []) as string[],
  };
}
