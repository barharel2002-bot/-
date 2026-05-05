import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchConversation } from '@/lib/ideas/conversation';

export const runtime = 'nodejs';

// GET /api/ai/develop/history?ideaId=...
// מחזיר את היסטוריית השיחה של רעיון (לטעינה כשפותחים דיאלוג)
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const ideaId = url.searchParams.get('ideaId');
  if (!ideaId) {
    return NextResponse.json({ error: 'no_idea_id' }, { status: 400 });
  }

  const messages = await fetchConversation(ideaId);
  return NextResponse.json({ ok: true, messages });
}
