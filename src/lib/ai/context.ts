import { createClient } from '@/lib/supabase/server';
import type { AgentType } from '@/types';

// מרכז את כל ההקשר האישי של המשתמש לסוכני AI
// נטען פעם אחת ונשלח כקבוע (cacheable) ל-system prompt
export interface UserContext {
  whyICreate: string | null;
  forWhom: string | null;
  likedSwipes: string[]; // titles + author_name של מה שהמשתמש אהב
  pastFeedback: string[]; // הסברים אחרונים מ-"לא מתאים"
  locale: 'he' | 'en';
}

export async function buildUserContext(
  agentType: AgentType,
  locale: 'he' | 'en'
): Promise<UserContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      whyICreate: null,
      forWhom: null,
      likedSwipes: [],
      pastFeedback: [],
      locale,
    };
  }

  const [profileResult, swipesResult, feedbackResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('why_i_create, for_whom')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('swipe_items')
      .select('title, author_name, category')
      .eq('user_id', user.id)
      .eq('decision', 'liked')
      .order('decided_at', { ascending: false })
      .limit(15),
    supabase
      .from('ai_feedback')
      .select('feedback_text')
      .eq('user_id', user.id)
      .eq('agent_type', agentType)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const likedSwipes =
    swipesResult.data
      ?.map((s) => {
        const title = s.title ?? '(no title)';
        const author = s.author_name ? ` by ${s.author_name}` : '';
        return `[${s.category}] ${title}${author}`;
      })
      .filter(Boolean) ?? [];

  const pastFeedback =
    feedbackResult.data?.map((f) => f.feedback_text).filter(Boolean) ?? [];

  return {
    whyICreate: profileResult.data?.why_i_create ?? null,
    forWhom: profileResult.data?.for_whom ?? null,
    likedSwipes,
    pastFeedback,
    locale,
  };
}

// בונה טקסט ההקשר ה-cacheable של ה-system prompt
// מצרף את כל מה שיציב לאורך זמן (פרופיל, סגנון, פידבק)
export function renderUserContextForPrompt(ctx: UserContext): string {
  const lines: string[] = [];

  lines.push('=== USER PROFILE ===');
  lines.push(
    `Why they create: ${ctx.whyICreate?.trim() || '(not specified yet — work from general best practices)'}`
  );
  lines.push(
    `Their audience: ${ctx.forWhom?.trim() || '(not specified yet — assume a general creator audience)'}`
  );

  lines.push('');
  lines.push('=== STYLE PREFERENCES (from past swipe likes) ===');
  if (ctx.likedSwipes.length === 0) {
    lines.push('(no swipes yet — work from general best practices)');
  } else {
    ctx.likedSwipes.forEach((s) => lines.push(`- ${s}`));
  }

  lines.push('');
  lines.push('=== PERSONAL FEEDBACK MEMORY ===');
  lines.push(
    'These are explanations the user gave for past outputs that did not fit. Avoid repeating these mistakes:'
  );
  if (ctx.pastFeedback.length === 0) {
    lines.push('(no past feedback)');
  } else {
    ctx.pastFeedback.forEach((f) => lines.push(`- ${f}`));
  }

  return lines.join('\n');
}
