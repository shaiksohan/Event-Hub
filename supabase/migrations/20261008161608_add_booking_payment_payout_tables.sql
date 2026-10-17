/*
# Add Complete Booking, Payment & Payout System — Part 1 (Tables + RLS)

This migration creates five new tables and extends service_bookings with
granular booking status. All payment/payout status mutations go through
SECURITY DEFINER functions (created in Part 2) to prevent frontend tampering.

## Changes to service_bookings
- booking_status text default 'pending_payment'
- event_location text
- provider_action text
- customer_confirmed boolean default false
- dispute_flagged boolean default false

## New Tables
- payment_orders: Razorpay order creation records
- payment_transactions: Verified payment results
- provider_payouts: Provider payout tracking
- disputes: Customer/provider dispute records
- audit_logs: Immutable audit trail
*/

ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS booking_status text DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS provider_action text,
  ADD COLUMN IF NOT EXISTS customer_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_flagged boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_order_id text UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  gateway_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_orders" ON payment_orders;
CREATE POLICY "select_own_payment_orders"
ON payment_orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payment_orders" ON payment_orders;
CREATE POLICY "insert_own_payment_orders"
ON payment_orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  order_id uuid REFERENCES payment_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_payment_id text UNIQUE,
  gateway_signature text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_transactions" ON payment_transactions;
CREATE POLICY "select_own_payment_transactions"
ON payment_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS provider_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  gateway_reference text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_provider_payouts" ON provider_payouts;
CREATE POLICY "select_own_provider_payouts"
ON provider_payouts FOR SELECT
TO authenticated
USING (auth.uid() = provider_id);

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES service_bookings(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booking_disputes" ON disputes;
CREATE POLICY "select_booking_disputes"
ON disputes FOR SELECT
TO authenticated
USING (
  raised_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM service_bookings
    WHERE service_bookings.id = disputes.booking_id
    AND service_bookings.provider_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_own_dispute" ON disputes;
CREATE POLICY "insert_own_dispute"
ON disputes FOR INSERT
TO authenticated
WITH CHECK (raised_by = auth.uid());

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs"
ON audit_logs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
