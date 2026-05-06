import { createClient } from '@/lib/supabase/server';

export type Tier = 'free' | 'creator' | 'pro';

export interface SubscriptionInfo {
  tier: Tier;
  status: string | null; // 'active' | 'on_trial' | 'cancelled' | etc., or null for Free
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lsSubscriptionId: string | null;
}

// Reads the user_tier view (created by the billing migration).
// Returns 'free' if no subscription exists.
export async function getUserSubscription(): Promise<SubscriptionInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      tier: 'free',
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      lsSubscriptionId: null,
    };
  }

  // Try the view first (preferred)
  const { data: viewRow } = await supabase
    .from('user_tier')
    .select('tier, status, current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (viewRow) {
    const tier = (viewRow.tier as Tier) ?? 'free';
    return {
      tier,
      status: viewRow.status as string | null,
      currentPeriodEnd: viewRow.current_period_end as string | null,
      cancelAtPeriodEnd: !!viewRow.cancel_at_period_end,
      lsSubscriptionId: null,
    };
  }

  // Fallback if the view doesn't exist yet (migration not applied)
  return {
    tier: 'free',
    status: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    lsSubscriptionId: null,
  };
}

// Active = currently entitled to paid features
export function isEntitled(sub: SubscriptionInfo): boolean {
  if (sub.tier === 'free') return false;
  return sub.status === 'active' || sub.status === 'on_trial';
}

// Tier → monthly budget in cents (Anthropic spend cap)
export function tierToBudgetCents(tier: Tier): number {
  switch (tier) {
    case 'free':
      return 50; // ~5-10 AI calls
    case 'creator':
      return 500; // ~50 AI calls
    case 'pro':
      return 5000; // effectively unlimited
  }
}
