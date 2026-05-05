import { createClient } from '@/lib/supabase/server';

export const QUOTA_DAILY_CAP = 10_000;
export const QUOTA_WARN_THRESHOLD = 8_000;

export function isOverQuotaThreshold(unitsUsed: number): boolean {
  return unitsUsed >= QUOTA_WARN_THRESHOLD;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

// קריאה: כמה יחידות נוצלו היום
export async function getQuotaToday(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_quota_daily')
    .select('units_used')
    .eq('date', todayKey())
    .maybeSingle();
  return data?.units_used ?? 0;
}

// תוספת יחידות (אטומי דרך RPC)
export async function addQuotaUnits(units: number): Promise<void> {
  if (units <= 0) return;
  const supabase = await createClient();
  const date = todayKey();
  const { error } = await supabase.rpc('increment_youtube_quota', {
    p_date: date,
    p_units: units,
  });
  if (error) {
    // fallback: read-modify-write (לא אטומי, אך בסביבת single-tenant מתקבל)
    const current = await getQuotaToday();
    await supabase
      .from('youtube_quota_daily')
      .upsert({ date, units_used: current + units }, { onConflict: 'date' });
  }
}
