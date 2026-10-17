/*
# Add Wallet System for Providers and Customers

## What this does
Creates a wallet for every user (both customers and providers) to track their
monetary balance, along with a transaction ledger that records every credit
and debit. Providers accumulate earnings from completed bookings (payouts);
customers may receive refunds or top-up credits. Both can view their balance
and full transaction history.

## New Tables

### wallets
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, unique — one wallet per user)
- `balance` (numeric, default 0.00 — current available balance in INR)
- `currency` (text, default 'INR')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### wallet_transactions
- `id` (uuid, PK)
- `wallet_id` (uuid, FK → wallets)
- `user_id` (uuid, FK → auth.users — denormalized for easy RLS)
- `type` (text: 'credit' | 'debit')
- `amount` (numeric, always positive)
- `source` (text: 'booking_payout' | 'refund' | 'topup' | 'withdrawal' | 'referral_bonus' | 'adjustment')
- `description` (text)
- `reference_id` (uuid, nullable)
- `reference_type` (text, nullable)
- `status` (text: 'completed' | 'pending' | 'failed')
- `created_at` (timestamptz)

## Security
- RLS enabled on both tables.
- Users can only SELECT/INSERT/UPDATE their own rows.
- SECURITY DEFINER functions for get-or-create and atomic transaction recording.

## Functions
1. `get_or_create_wallet()` — returns the calling user's wallet, creating if needed.
2. `record_wallet_transaction(p_type, p_amount, p_source, p_description, p_reference_id, p_reference_type, p_status)` — atomically inserts a transaction and adjusts balance.
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet" ON wallets;
CREATE POLICY "select_own_wallet"
  ON wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallet" ON wallets;
CREATE POLICY "insert_own_wallet"
  ON wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallet" ON wallets;
CREATE POLICY "update_own_wallet"
  ON wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  source text NOT NULL DEFAULT 'adjustment' CHECK (source IN ('booking_payout','refund','topup','withdrawal','referral_bonus','adjustment')),
  description text NOT NULL DEFAULT '',
  reference_id uuid,
  reference_type text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet_tx" ON wallet_transactions;
CREATE POLICY "select_own_wallet_tx"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallet_tx" ON wallet_transactions;
CREATE POLICY "insert_own_wallet_tx"
  ON wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallet_tx" ON wallet_transactions;
CREATE POLICY "update_own_wallet_tx"
  ON wallet_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- get_or_create_wallet: no params, uses auth.uid()
CREATE OR REPLACE FUNCTION get_or_create_wallet()
RETURNS wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w wallets%ROWTYPE;
BEGIN
  SELECT * INTO w FROM wallets WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (auth.uid())
    RETURNING * INTO w;
  END IF;
  RETURN w;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_wallet() TO authenticated;

-- record_wallet_transaction: all params after p_type have defaults
CREATE OR REPLACE FUNCTION record_wallet_transaction(
  p_type text,
  p_amount numeric,
  p_source text DEFAULT 'adjustment',
  p_description text DEFAULT '',
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_status text DEFAULT 'completed'
)
RETURNS wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w wallets%ROWTYPE;
  tx wallet_transactions%ROWTYPE;
  new_balance numeric(12,2);
BEGIN
  SELECT * INTO w FROM wallets WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (auth.uid())
    RETURNING * INTO w;
  END IF;

  IF p_type = 'credit' THEN
    new_balance := w.balance + p_amount;
  ELSIF p_type = 'debit' THEN
    new_balance := w.balance - p_amount;
    IF new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END IF;

  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount, source, description,
    reference_id, reference_type, status
  ) VALUES (
    w.id, auth.uid(), p_type, p_amount, p_source, p_description,
    p_reference_id, p_reference_type, p_status
  )
  RETURNING * INTO tx;

  UPDATE wallets
  SET balance = new_balance, updated_at = now()
  WHERE id = w.id;

  RETURN tx;
END;
$$;

GRANT EXECUTE ON FUNCTION record_wallet_transaction(text, numeric, text, text, uuid, text, text) TO authenticated;