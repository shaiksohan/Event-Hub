/*
  EventHub booking, payment, payout, dispute, and audit tables.

  Payment status changes and payout processing should be handled
  by trusted backend functions, not directly by frontend clients.
*/

-- =====================================================
-- 1. EXTEND SERVICE BOOKINGS
-- =====================================================

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS booking_status text DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS provider_action text,
  ADD COLUMN IF NOT EXISTS customer_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_flagged boolean NOT NULL DEFAULT false;


-- =====================================================
-- 2. PAYMENT ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid NOT NULL
    REFERENCES public.service_bookings(id) ON DELETE RESTRICT,

  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,

  gateway_order_id text UNIQUE,

  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  currency text NOT NULL DEFAULT 'INR'
    CHECK (currency = 'INR'),

  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed', 'cancelled')),

  gateway_response jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_orders"
ON public.payment_orders;

CREATE POLICY "select_own_payment_orders"
ON public.payment_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct client INSERT, UPDATE, or DELETE policies.
-- Trusted backend operations should create and update payment orders.


-- =====================================================
-- 3. PAYMENT TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid NOT NULL
    REFERENCES public.service_bookings(id) ON DELETE RESTRICT,

  order_id uuid
    REFERENCES public.payment_orders(id) ON DELETE RESTRICT,

  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,

  gateway_payment_id text UNIQUE,
  gateway_signature text,

  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),

  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_transactions"
ON public.payment_transactions;

CREATE POLICY "select_own_payment_transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct client INSERT, UPDATE, or DELETE policies.


-- =====================================================
-- 4. PROVIDER PAYOUTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.provider_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid NOT NULL
    REFERENCES public.service_bookings(id) ON DELETE RESTRICT,

  provider_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,

  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  platform_fee numeric(12,2) NOT NULL DEFAULT 0
    CHECK (platform_fee >= 0 AND platform_fee <= amount),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  gateway_reference text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_provider_payouts"
ON public.provider_payouts;

CREATE POLICY "select_own_provider_payouts"
ON public.provider_payouts
FOR SELECT
TO authenticated
USING (auth.uid() = provider_id);

-- No direct client INSERT, UPDATE, or DELETE policies.


-- =====================================================
-- 5. DISPUTES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  booking_id uuid NOT NULL
    REFERENCES public.service_bookings(id) ON DELETE RESTRICT,

  raised_by uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE RESTRICT,

  reason text NOT NULL CHECK (length(trim(reason)) > 0),

  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),

  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_booking_disputes"
ON public.disputes;

CREATE POLICY "select_booking_disputes"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  raised_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.service_bookings AS b
    WHERE b.id = disputes.booking_id
      AND (
        b.provider_id = auth.uid()
        OR b.user_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "insert_own_dispute"
ON public.disputes;

CREATE POLICY "insert_own_dispute"
ON public.disputes
FOR INSERT
TO authenticated
WITH CHECK (
  raised_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.service_bookings AS b
    WHERE b.id = disputes.booking_id
      AND (
        b.user_id = auth.uid()
        OR b.provider_id = auth.uid()
      )
  )
);

-- No direct client UPDATE or DELETE policies.
-- Trusted administrative workflows should resolve disputes.


-- =====================================================
-- 6. AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users cannot read or write arbitrary audit logs
-- through these client-facing policies.
-- Trusted backend operations should write audit records.