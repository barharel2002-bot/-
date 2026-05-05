'use server';

import { createClient } from '@/lib/supabase/server';
import { generateCopy, type CopyOutput } from './copy';
import { checkBudgetAllowed } from './budget';
import type { AgentType } from '@/types';

// =============================
// Server Actions ל-AI
// =============================

export interface CopyActionResult {
  ok: boolean;
  output?: CopyOutput;
  error?: 'unauthenticated' | 'budget_blocked' | 'invalid_input' | 'failed';
  budgetPercent?: number;
}

export async function generateCopyAction(
  idea: string,
  locale: 'he' | 'en'
): Promise<CopyActionResult> {
  if (!idea.trim()) return { ok: false, error: 'invalid_input' };
  if (idea.length > 4000) return { ok: false, error: 'invalid_input' };

  // ולידציה של locale (מונע הזרקה לא צפויה ל-prompt)
  const safeLocale = locale === 'en' ? 'en' : 'he';

  // אימות מפורש לפני שליחת הקריאה ל-Claude — מונע חיוב על משתמש לא מחובר
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  // תקציב
  const { allowed, status } = await checkBudgetAllowed();
  if (!allowed) {
    return { ok: false, error: 'budget_blocked', budgetPercent: status?.percent };
  }

  try {
    const result = await generateCopy(idea, safeLocale);
    return {
      ok: true,
      output: result.output,
      budgetPercent: status?.percent,
    };
  } catch (err) {
    console.error('[copy] generation failed:', err);
    return { ok: false, error: 'failed' };
  }
}

// שמירת פידבק "לא מתאים" — נכנס ל-memory הקבוע של הסוכן
export async function saveAIFeedback(
  agentType: AgentType,
  feedbackText: string,
  originalOutput: string
): Promise<{ ok: boolean }> {
  if (!feedbackText.trim()) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from('ai_feedback').insert({
    user_id: user.id,
    agent_type: agentType,
    feedback_text: feedbackText.trim(),
    original_output: originalOutput,
  });

  if (error) {
    console.error('[ai_feedback] save failed:', error.message);
    return { ok: false };
  }
  return { ok: true };
}
