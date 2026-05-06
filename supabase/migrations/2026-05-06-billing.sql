-- ===================================================================
-- Billing schema — Lemon Squeezy subscriptions
-- Run in Supabase SQL Editor.
-- ===================================================================

-- Per-user subscription state. ONE row per user (Free users have no row).
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id            UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ls_subscription_id TEXT NOT NULL UNIQUE,
  ls_customer_id     TEXT NOT NULL,
  ls_variant_id      TEXT NOT NULL,
  tier               TEXT NOT NULL CHECK (tier IN ('creator', 'pro')),
  status             TEXT NOT NULL CHECK (status IN ('active', 'on_trial', 'paused', 'past_due', 'cancelled', 'expired')),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see only their subscription" ON subscriptions;
CREATE POLICY "users see only their subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- INSERTs/UPDATEs come from the webhook handler using the service role key, bypassing RLS.

-- Idempotency log for webhook events (Lemon Squeezy may retry)
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  event_id   TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper for the app to read the current tier
CREATE OR REPLACE VIEW user_tier AS
SELECT
  u.id AS user_id,
  COALESCE(s.tier, 'free') AS tier,
  s.status,
  s.current_period_end,
  s.cancel_at_period_end
FROM auth.users u
LEFT JOIN subscriptions s ON s.user_id = u.id;
