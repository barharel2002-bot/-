import { createClient } from '@/lib/supabase/server';
import { computeCostCents, currentMonth, type ClaudeUsage } from './pricing';

// תקציב ברירת מחדל: 50$ = 5000 cents
// אם יש למשתמש ערך מותאם בפרופיל, נשתמש בו
export const DEFAULT_BUDGET_CENTS = 5000;
export const WARNING_THRESHOLD = 0.8;

export interface BudgetStatus {
  usedCents: number;
  budgetCents: number;
  percent: number;
  status: 'ok' | 'warning' | 'blocked';
  inputTokens: number;
  outputTokens: number;
  month: string;
}

// שולף את הסטטוס הנוכחי של התקציב למשתמש המחובר
export async function getBudgetStatus(): Promise<BudgetStatus | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const month = currentMonth();

  // נשלוף במקביל: usage של החודש + budget מהפרופיל
  const [usageResult, profileResult] = await Promise.all([
    supabase
      .from('ai_usage')
      .select('total_input_tokens, total_output_tokens, estimated_cost_cents')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('ai_monthly_budget_cents')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const usedCents = usageResult.data?.estimated_cost_cents ?? 0;
  const budgetCents =
    profileResult.data?.ai_monthly_budget_cents ?? DEFAULT_BUDGET_CENTS;
  const percent = budgetCents > 0 ? usedCents / budgetCents : 0;

  let status: 'ok' | 'warning' | 'blocked' = 'ok';
  if (percent >= 1) status = 'blocked';
  else if (percent >= WARNING_THRESHOLD) status = 'warning';

  return {
    usedCents,
    budgetCents,
    percent,
    status,
    inputTokens: usageResult.data?.total_input_tokens ?? 0,
    outputTokens: usageResult.data?.total_output_tokens ?? 0,
    month,
  };
}

// בודק לפני קריאה ל-AI — אם חסום, אסור לקרוא
export async function checkBudgetAllowed(): Promise<{
  allowed: boolean;
  status?: BudgetStatus;
}> {
  const status = await getBudgetStatus();
  if (!status) return { allowed: false };
  return { allowed: status.status !== 'blocked', status };
}

// מתעדכן ב-DB אחרי כל קריאה
export async function recordUsage(usage: ClaudeUsage): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const month = currentMonth();
  const cost = computeCostCents(usage);
  const inputTokens =
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const outputTokens = usage.output_tokens ?? 0;

  // קריאה לפונקציית RPC אטומית
  const { error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_month: month,
    p_input: inputTokens,
    p_output: outputTokens,
    p_cost: Math.ceil(cost),
  });

  if (error) {
    console.error('[ai_usage] failed:', error.message);
  }
}
