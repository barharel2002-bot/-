// תמחור Claude Sonnet 4.6 — נכון ל-2026
// Input:  $3 / 1M tokens   = 0.0003 cents/token
// Output: $15 / 1M tokens  = 0.0015 cents/token
// Cache write (1.25x):     = 0.000375 cents/token
// Cache read (0.1x):       = 0.00003 cents/token

export const PRICING = {
  inputPerToken: 0.0003,
  outputPerToken: 0.0015,
  cacheWritePerToken: 0.000375,
  cacheReadPerToken: 0.00003,
};

export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

// מחשב עלות בסנטים (float — דיוק מלא)
export function computeCostCents(usage: ClaudeUsage): number {
  return (
    (usage.input_tokens ?? 0) * PRICING.inputPerToken +
    (usage.output_tokens ?? 0) * PRICING.outputPerToken +
    (usage.cache_creation_input_tokens ?? 0) * PRICING.cacheWritePerToken +
    (usage.cache_read_input_tokens ?? 0) * PRICING.cacheReadPerToken
  );
}

// מחזיר חודש נוכחי בפורמט YYYY-MM
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
