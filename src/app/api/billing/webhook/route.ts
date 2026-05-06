import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Lemon Squeezy webhook handler
// Setup: in Lemon Squeezy dashboard → Settings → Webhooks → add URL:
//   https://newmarketin.netlify.app/api/billing/webhook
// Events to subscribe: subscription_created, subscription_updated, subscription_cancelled,
//                      subscription_resumed, subscription_expired, subscription_paused
// Set the signing secret in Netlify env: LS_WEBHOOK_SECRET

const TIER_BY_VARIANT: Record<string, 'creator' | 'pro'> = {
  // FILL IN after creating products in Lemon Squeezy:
  // [process.env.LS_VARIANT_ID_CREATOR ?? '']: 'creator',
  // [process.env.LS_VARIANT_ID_PRO ?? '']: 'pro',
};

// Status mapping: Lemon Squeezy → our enum
const VALID_STATUSES = new Set([
  'active',
  'on_trial',
  'paused',
  'past_due',
  'cancelled',
  'expired',
]);

export async function POST(request: Request) {
  const secret = process.env.LS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'LS_WEBHOOK_SECRET missing' }, { status: 503 });
  }

  // 1. Verify signature
  const raw = await request.text();
  const signature = request.headers.get('x-signature') ?? '';
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(signature, 'hex'))) {
    return NextResponse.json({ ok: false, error: 'bad_signature' }, { status: 401 });
  }

  // 2. Parse
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name as string | undefined;
  const eventId = payload?.meta?.webhook_id as string | undefined;
  const customData = payload?.meta?.custom_data ?? {};
  const userId = customData.user_id as string | undefined;

  if (!eventName || !eventId) {
    return NextResponse.json({ ok: false, error: 'no_event_id' }, { status: 400 });
  }
  if (!userId) {
    // Subscription created without our user_id in custom_data — log and ignore
    console.warn('[billing.webhook] missing user_id in custom_data', eventId);
    return NextResponse.json({ ok: true, ignored: 'no_user_id' });
  }

  // 3. Idempotency: have we processed this event already?
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'supabase_misconfigured' }, { status: 503 });
  }
  const supabase = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

  const { data: existing } = await supabase
    .from('billing_webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, idempotent: true });
  }
  await supabase.from('billing_webhook_events').insert({
    event_id: eventId,
    event_name: eventName,
  });

  // 4. Apply state change
  const data = payload.data?.attributes ?? {};
  const subId = String(payload.data?.id ?? '');
  const variantId = String(data.variant_id ?? '');
  const tier = TIER_BY_VARIANT[variantId];
  const status = String(data.status ?? '').toLowerCase();
  const customerId = String(data.customer_id ?? '');
  const renewsAt = data.renews_at ? new Date(data.renews_at).toISOString() : null;
  const cancelled = !!data.cancelled;

  if (!tier) {
    console.warn('[billing.webhook] unknown variant_id', variantId);
    return NextResponse.json({ ok: true, ignored: 'unknown_variant' });
  }
  if (!VALID_STATUSES.has(status)) {
    console.warn('[billing.webhook] unknown status', status);
    return NextResponse.json({ ok: true, ignored: 'unknown_status' });
  }

  const isTerminal = status === 'cancelled' || status === 'expired';
  if (isTerminal) {
    // Keep the row but mark inactive — we'll show "expired on X" in settings
    await supabase
      .from('subscriptions')
      .update({
        status,
        cancel_at_period_end: cancelled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } else {
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      ls_subscription_id: subId,
      ls_customer_id: customerId,
      ls_variant_id: variantId,
      tier,
      status,
      current_period_end: renewsAt,
      cancel_at_period_end: cancelled,
      updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
